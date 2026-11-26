import { count, eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db, pool } from "./client";
import { env } from "../env";
import {
  acuanBiaya,
  adminUsers,
  inspeksi,
  inspeksiDetail,
  pembayaran,
  pesanan,
  pesananItem,
  pesananUnit,
  penyewa,
  sku,
  unit,
  STATUS_PEMBAYARAN,
  STATUS_PENYEWA,
  STATUS_PESANAN,
  JENIS_PEMBAYARAN,
} from "./schema";
import { dpFor } from "../lib/rules";

type StatusPesanan = (typeof STATUS_PESANAN)[number];
type StatusPenyewa = (typeof STATUS_PENYEWA)[number];
type JenisPembayaran = (typeof JENIS_PEMBAYARAN)[number];
type StatusPembayaran = (typeof STATUS_PEMBAYARAN)[number];

function insertId(result: unknown): number {
  if (Array.isArray(result)) {
    return Number((result[0] as { insertId?: number })?.insertId ?? 0);
  }
  return Number((result as { insertId?: number })?.insertId ?? 0);
}

const SKU_DATA = [
  // Lima SKU lama dipertahankan agar pesanan contoh tetap konsisten.
  { kode: "TDM-4P", nama: "Tenda Dome 4 Orang", kategori: "Tenda Dome", hargaSewaPerHari: 75000, tarifDendaHarian: 50000, depositNormal: 300000, depositBermasalah: 600000 },
  { kode: "CRV-60", nama: "Carrier 60 Liter", kategori: "Carrier", hargaSewaPerHari: 45000, tarifDendaHarian: 30000, depositNormal: 200000, depositBermasalah: 400000 },
  { kode: "SLB-AB", nama: "Sleeping Bag Suhu Ekstrem", kategori: "Sleeping Bag", hargaSewaPerHari: 35000, tarifDendaHarian: 25000, depositNormal: 150000, depositBermasalah: 300000 },
  { kode: "STV-PK", nama: "Kompor Portable Gas", kategori: "Stove", hargaSewaPerHari: 25000, tarifDendaHarian: 15000, depositNormal: 100000, depositBermasalah: 200000 },
  { kode: "TRK-PL", nama: "Trekking Pole Aluminium (sepasang)", kategori: "Trekking Pole", hargaSewaPerHari: 20000, tarifDendaHarian: 10000, depositNormal: 75000, depositBermasalah: 150000 },
  // Tenda
  { kode: "TDM-2P", nama: "Tenda Dome 2 Orang", kategori: "Tenda Dome", hargaSewaPerHari: 60000, tarifDendaHarian: 40000, depositNormal: 250000, depositBermasalah: 500000 },
  { kode: "TDM-6P", nama: "Tenda Dome 6 Orang", kategori: "Tenda Dome", hargaSewaPerHari: 95000, tarifDendaHarian: 60000, depositNormal: 400000, depositBermasalah: 800000 },
  // Carrier
  { kode: "CRV-40", nama: "Carrier 40 Liter", kategori: "Carrier", hargaSewaPerHari: 35000, tarifDendaHarian: 25000, depositNormal: 150000, depositBermasalah: 300000 },
  { kode: "CRV-80", nama: "Carrier 80 Liter", kategori: "Carrier", hargaSewaPerHari: 55000, tarifDendaHarian: 35000, depositNormal: 250000, depositBermasalah: 500000 },
  // Sleeping bag
  { kode: "SLB-ST", nama: "Sleeping Bag Standar", kategori: "Sleeping Bag", hargaSewaPerHari: 25000, tarifDendaHarian: 18000, depositNormal: 100000, depositBermasalah: 200000 },
  // Kompor dan trekking pole
  { kode: "STV-2B", nama: "Kompor Camping Dua Tungku", kategori: "Stove", hargaSewaPerHari: 30000, tarifDendaHarian: 18000, depositNormal: 150000, depositBermasalah: 300000 },
  { kode: "TRK-CB", nama: "Trekking Pole Carbon (sepasang)", kategori: "Trekking Pole", hargaSewaPerHari: 30000, tarifDendaHarian: 15000, depositNormal: 100000, depositBermasalah: 200000 },
  // Kursi dan meja
  { kode: "KRS-LP", nama: "Kursi Lipat Gunung", kategori: "Kursi & Meja", hargaSewaPerHari: 15000, tarifDendaHarian: 10000, depositNormal: 75000, depositBermasalah: 150000 },
  { kode: "MJA-LP", nama: "Meja Lipat Gunung", kategori: "Kursi & Meja", hargaSewaPerHari: 18000, tarifDendaHarian: 12000, depositNormal: 100000, depositBermasalah: 200000 },
  // Hydropack
  { kode: "HDP-2L", nama: "Hydropack 2 Liter", kategori: "Hydropack", hargaSewaPerHari: 15000, tarifDendaHarian: 10000, depositNormal: 75000, depositBermasalah: 150000 },
  { kode: "HDP-3L", nama: "Hydropack 3 Liter", kategori: "Hydropack", hargaSewaPerHari: 18000, tarifDendaHarian: 12000, depositNormal: 100000, depositBermasalah: 200000 },
  // Senter dan lampu
  { kode: "SNT-LD", nama: "Senter LED Kepala", kategori: "Senter", hargaSewaPerHari: 12000, tarifDendaHarian: 8000, depositNormal: 50000, depositBermasalah: 100000 },
  { kode: "LMP-TD", nama: "Lampu Tenda", kategori: "Lampu", hargaSewaPerHari: 10000, tarifDendaHarian: 7000, depositNormal: 50000, depositBermasalah: 100000 },
  // Pakaian dan alas kaki
  { kode: "SPU-HK", nama: "Sepatu Hiking", kategori: "Sepatu", hargaSewaPerHari: 30000, tarifDendaHarian: 20000, depositNormal: 150000, depositBermasalah: 300000 },
  { kode: "JKT-GN", nama: "Jaket Gunung", kategori: "Jaket", hargaSewaPerHari: 25000, tarifDendaHarian: 15000, depositNormal: 150000, depositBermasalah: 300000 },
  { kode: "SRG-TG", nama: "Sarung Tangan Gunung", kategori: "Sarung Tangan", hargaSewaPerHari: 8000, tarifDendaHarian: 5000, depositNormal: 30000, depositBermasalah: 60000 },
  // Gas, matras, hammock
  { kode: "GAS-PT", nama: "Gas Portable 230 gram", kategori: "Gas Portable", hargaSewaPerHari: 15000, tarifDendaHarian: 10000, depositNormal: 50000, depositBermasalah: 100000 },
  { kode: "MTR-SP", nama: "Matras Spons", kategori: "Matras", hargaSewaPerHari: 15000, tarifDendaHarian: 10000, depositNormal: 75000, depositBermasalah: 150000 },
  { kode: "HMK-PK", nama: "Hammock Camping", kategori: "Hammock", hargaSewaPerHari: 20000, tarifDendaHarian: 12000, depositNormal: 100000, depositBermasalah: 200000 },
] as const;

const FOTO_BY_KODE: Record<string, string | null> = {
  "TDM-4P": "/images/gear/tent-4p.jpg",
  "TDM-2P": "/images/gear/tent-2p.jpg",
  "TDM-6P": "/images/gear/tent-6p.jpg",
  "CRV-40": "/images/gear/carrier-40.jpg",
  "CRV-60": "/images/gear/carrier-60.jpg",
  "CRV-80": "/images/gear/carrier-80.jpg",
  "SLB-AB": "/images/gear/sleeping-bag-extreme.jpg",
  "SLB-ST": "/images/gear/sleeping-bag-standard.jpg",
  "STV-PK": "/images/gear/stove-gas.jpg",
  "STV-2B": "/images/gear/stove-gas.jpg",
  "TRK-PL": "/images/gear/trekking-aluminium.jpg",
  "TRK-CB": "/images/gear/trekking-carbon.jpg",
  "KRS-LP": "/images/gear/chair.jpg",
  "MJA-LP": "/images/gear/table.jpg",
  "HDP-2L": "/images/gear/hydration-2l.jpg",
  "HDP-3L": "/images/gear/hydration-3l.jpg",
  "SNT-LD": "/images/gear/headlamp.jpg",
  "LMP-TD": "/images/gear/lantern.jpg",
  "SPU-HK": "/images/gear/shoes.jpg",
  "JKT-GN": "/images/gear/jacket.jpg",
  "SRG-TG": "/images/gear/gloves.jpg",
  "GAS-PT": "/images/gear/stove-gas.jpg",
  "MTR-SP": "/images/gear/mat.jpg",
  "HMK-PK": "/images/gear/hammock.jpg",
};

const UNIT_PLAN: Array<{
  kode: string;
  jumlah: number;
  khusus?: Record<number, "Perlu Perbaikan Ringan" | "Rusak" | "Hilang">;
}> = [
  { kode: "TDM-4P", jumlah: 12 },
  { kode: "CRV-60", jumlah: 6, khusus: { 5: "Perlu Perbaikan Ringan" } },
  { kode: "SLB-AB", jumlah: 8, khusus: { 8: "Rusak" } },
  { kode: "STV-PK", jumlah: 6 },
  { kode: "TRK-PL", jumlah: 10, khusus: { 10: "Hilang" } },
  { kode: "TDM-2P", jumlah: 8, khusus: { 8: "Perlu Perbaikan Ringan" } },
  { kode: "TDM-6P", jumlah: 6 },
  { kode: "CRV-40", jumlah: 8 },
  { kode: "CRV-80", jumlah: 4 },
  { kode: "SLB-ST", jumlah: 10 },
  { kode: "STV-2B", jumlah: 4 },
  { kode: "TRK-CB", jumlah: 6 },
  { kode: "KRS-LP", jumlah: 12 },
  { kode: "MJA-LP", jumlah: 6 },
  { kode: "HDP-2L", jumlah: 8 },
  { kode: "HDP-3L", jumlah: 6 },
  { kode: "SNT-LD", jumlah: 10 },
  { kode: "LMP-TD", jumlah: 8, khusus: { 8: "Rusak" } },
  { kode: "SPU-HK", jumlah: 8, khusus: { 8: "Perlu Perbaikan Ringan" } },
  { kode: "JKT-GN", jumlah: 10 },
  { kode: "SRG-TG", jumlah: 12 },
  { kode: "GAS-PT", jumlah: 8 },
  { kode: "MTR-SP", jumlah: 10 },
  { kode: "HMK-PK", jumlah: 6 },
];

const ACUAN_DATA = [
  { kategori: "Perlu Perbaikan Ringan", namaKerusakan: "Zipper macet", biaya: 40000 },
  { kategori: "Perlu Perbaikan Ringan", namaKerusakan: "Jahitan kendur", biaya: 60000 },
  { kategori: "Rusak", namaKerusakan: "Flysheet sobek", biaya: 150000 },
  { kategori: "Rusak", namaKerusakan: "Frame bengkok", biaya: 175000 },
  { kategori: "Hilang", namaKerusakan: "Penggantian unit tenda", biaya: 600000 },
] as const;

const PENYEWA_DATA: Array<{
  nama: string;
  nomorHp: string;
  status: StatusPenyewa;
  jumlahTelat: number;
  jumlahRusak: number;
}> = [
  { nama: "Rizky Pratama", nomorHp: "081234567810", status: "Normal", jumlahTelat: 0, jumlahRusak: 0 },
  { nama: "Dewi Lestari", nomorHp: "085722104432", status: "Bermasalah", jumlahTelat: 2, jumlahRusak: 0 },
  { nama: "Bagas Wicaksono", nomorHp: "087811906625", status: "Normal", jumlahTelat: 1, jumlahRusak: 1 },
  { nama: "Rombongan Pendaki", nomorHp: "081298765432", status: "Normal", jumlahTelat: 0, jumlahRusak: 0 },
];

async function seedAdmin(): Promise<number> {
  const email = env.ADMIN_SEED_EMAIL.trim().toLowerCase();
  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  if (existing) {
    console.log("[seed] admin sudah ada");
    return existing.id;
  }
  const passwordHash = await hash(env.ADMIN_SEED_PASSWORD, 10);
  const res = await db.insert(adminUsers).values({
    nama: "Staf Basecamp",
    email,
    passwordHash,
  });
  console.log("[seed] admin dibuat");
  return insertId(res);
}

async function seedSkus() {
  for (const data of SKU_DATA) {
    const [existing] = await db
      .select()
      .from(sku)
      .where(eq(sku.kode, data.kode))
      .limit(1);
    if (existing) {
      await db
        .update(sku)
        .set({
          nama: data.nama,
          kategori: data.kategori,
          fotoUrl: FOTO_BY_KODE[data.kode] ?? null,
          hargaSewaPerHari: data.hargaSewaPerHari,
          tarifDendaHarian: data.tarifDendaHarian,
          depositNormal: data.depositNormal,
          depositBermasalah: data.depositBermasalah,
        })
        .where(eq(sku.id, existing.id));
    } else {
      await db.insert(sku).values({
        kode: data.kode,
        nama: data.nama,
        kategori: data.kategori,
        fotoUrl: FOTO_BY_KODE[data.kode] ?? null,
        hargaSewaPerHari: data.hargaSewaPerHari,
        tarifDendaHarian: data.tarifDendaHarian,
        depositNormal: data.depositNormal,
        depositBermasalah: data.depositBermasalah,
      });
    }
  }
  console.log("[seed] SKU siap");
}

async function seedUnits() {
  const skuRows = await db.select().from(sku);
  const skuMap = new Map(skuRows.map((s) => [s.kode, s]));
  for (const plan of UNIT_PLAN) {
    const parent = skuMap.get(plan.kode);
    if (!parent) continue;
    for (let i = 1; i <= plan.jumlah; i += 1) {
      const kodeUnit = `${plan.kode}-${String(i).padStart(3, "0")}`;
      const [existing] = await db
        .select()
        .from(unit)
        .where(eq(unit.kodeUnit, kodeUnit))
        .limit(1);
      if (existing) continue;
      await db.insert(unit).values({
        skuId: parent.id,
        kodeUnit,
        kondisi: plan.khusus?.[i] ?? "Baik",
      });
    }
  }
  console.log("[seed] unit siap");
}

async function seedAcuan() {
  const [tdm] = await db
    .select()
    .from(sku)
    .where(eq(sku.kode, "TDM-4P"))
    .limit(1);
  if (!tdm) return;
  for (const item of ACUAN_DATA) {
    const [existing] = await db
      .select()
      .from(acuanBiaya)
      .where(eq(acuanBiaya.namaKerusakan, item.namaKerusakan))
      .limit(1);
    if (existing) continue;
    await db.insert(acuanBiaya).values({ skuId: tdm.id, ...item });
  }
  console.log("[seed] acuan biaya siap");
}

async function seedPenyewa() {
  for (const data of PENYEWA_DATA) {
    const [existing] = await db
      .select()
      .from(penyewa)
      .where(eq(penyewa.nomorHp, data.nomorHp))
      .limit(1);
    if (existing) continue;
    await db.insert(penyewa).values(data);
  }
  console.log("[seed] penyewa siap");
}

interface SeedItem {
  kode: string;
  qty: number;
}

async function main() {
  const adminId = await seedAdmin();
  await seedSkus();
  await seedUnits();
  await seedAcuan();
  await seedPenyewa();

  const [{ total }] = await db.select({ total: count() }).from(pesanan);
  if (Number(total) > 0) {
    console.log("[seed] pesanan sudah ada, seed pesanan dilewati");
    return;
  }

  const skuRows = await db.select().from(sku);
  const skuMap = new Map(skuRows.map((s) => [s.kode, s]));
  const penyewaRows = await db.select().from(penyewa);
  const penyewaMap = new Map(penyewaRows.map((p) => [p.nomorHp, p]));
  const unitRows = await db.select().from(unit);
  const unitMap = new Map(unitRows.map((u) => [u.kodeUnit, u]));

  const acuanRows = await db.select().from(acuanBiaya);
  const acuanMap = new Map(acuanRows.map((a) => [a.namaKerusakan, a]));

  function totals(items: SeedItem[], hari: number, status: StatusPenyewa) {
    let totalSewa = 0;
    let deposit = 0;
    for (const item of items) {
      const s = skuMap.get(item.kode)!;
      totalSewa += s.hargaSewaPerHari * item.qty * hari;
      deposit +=
        (status === "Bermasalah" ? s.depositBermasalah : s.depositNormal) *
        item.qty;
    }
    return { totalSewa, dp: dpFor(totalSewa), deposit };
  }

  async function addPesanan(values: {
    kode: string;
    penyewaHp: string;
    tanggalAmbil: string;
    tanggalKembali: string;
    hariSewa: number;
    status: StatusPesanan;
    statusPenyewaSaatPesan: StatusPenyewa;
    items: SeedItem[];
    pickedUpAt?: Date | null;
    dikembalikanAt?: Date | null;
    hariDenda?: number;
    totalDenda?: number;
    totalKerusakan?: number;
    selisihAkhir?: number;
    createdAt: Date;
  }): Promise<number> {
    const pelanggan = penyewaMap.get(values.penyewaHp);
    if (!pelanggan) throw new Error(`Penyewa ${values.penyewaHp} tidak ada`);
    const t = totals(values.items, values.hariSewa, values.statusPenyewaSaatPesan);
    const res = await db.insert(pesanan).values({
      kode: values.kode,
      penyewaId: pelanggan.id,
      tanggalAmbil: values.tanggalAmbil,
      tanggalKembali: values.tanggalKembali,
      hariSewa: values.hariSewa,
      status: values.status,
      statusPenyewaSaatPesan: values.statusPenyewaSaatPesan,
      totalSewa: t.totalSewa,
      dp: t.dp,
      deposit: t.deposit,
      pickedUpAt: values.pickedUpAt ?? null,
      dikembalikanAt: values.dikembalikanAt ?? null,
      hariDenda: values.hariDenda ?? 0,
      totalDenda: values.totalDenda ?? 0,
      totalKerusakan: values.totalKerusakan ?? 0,
      selisihAkhir: values.selisihAkhir ?? 0,
      createdAt: values.createdAt,
    });
    const pesananId = insertId(res);
    for (const item of values.items) {
      const s = skuMap.get(item.kode)!;
      await db.insert(pesananItem).values({
        pesananId,
        skuId: s.id,
        qty: item.qty,
      });
    }
    return pesananId;
  }

  async function addPayment(
    pesananId: number,
    kode: string,
    jenis: JenisPembayaran,
    jumlah: number,
    status: StatusPembayaran,
    paidAt?: Date,
  ) {
    await db.insert(pembayaran).values({
      pesananId,
      jenis,
      jumlah,
      midtransOrderId: `seed-${kode}-${jenis}`,
      status,
      paidAt: paidAt ?? null,
      midtransTransactionId: status === "Berhasil" ? `seed-${jenis}` : null,
    });
  }

  async function linkUnit(
    pesananId: number,
    kodeUnit: string,
    pickedUpAt: Date,
  ): Promise<number> {
    const u = unitMap.get(kodeUnit);
    if (!u) throw new Error(`Unit ${kodeUnit} tidak ada`);
    const res = await db.insert(pesananUnit).values({
      pesananId,
      unitId: u.id,
      pickedUpAt,
    });
    return insertId(res);
  }

  async function addInspeksiBaik(
    pesananUnitId: number,
    inspectedAt: Date,
  ) {
    await db.insert(inspeksi).values({
      pesananUnitId,
      kondisi: "Baik",
      catatan: null,
      biayaKerusakan: 0,
      adminId,
      inspectedAt,
    });
  }

  // 1. Showcase: TT-20261204-0001 (Sedang Disewa, sudah kembali, pelunasan menunggu)
  const o1 = await addPesanan({
    kode: "TT-20261204-0001",
    penyewaHp: "081234567810",
    tanggalAmbil: "2026-12-04",
    tanggalKembali: "2026-12-06",
    hariSewa: 3,
    status: "Sedang Disewa",
    statusPenyewaSaatPesan: "Normal",
    items: [{ kode: "TDM-4P", qty: 1 }],
    pickedUpAt: new Date("2026-12-04T08:40:00"),
    dikembalikanAt: new Date("2026-12-07T14:30:00"),
    hariDenda: 3,
    totalDenda: 150000,
    totalKerusakan: 0,
    selisihAkhir: 7500,
    createdAt: new Date("2026-12-01T10:05:00"),
  });
  {
    const pu = await linkUnit(o1, "TDM-4P-002", new Date("2026-12-04T08:40:00"));
    await addInspeksiBaik(pu, new Date("2026-12-07T14:30:00"));
    await addPayment(o1, "TT-20261204-0001", "DP", 367500, "Berhasil", new Date("2026-12-01T10:20:00"));
    await addPayment(o1, "TT-20261204-0001", "Pelunasan", 7500, "Menunggu");
  }

  // 2. Late order
  const o2 = await addPesanan({
    kode: "TT-20261122-0001",
    penyewaHp: "087811906625",
    tanggalAmbil: "2026-11-22",
    tanggalKembali: "2026-11-24",
    hariSewa: 3,
    status: "Sedang Disewa",
    statusPenyewaSaatPesan: "Normal",
    items: [{ kode: "TDM-4P", qty: 1 }],
    pickedUpAt: new Date("2026-11-22T09:10:00"),
    createdAt: new Date("2026-11-20T08:15:00"),
  });
  await linkUnit(o2, "TDM-4P-001", new Date("2026-11-22T09:10:00"));
  await addPayment(o2, "TT-20261122-0001", "DP", 367500, "Berhasil", new Date("2026-11-20T08:30:00"));

  // 3. Dewi menunggu persetujuan
  await addPesanan({
    kode: "TT-20261205-0002",
    penyewaHp: "085722104432",
    tanggalAmbil: "2026-12-05",
    tanggalKembali: "2026-12-07",
    hariSewa: 3,
    status: "Menunggu Persetujuan",
    statusPenyewaSaatPesan: "Bermasalah",
    items: [{ kode: "CRV-60", qty: 2 }],
    createdAt: new Date("2026-12-02T13:20:00"),
  });

  // 4. Rizky menunggu pembayaran
  const o4 = await addPesanan({
    kode: "TT-20261210-0001",
    penyewaHp: "081234567810",
    tanggalAmbil: "2026-12-10",
    tanggalKembali: "2026-12-12",
    hariSewa: 3,
    status: "Menunggu Pembayaran",
    statusPenyewaSaatPesan: "Normal",
    items: [{ kode: "SLB-AB", qty: 1 }],
    createdAt: new Date("2026-12-03T16:45:00"),
  });
  await addPayment(o4, "TT-20261210-0001", "DP", 181500, "Menunggu");

  // 5. Komunitas terkonfirmasi, 8 tenda
  const o5 = await addPesanan({
    kode: "TT-20261204-0003",
    penyewaHp: "081298765432",
    tanggalAmbil: "2026-12-04",
    tanggalKembali: "2026-12-06",
    hariSewa: 3,
    status: "Terkonfirmasi",
    statusPenyewaSaatPesan: "Normal",
    items: [{ kode: "TDM-4P", qty: 8 }],
    createdAt: new Date("2026-12-01T09:30:00"),
  });
  await addPayment(o5, "TT-20261204-0003", "DP", 2940000, "Berhasil", new Date("2026-12-01T09:45:00"));

  // 6. Selesai
  const o6 = await addPesanan({
    kode: "TT-20261120-0001",
    penyewaHp: "087811906625",
    tanggalAmbil: "2026-11-20",
    tanggalKembali: "2026-11-22",
    hariSewa: 3,
    status: "Selesai",
    statusPenyewaSaatPesan: "Normal",
    items: [{ kode: "TDM-4P", qty: 1 }],
    pickedUpAt: new Date("2026-11-20T08:00:00"),
    dikembalikanAt: new Date("2026-11-22T11:30:00"),
    selisihAkhir: -142500,
    createdAt: new Date("2026-11-18T11:00:00"),
  });
  {
    const pu = await linkUnit(o6, "TDM-4P-003", new Date("2026-11-20T08:00:00"));
    await addInspeksiBaik(pu, new Date("2026-11-22T11:30:00"));
    await addPayment(o6, "TT-20261120-0001", "DP", 367500, "Berhasil", new Date("2026-11-18T11:15:00"));
  }

  // 7. Bagas carrier terkonfirmasi
  const o7 = await addPesanan({
    kode: "TT-20261128-0002",
    penyewaHp: "087811906625",
    tanggalAmbil: "2026-11-28",
    tanggalKembali: "2026-11-30",
    hariSewa: 3,
    status: "Terkonfirmasi",
    statusPenyewaSaatPesan: "Normal",
    items: [{ kode: "CRV-60", qty: 1 }],
    createdAt: new Date("2026-11-24T14:10:00"),
  });
  await addPayment(o7, "TT-20261128-0002", "DP", 240500, "Berhasil", new Date("2026-11-24T14:25:00"));

  // 8. Dewi ditolak
  await addPesanan({
    kode: "TT-20261125-0001",
    penyewaHp: "085722104432",
    tanggalAmbil: "2026-12-01",
    tanggalKembali: "2026-12-02",
    hariSewa: 2,
    status: "Ditolak",
    statusPenyewaSaatPesan: "Bermasalah",
    items: [{ kode: "STV-PK", qty: 1 }],
    createdAt: new Date("2026-11-25T09:00:00"),
  });

  // Referensi acuan agar tidak dianggap tidak terpakai.
  void acuanMap;
  console.log("[seed] pesanan contoh siap");
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error("[seed] gagal", error);
    await pool.end();
    process.exit(1);
  });
