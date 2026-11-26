import { config } from "./config";
import { parseIsoDate } from "./format";
import type {
  Pesanan,
  PesananItem,
  Sku,
  StatusPenyewa,
  Tagihan,
} from "./types";

const GRACE_MENIT = config.graceJam * 60;
const MENIT_PER_HARI = 24 * 60;

/** Normalize any Indonesian phone input to 08xxxxxxxxxx before storing. */
export function normalizePhone(raw: string): string {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`;
  else if (digits.startsWith("8")) digits = `0${digits}`;
  return digits;
}

export function isValidPhone(raw: string): boolean {
  const phone = normalizePhone(raw);
  return /^08\d{8,13}$/.test(phone) && phone.length >= 10 && phone.length <= 15;
}

export function isValidName(raw: string): boolean {
  const name = (raw ?? "").trim();
  return name.length >= 3 && name.length <= 120;
}

export function totalSewaFor(
  items: PesananItem[],
  skus: Sku[],
  hariSewa: number,
): number {
  return items.reduce((sum, item) => {
    const sku = skus.find((s) => s.id === item.skuId);
    if (!sku) return sum;
    return sum + sku.hargaSewaPerHari * item.qty * hariSewa;
  }, 0);
}

export function dpFor(totalSewa: number): number {
  return Math.ceil((totalSewa * config.dpPersen) / 100);
}

export function depositFor(
  items: PesananItem[],
  skus: Sku[],
  status: StatusPenyewa,
): number {
  return items.reduce((sum, item) => {
    const sku = skus.find((s) => s.id === item.skuId);
    if (!sku) return sum;
    const perUnit =
      status === "Bermasalah" ? sku.depositBermasalah : sku.depositNormal;
    return sum + perUnit * item.qty;
  }, 0);
}

export function tarifDendaFor(items: PesananItem[], skus: Sku[]): number {
  return items.reduce((sum, item) => {
    const sku = skus.find((s) => s.id === item.skuId);
    if (!sku) return sum;
    return sum + sku.tarifDendaHarian * item.qty;
  }, 0);
}

export interface DendaSimulasi {
  hariDenda: number;
  total: number;
}

/** Bab 6 D: grace period then ceil per 24 jam starting from the return deadline. */
export function simulationDenda(
  jamTerlambat: number,
  tarifDenda: number,
): DendaSimulasi {
  const terlambatMenit = Math.max(0, jamTerlambat) * 60;
  if (terlambatMenit <= GRACE_MENIT) return { hariDenda: 0, total: 0 };
  const hariDenda = Math.ceil(terlambatMenit / MENIT_PER_HARI);
  return { hariDenda, total: hariDenda * tarifDenda };
}

export function deadlineKembali(tanggalKembali: string): Date {
  const [jam, menit] = config.jamBatasKembali.split(":").map(Number);
  const date = parseIsoDate(tanggalKembali);
  date.setHours(jam ?? 0, menit ?? 0, 0, 0);
  return date;
}

export interface DendaAktual {
  terlambatMenit: number;
  hariDenda: number;
}

export function hitungDendaAktual(
  waktuKembali: Date,
  tanggalKembali: string,
): DendaAktual {
  const batas = deadlineKembali(tanggalKembali);
  const terlambatMenit = Math.floor(
    (waktuKembali.getTime() - batas.getTime()) / 60_000,
  );
  if (terlambatMenit <= GRACE_MENIT) return { terlambatMenit, hariDenda: 0 };
  return {
    terlambatMenit,
    hariDenda: Math.ceil(terlambatMenit / MENIT_PER_HARI),
  };
}

export function isPesananTelat(pesanan: Pesanan, now: Date = new Date()): boolean {
  if (pesanan.status !== "Sedang Disewa") return false;
  if (pesanan.dikembalikanAt) return false;
  return now.getTime() > deadlineKembali(pesanan.tanggalKembali).getTime();
}

export function hitungTagihan(pesanan: Pesanan): Tagihan {
  const sisaSewa = Math.max(0, pesanan.totalSewa - pesanan.dp);
  const tagihanAkhir =
    sisaSewa + pesanan.totalDenda + pesanan.totalKerusakan;
  return {
    totalSewa: pesanan.totalSewa,
    sisaSewa,
    denda: pesanan.totalDenda,
    kerusakan: pesanan.totalKerusakan,
    deposit: pesanan.deposit,
    selisihAkhir: tagihanAkhir - pesanan.deposit,
  };
}

/** Bab 6 E: tenant becomes Bermasalah at TELAT_BATAS late returns or any Rusak/Hilang. */
export function statusPenyewaSetelah(
  jumlahTelat: number,
  jumlahRusak: number,
): StatusPenyewa {
  return jumlahTelat >= config.telatBatas || jumlahRusak >= 1
    ? "Bermasalah"
    : "Normal";
}
