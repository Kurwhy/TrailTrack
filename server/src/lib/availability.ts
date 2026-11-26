import { and, count, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db, type Db, type Executor } from "../db/client";
import { pesanan, pesananItem, pesananUnit, unit } from "../db/schema";
import { addDays, aturan, parseIsoDate, toIsoDate } from "./rules";

const LOCK_STATUSES = [
  "Menunggu Persetujuan",
  "Menunggu Pembayaran",
  "Terkonfirmasi",
  "Sedang Disewa",
] as const;

export interface AvailabilityDay {
  date: string;
  terpakai: number;
  buffer: number;
  sisa: number;
}

interface ActiveOrder {
  id: number;
  tanggalAmbil: string;
  tanggalKembali: string;
  qty: number;
}

function q(exec: Executor): Db {
  return exec as unknown as Db;
}

export async function goodUnitCount(
  exec: Executor,
  skuId: number,
): Promise<number> {
  const rows = await q(exec)
    .select({ total: count() })
    .from(unit)
    .where(and(eq(unit.skuId, skuId), eq(unit.kondisi, "Baik")));
  return Number(rows[0]?.total ?? 0);
}

async function activeOrdersForSku(
  exec: Executor,
  skuId: number,
  fromIso: string,
  toIso: string,
): Promise<ActiveOrder[]> {
  const fromMinusBuffer = toIsoDate(
    addDays(parseIsoDate(fromIso), -aturan.bufferHari),
  );
  const rows = await q(exec)
    .select({
      id: pesanan.id,
      tanggalAmbil: pesanan.tanggalAmbil,
      tanggalKembali: pesanan.tanggalKembali,
      qty: pesananItem.qty,
    })
    .from(pesanan)
    .innerJoin(pesananItem, eq(pesananItem.pesananId, pesanan.id))
    .where(
      and(
        inArray(pesanan.status, [...LOCK_STATUSES]),
        eq(pesananItem.skuId, skuId),
        lte(pesanan.tanggalAmbil, toIso),
        gte(pesanan.tanggalKembali, fromMinusBuffer),
      ),
    );

  const map = new Map<number, ActiveOrder>();
  for (const row of rows) {
    const existing = map.get(row.id);
    if (existing) existing.qty += row.qty;
    else
      map.set(row.id, {
        id: row.id,
        tanggalAmbil: row.tanggalAmbil,
        tanggalKembali: row.tanggalKembali,
        qty: row.qty,
      });
  }
  return [...map.values()];
}

function computeDays(
  good: number,
  orders: ActiveOrder[],
  fromIso: string,
  toIso: string,
): AvailabilityDay[] {
  const days: AvailabilityDay[] = [];
  let cursor = parseIsoDate(fromIso);
  const end = parseIsoDate(toIso);
  while (cursor.getTime() <= end.getTime()) {
    const iso = toIsoDate(cursor);
    let terpakai = 0;
    let buffer = 0;
    for (const order of orders) {
      if (iso >= order.tanggalAmbil && iso <= order.tanggalKembali) {
        terpakai += order.qty;
      } else if (iso > order.tanggalKembali) {
        const bufferEnd = toIsoDate(
          addDays(parseIsoDate(order.tanggalKembali), aturan.bufferHari),
        );
        if (iso <= bufferEnd) buffer += order.qty;
      }
    }
    days.push({
      date: iso,
      terpakai,
      buffer,
      sisa: Math.max(0, good - terpakai - buffer),
    });
    cursor = addDays(cursor, 1);
  }
  return days;
}

async function buildDays(
  exec: Executor,
  skuId: number,
  fromIso: string,
  toIso: string,
): Promise<AvailabilityDay[]> {
  const good = await goodUnitCount(exec, skuId);
  const orders = await activeOrdersForSku(exec, skuId, fromIso, toIso);
  return computeDays(good, orders, fromIso, toIso);
}

export async function availabilityForRange(
  exec: Executor,
  skuId: number,
  ambil: string,
  kembali: string,
): Promise<AvailabilityDay[]> {
  return buildDays(exec, skuId, ambil, kembali);
}

export async function availabilityForMonth(
  exec: Executor,
  skuId: number,
  year: number,
  monthIndex: number,
): Promise<AvailabilityDay[]> {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  return buildDays(exec, skuId, toIsoDate(first), toIsoDate(last));
}

export async function minSisaForRange(
  exec: Executor,
  skuId: number,
  ambil: string,
  kembali: string,
): Promise<number> {
  const days = await availabilityForRange(exec, skuId, ambil, kembali);
  if (days.length === 0) return 0;
  return Math.min(...days.map((d) => d.sisa));
}

export async function conflictDates(
  exec: Executor,
  skuId: number,
  ambil: string,
  kembali: string,
  qty: number,
): Promise<Array<{ date: string; sisa: number }>> {
  const days = await availabilityForRange(exec, skuId, ambil, kembali);
  return days
    .filter((d) => d.sisa < qty)
    .map((d) => ({ date: d.date, sisa: d.sisa }));
}

export async function busyUnitIds(exec: Executor): Promise<Set<number>> {
  const rows = await q(exec)
    .select({ unitId: pesananUnit.unitId })
    .from(pesananUnit)
    .innerJoin(pesanan, eq(pesanan.id, pesananUnit.pesananId))
    .where(
      and(eq(pesanan.status, "Sedang Disewa"), isNull(pesanan.dikembalikanAt)),
    );
  return new Set(rows.map((r) => r.unitId));
}

export async function availableUnitsForSkus(
  exec: Executor,
  skuIds: number[],
): Promise<Array<{ id: number; skuId: number; kodeUnit: string }>> {
  if (skuIds.length === 0) return [];
  const busy = await busyUnitIds(exec);
  const rows = await q(exec)
    .select({ id: unit.id, skuId: unit.skuId, kodeUnit: unit.kodeUnit })
    .from(unit)
    .where(and(inArray(unit.skuId, skuIds), eq(unit.kondisi, "Baik")));
  return rows.filter((r) => !busy.has(r.id));
}
