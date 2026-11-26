import { Router } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client";
import {
  acuanBiaya,
  inspeksiDetail,
  pesanan,
  pesananUnit,
  sku,
  unit,
} from "../db/schema";
import { skuCreateSchema } from "../lib/validation";
import { requireAdmin } from "../middleware/auth";
import { badRequest, conflict, notFound } from "../lib/errors";
import {
  acuanCreateSchema,
  acuanUpdateSchema,
  skuUpdateSchema,
  unitCreateSchema,
} from "../lib/validation";

export const adminInventarisRouter = Router();
adminInventarisRouter.use(requireAdmin);

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) notFound("Data tidak ditemukan.");
  return id;
}

adminInventarisRouter.post("/sku", async (req, res) => {
  const input = skuCreateSchema.parse(req.body);
  const [existing] = await db
    .select()
    .from(sku)
    .where(eq(sku.kode, input.kode))
    .limit(1);
  if (existing) conflict("Kode SKU sudah dipakai.");
  try {
    const result = await db.insert(sku).values({
      kode: input.kode,
      nama: input.nama,
      kategori: input.kategori,
      fotoUrl: input.fotoUrl ?? null,
      hargaSewaPerHari: input.hargaSewaPerHari,
      tarifDendaHarian: input.tarifDendaHarian,
      depositNormal: input.depositNormal,
      depositBermasalah: input.depositBermasalah,
    });
    const insertId = Array.isArray(result)
      ? Number((result[0] as { insertId?: number }).insertId)
      : Number((result as { insertId?: number }).insertId);
    const [created] = await db
      .select()
      .from(sku)
      .where(eq(sku.id, insertId))
      .limit(1);
    res.status(201).json({ data: created });
  } catch (error) {
    const err = error as { errno?: number };
    if (err?.errno === 1062) conflict("Kode SKU sudah dipakai.");
    throw error;
  }
});

adminInventarisRouter.get("/sku", async (_req, res) => {
  const skuRows = await db.select().from(sku).orderBy(sku.id);
  const unitRows = await db.select().from(unit);
  const data = skuRows.map((s) => {
    const kondisiCount: Record<string, number> = {
      Baik: 0,
      "Perlu Perbaikan Ringan": 0,
      Rusak: 0,
      Hilang: 0,
    };
    let totalUnit = 0;
    for (const u of unitRows) {
      if (u.skuId !== s.id) continue;
      kondisiCount[u.kondisi] += 1;
      totalUnit += 1;
    }
    return { ...s, kondisiCount, totalUnit };
  });
  res.json({ data });
});

adminInventarisRouter.get("/sku/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const [row] = await db.select().from(sku).where(eq(sku.id, id)).limit(1);
  if (!row) notFound("SKU tidak ditemukan.");
  const units = await db
    .select()
    .from(unit)
    .where(eq(unit.skuId, id))
    .orderBy(unit.kodeUnit);
  const acuan = await db
    .select()
    .from(acuanBiaya)
    .where(eq(acuanBiaya.skuId, id));
  res.json({ data: { ...row, units, acuan } });
});

adminInventarisRouter.put("/sku/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const patch = skuUpdateSchema.parse(req.body);
  const set: Record<string, number> = {};
  if (patch.hargaSewaPerHari !== undefined)
    set.hargaSewaPerHari = patch.hargaSewaPerHari;
  if (patch.tarifDendaHarian !== undefined)
    set.tarifDendaHarian = patch.tarifDendaHarian;
  if (patch.depositNormal !== undefined) set.depositNormal = patch.depositNormal;
  if (patch.depositBermasalah !== undefined)
    set.depositBermasalah = patch.depositBermasalah;
  if (Object.keys(set).length === 0) badRequest("Tidak ada perubahan tarif.");
  const [existing] = await db.select().from(sku).where(eq(sku.id, id)).limit(1);
  if (!existing) notFound("SKU tidak ditemukan.");
  await db.update(sku).set(set).where(eq(sku.id, id));
  const [updated] = await db.select().from(sku).where(eq(sku.id, id)).limit(1);
  res.json({ data: updated });
});

adminInventarisRouter.post("/unit", async (req, res) => {
  const { skuId, kodeUnit } = unitCreateSchema.parse(req.body);
  const [s] = await db.select().from(sku).where(eq(sku.id, skuId)).limit(1);
  if (!s) notFound("SKU tidak ditemukan.");

  let kode = kodeUnit;
  if (!kode) {
    const rows = await db
      .select({ kodeUnit: unit.kodeUnit })
      .from(unit)
      .where(eq(unit.skuId, skuId));
    let max = 0;
    for (const r of rows) {
      const match = /(\d+)$/.exec(r.kodeUnit);
      if (match) max = Math.max(max, Number(match[1]));
    }
    kode = `${s.kode}-${String(max + 1).padStart(3, "0")}`;
  }

  try {
    const result = await db
      .insert(unit)
      .values({ skuId, kodeUnit: kode, kondisi: "Baik" });
    const insertId = Array.isArray(result)
      ? Number((result[0] as { insertId?: number }).insertId)
      : Number((result as { insertId?: number }).insertId);
    const [created] = await db
      .select()
      .from(unit)
      .where(eq(unit.id, insertId))
      .limit(1);
    res.status(201).json({ data: created });
  } catch (error) {
    const err = error as { errno?: number };
    if (err?.errno === 1062) conflict("Kode unit sudah dipakai.");
    throw error;
  }
});

adminInventarisRouter.patch("/unit/:id/kondisi", async (req, res) => {
  const id = parseId(req.params.id);
  if (req.body?.kondisi && req.body.kondisi !== "Baik") {
    badRequest("Pemulihan hanya untuk menandai unit Baik.");
  }
  const [row] = await db.select().from(unit).where(eq(unit.id, id)).limit(1);
  if (!row) notFound("Unit tidak ditemukan.");
  if (row.kondisi === "Hilang") {
    conflict("Unit berstatus Hilang tidak dapat ditandai Baik.");
  }
  const active = await db
    .select({ id: pesananUnit.id })
    .from(pesananUnit)
    .innerJoin(pesanan, eq(pesanan.id, pesananUnit.pesananId))
    .where(
      and(
        eq(pesananUnit.unitId, id),
        eq(pesanan.status, "Sedang Disewa"),
        isNull(pesanan.dikembalikanAt),
      ),
    )
    .limit(1);
  if (active.length > 0) {
    conflict("Unit masih tercatat pada pesanan Sedang Disewa.");
  }
  await db
    .update(unit)
    .set({ kondisi: "Baik", catatan: null, kondisiDiubahAt: new Date() })
    .where(eq(unit.id, id));
  const [updated] = await db.select().from(unit).where(eq(unit.id, id)).limit(1);
  res.json({ data: updated });
});

adminInventarisRouter.delete("/unit/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const [row] = await db.select().from(unit).where(eq(unit.id, id)).limit(1);
  if (!row) notFound("Unit tidak ditemukan.");
  const used = await db
    .select({ id: pesananUnit.id })
    .from(pesananUnit)
    .where(eq(pesananUnit.unitId, id))
    .limit(1);
  if (used.length > 0) {
    conflict("Unit pernah dipakai pada pesanan sehingga tidak dapat dihapus.");
  }
  await db.delete(unit).where(eq(unit.id, id));
  res.json({ ok: true });
});

adminInventarisRouter.get("/acuan-biaya", async (req, res) => {
  const skuParam = typeof req.query.sku === "string" ? Number(req.query.sku) : null;
  const rows =
    skuParam && Number.isInteger(skuParam)
      ? await db
          .select()
          .from(acuanBiaya)
          .where(eq(acuanBiaya.skuId, skuParam))
      : await db.select().from(acuanBiaya);
  res.json({ data: rows });
});

adminInventarisRouter.post("/acuan-biaya", async (req, res) => {
  const input = acuanCreateSchema.parse(req.body);
  const [s] = await db
    .select()
    .from(sku)
    .where(eq(sku.id, input.skuId))
    .limit(1);
  if (!s) notFound("SKU tidak ditemukan.");
  const result = await db.insert(acuanBiaya).values(input);
  const insertId = Array.isArray(result)
    ? Number((result[0] as { insertId?: number }).insertId)
    : Number((result as { insertId?: number }).insertId);
  const [created] = await db
    .select()
    .from(acuanBiaya)
    .where(eq(acuanBiaya.id, insertId))
    .limit(1);
  res.status(201).json({ data: created });
});

adminInventarisRouter.put("/acuan-biaya/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const patch = acuanUpdateSchema.parse(req.body);
  const set: Record<string, string | number> = {};
  if (patch.kategori !== undefined) set.kategori = patch.kategori;
  if (patch.namaKerusakan !== undefined) set.namaKerusakan = patch.namaKerusakan;
  if (patch.biaya !== undefined) set.biaya = patch.biaya;
  if (Object.keys(set).length === 0) badRequest("Tidak ada perubahan.");
  const [existing] = await db
    .select()
    .from(acuanBiaya)
    .where(eq(acuanBiaya.id, id))
    .limit(1);
  if (!existing) notFound("Acuan biaya tidak ditemukan.");
  await db.update(acuanBiaya).set(set).where(eq(acuanBiaya.id, id));
  const [updated] = await db
    .select()
    .from(acuanBiaya)
    .where(eq(acuanBiaya.id, id))
    .limit(1);
  res.json({ data: updated });
});

adminInventarisRouter.delete("/acuan-biaya/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const [existing] = await db
    .select()
    .from(acuanBiaya)
    .where(eq(acuanBiaya.id, id))
    .limit(1);
  if (!existing) notFound("Acuan biaya tidak ditemukan.");
  const used = await db
    .select({ id: inspeksiDetail.id })
    .from(inspeksiDetail)
    .where(eq(inspeksiDetail.acuanBiayaId, id))
    .limit(1);
  if (used.length > 0) {
    conflict("Acuan biaya sudah dipakai pada inspeksi dan tidak dapat dihapus.");
  }
  await db.delete(acuanBiaya).where(eq(acuanBiaya.id, id));
  res.json({ ok: true });
});
