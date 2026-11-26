import { desc, eq, inArray } from "drizzle-orm";
import { type Db, type Executor } from "../db/client";
import {
  acuanBiaya,
  inspeksi,
  inspeksiDetail,
  pembayaran,
  pesanan,
  pesananItem,
  pesananUnit,
  penyewa,
  sku,
  unit,
  type PesananRow,
} from "../db/schema";
import { availableUnitsForSkus } from "./availability";
import { isTelat, maskPhone, serializeDateTime } from "./rules";

function q(exec: Executor): Db {
  return exec as unknown as Db;
}

export interface OrderItemView {
  skuId: number;
  kode: string;
  nama: string;
  kategori: string;
  qty: number;
  hargaSewaPerHari: number;
  tarifDendaHarian: number;
  subtotal: number;
}

export function hitungTagihanView(row: PesananRow) {
  const sisaSewa = Math.max(0, row.totalSewa - row.dp);
  const tagihanAkhir = sisaSewa + row.totalDenda + row.totalKerusakan;
  return {
    totalSewa: row.totalSewa,
    dp: row.dp,
    sisaSewa,
    denda: row.totalDenda,
    kerusakan: row.totalKerusakan,
    deposit: row.deposit,
    selisihAkhir: tagihanAkhir - row.deposit,
  };
}

async function buildItems(
  exec: Executor,
  order: PesananRow,
): Promise<OrderItemView[]> {
  const rows = await q(exec)
    .select({
      skuId: pesananItem.skuId,
      qty: pesananItem.qty,
      kode: sku.kode,
      nama: sku.nama,
      kategori: sku.kategori,
      hargaSewaPerHari: sku.hargaSewaPerHari,
      tarifDendaHarian: sku.tarifDendaHarian,
    })
    .from(pesananItem)
    .innerJoin(sku, eq(sku.id, pesananItem.skuId))
    .where(eq(pesananItem.pesananId, order.id));

  return rows.map((r) => ({
    skuId: r.skuId,
    kode: r.kode,
    nama: r.nama,
    kategori: r.kategori,
    qty: r.qty,
    hargaSewaPerHari: r.hargaSewaPerHari,
    tarifDendaHarian: r.tarifDendaHarian,
    subtotal: r.hargaSewaPerHari * r.qty * order.hariSewa,
  }));
}

async function buildPesananUnits(exec: Executor, pesananId: number) {
  return q(exec)
    .select({
      puId: pesananUnit.id,
      unitId: unit.id,
      skuId: unit.skuId,
      kodeUnit: unit.kodeUnit,
      kondisi: unit.kondisi,
    })
    .from(pesananUnit)
    .innerJoin(unit, eq(unit.id, pesananUnit.unitId))
    .where(eq(pesananUnit.pesananId, pesananId));
}

async function buildInspeksi(exec: Executor, pesananId: number) {
  const puRows = await buildPesananUnits(exec, pesananId);
  const byPu = new Map(puRows.map((r) => [r.puId, r]));
  if (puRows.length === 0) return [];
  const puIds = puRows.map((r) => r.puId);
  const rows = await q(exec)
    .select()
    .from(inspeksi)
    .where(inArray(inspeksi.pesananUnitId, puIds));
  if (rows.length === 0) return [];
  const inspeksiIds = rows.map((r) => r.id);
  const details = await q(exec)
    .select({
      inspeksiId: inspeksiDetail.inspeksiId,
      acuanBiayaId: inspeksiDetail.acuanBiayaId,
      biaya: inspeksiDetail.biaya,
      namaKerusakan: acuanBiaya.namaKerusakan,
    })
    .from(inspeksiDetail)
    .innerJoin(acuanBiaya, eq(acuanBiaya.id, inspeksiDetail.acuanBiayaId))
    .where(inArray(inspeksiDetail.inspeksiId, inspeksiIds));

  return rows.map((row) => {
    const pu = byPu.get(row.pesananUnitId);
    return {
      pesananUnitId: row.pesananUnitId,
      unitId: pu?.unitId ?? null,
      kodeUnit: pu?.kodeUnit ?? null,
      kondisi: row.kondisi,
      catatan: row.catatan ?? "",
      biayaKerusakan: row.biayaKerusakan,
      inspectedAt: serializeDateTime(row.inspectedAt),
      poin: details
        .filter((d) => d.inspeksiId === row.id)
        .map((d) => ({
          acuanBiayaId: d.acuanBiayaId,
          namaKerusakan: d.namaKerusakan,
          biaya: d.biaya,
        })),
    };
  });
}

async function buildPembayaran(exec: Executor, pesananId: number) {
  const rows = await q(exec)
    .select()
    .from(pembayaran)
    .where(eq(pembayaran.pesananId, pesananId));
  return rows.map((r) => ({
    id: r.id,
    jenis: r.jenis,
    jumlah: r.jumlah,
    status: r.status,
    midtransOrderId: r.midtransOrderId,
    paidAt: serializeDateTime(r.paidAt),
  }));
}

async function buildPenyewa(exec: Executor, id: number, admin: boolean) {
  const [row] = await q(exec)
    .select()
    .from(penyewa)
    .where(eq(penyewa.id, id))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    nama: row.nama,
    nomorHp: admin ? row.nomorHp : maskPhone(row.nomorHp),
    nomorHpMasked: maskPhone(row.nomorHp),
    status: row.status,
    jumlahTelat: row.jumlahTelat,
    jumlahRusak: row.jumlahRusak,
  };
}

export async function orderDetailByRow(
  exec: Executor,
  row: PesananRow,
  options: { admin: boolean },
) {
  const items = await buildItems(exec, row);
  const p = await buildPenyewa(exec, row.penyewaId, options.admin);
  const unitRows = await buildPesananUnits(exec, row.id);
  const inspeksiRows = await buildInspeksi(exec, row.id);
  const pembayaranRows = await buildPembayaran(exec, row.id);
  const tagihan = hitungTagihanView(row);

  let availableUnits: Array<{ id: number; skuId: number; kodeUnit: string }> = [];
  let acuan: Array<{
    id: number;
    skuId: number;
    kategori: string;
    namaKerusakan: string;
    biaya: number;
  }> = [];
  if (options.admin) {
    const skuIds = [...new Set(items.map((i) => i.skuId))];
    if (skuIds.length > 0) {
      acuan = await q(exec)
        .select()
        .from(acuanBiaya)
        .where(inArray(acuanBiaya.skuId, skuIds));
    }
    if (row.status === "Terkonfirmasi") {
      availableUnits = await availableUnitsForSkus(exec, skuIds);
    }
  }

  return {
    id: row.id,
    kode: row.kode,
    status: row.status,
    statusPenyewaSaatPesan: row.statusPenyewaSaatPesan,
    tanggalAmbil: row.tanggalAmbil,
    tanggalKembali: row.tanggalKembali,
    hariSewa: row.hariSewa,
    totalSewa: row.totalSewa,
    dp: row.dp,
    deposit: row.deposit,
    hariDenda: row.hariDenda,
    totalDenda: row.totalDenda,
    totalKerusakan: row.totalKerusakan,
    selisihAkhir: row.selisihAkhir,
    pickedUpAt: serializeDateTime(row.pickedUpAt),
    dikembalikanAt: serializeDateTime(row.dikembalikanAt),
    createdAt: serializeDateTime(row.createdAt),
    telat: isTelat(row.status, row.tanggalKembali, row.dikembalikanAt),
    penyewa: p,
    items,
    units: unitRows.map((u) => ({
      id: u.unitId,
      skuId: u.skuId,
      kodeUnit: u.kodeUnit,
      kondisi: u.kondisi,
    })),
    inspeksi: inspeksiRows,
    pembayaran: pembayaranRows,
    availableUnits,
    acuan,
    tagihan,
  };
}

export async function getOrderDetailByKode(
  exec: Executor,
  kode: string,
  options: { admin: boolean },
) {
  const [row] = await q(exec)
    .select()
    .from(pesanan)
    .where(eq(pesanan.kode, kode))
    .limit(1);
  if (!row) return null;
  return orderDetailByRow(exec, row, options);
}

export async function getOrderDetailById(
  exec: Executor,
  id: number,
  options: { admin: boolean },
) {
  const [row] = await q(exec)
    .select()
    .from(pesanan)
    .where(eq(pesanan.id, id))
    .limit(1);
  if (!row) return null;
  return orderDetailByRow(exec, row, options);
}

export async function listOrders(exec: Executor) {
  const qq = q(exec);
  const [orderRows, itemRows, penyewaRows] = await Promise.all([
    qq.select().from(pesanan).orderBy(desc(pesanan.createdAt)),
    qq.select().from(pesananItem),
    qq.select().from(penyewa),
  ]);
  const penyewaMap = new Map(penyewaRows.map((p) => [p.id, p]));
  const qtyMap = new Map<number, number>();
  for (const item of itemRows) {
    qtyMap.set(item.pesananId, (qtyMap.get(item.pesananId) ?? 0) + item.qty);
  }
  return orderRows.map((row) => ({
    id: row.id,
    kode: row.kode,
    status: row.status,
    tanggalAmbil: row.tanggalAmbil,
    tanggalKembali: row.tanggalKembali,
    penyewaNama: penyewaMap.get(row.penyewaId)?.nama ?? "-",
    jumlahUnit: qtyMap.get(row.id) ?? 0,
    telat: isTelat(row.status, row.tanggalKembali, row.dikembalikanAt),
    createdAt: serializeDateTime(row.createdAt),
  }));
}
