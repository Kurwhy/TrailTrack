import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { pesanan, penyewa, sku } from "../db/schema";
import {
  availabilityForMonth,
  availabilityForRange,
  goodUnitCount,
  minSisaForRange,
} from "../lib/availability";
import { badRequest, notFound } from "../lib/errors";
import { createOrder } from "../lib/orderService";
import {
  isTelat,
  isValidPhone,
  maskPhone,
  normalizePhone,
} from "../lib/rules";
import { getOrderDetailByKode } from "../lib/serializers";
import { requestSnapPayment, syncOrderPayments } from "../lib/paymentService";
import { createOrderSchema, paySchema } from "../lib/validation";
import { pesananLimiter, riwayatLimiter } from "../middleware/rateLimit";

export const publicRouter = Router();

async function resolveSku(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || raw.length === 0) return null;
  const asNumber = Number(raw);
  if (Number.isInteger(asNumber) && asNumber > 0) {
    const [row] = await db
      .select()
      .from(sku)
      .where(eq(sku.id, asNumber))
      .limit(1);
    return row ?? null;
  }
  const [row] = await db.select().from(sku).where(eq(sku.kode, raw)).limit(1);
  return row ?? null;
}

publicRouter.get("/katalog", async (_req, res) => {
  const rows = await db.select().from(sku).orderBy(sku.id);
  const hasil = await Promise.all(
    rows.map(async (s) => ({
      id: s.id,
      kode: s.kode,
      nama: s.nama,
      kategori: s.kategori,
      fotoUrl: s.fotoUrl,
      hargaSewaPerHari: s.hargaSewaPerHari,
      tarifDendaHarian: s.tarifDendaHarian,
      depositNormal: s.depositNormal,
      depositBermasalah: s.depositBermasalah,
      unitBaik: await goodUnitCount(db, s.id),
    })),
  );
  res.json({ data: hasil });
});

publicRouter.get("/ketersediaan", async (req, res) => {
  const target = await resolveSku(req.query.sku);
  if (!target) badRequest("SKU tidak ditemukan.");

  const bulan = typeof req.query.bulan === "string" ? req.query.bulan : null;
  if (bulan) {
    const match = /^(\d{4})-(\d{2})$/.exec(bulan);
    if (!match) badRequest("Format bulan harus YYYY-MM.");
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) badRequest("Bulan tidak valid.");
    const hari = await availabilityForMonth(db, target.id, year, monthIndex);
    res.json({
      sku: { id: target.id, kode: target.kode, nama: target.nama },
      bulan,
      hari,
    });
    return;
  }

  const ambil = typeof req.query.ambil === "string" ? req.query.ambil : null;
  const kembali = typeof req.query.kembali === "string" ? req.query.kembali : null;
  if (ambil && kembali) {
    if (kembali < ambil) badRequest("Tanggal kembali sebelum tanggal ambil.");
    const hari = await availabilityForRange(db, target.id, ambil, kembali);
    const minSisa = await minSisaForRange(db, target.id, ambil, kembali);
    res.json({
      sku: { id: target.id, kode: target.kode, nama: target.nama },
      ambil,
      kembali,
      hari,
      minSisa,
    });
    return;
  }

  badRequest("Sertakan parameter bulan atau rentang ambil dan kembali.");
});

publicRouter.post("/pesanan", pesananLimiter, async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const hasil = await createOrder({ ...input, viaAdmin: false });
  res.status(201).json(hasil);
});

publicRouter.get("/pesanan/:kode", async (req, res) => {
  const detail = await getOrderDetailByKode(db, req.params.kode, {
    admin: false,
  });
  if (!detail) notFound("Pesanan tidak ditemukan.");
  res.json({ data: detail });
});

publicRouter.post("/pesanan/:kode/bayar", pesananLimiter, async (req, res) => {
  const { jenis } = paySchema.parse(req.body);
  const data = await requestSnapPayment(String(req.params.kode), jenis);
  res.json({ data });
});

publicRouter.post(
  "/pesanan/:kode/sinkron-pembayaran",
  pesananLimiter,
  async (req, res) => {
    const data = await syncOrderPayments(String(req.params.kode));
    res.json({ data });
  },
);

publicRouter.get("/riwayat", riwayatLimiter, async (req, res) => {
  const raw = typeof req.query.nomor_hp === "string" ? req.query.nomor_hp : "";
  if (!isValidPhone(raw)) badRequest("Nomor HP tidak valid.");
  const phone = normalizePhone(raw);
  const [pelanggan] = await db
    .select()
    .from(penyewa)
    .where(eq(penyewa.nomorHp, phone))
    .limit(1);

  if (!pelanggan) {
    res.json({ penyewa: null, pesanan: [] });
    return;
  }

  const orders = await db
    .select()
    .from(pesanan)
    .where(eq(pesanan.penyewaId, pelanggan.id))
    .orderBy(desc(pesanan.createdAt));

  res.json({
    penyewa: {
      nama: pelanggan.nama,
      nomorHp: maskPhone(pelanggan.nomorHp),
      status: pelanggan.status,
      jumlahTelat: pelanggan.jumlahTelat,
      jumlahRusak: pelanggan.jumlahRusak,
    },
    pesanan: orders.map((o) => ({
      id: o.id,
      kode: o.kode,
      tanggalAmbil: o.tanggalAmbil,
      tanggalKembali: o.tanggalKembali,
      status: o.status,
      totalDenda: o.totalDenda,
      totalKerusakan: o.totalKerusakan,
      telat: isTelat(o.status, o.tanggalKembali, o.dikembalikanAt),
    })),
  });
});
