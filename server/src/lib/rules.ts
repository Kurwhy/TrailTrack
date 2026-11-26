import { env } from "../env";

export const aturan = {
  bufferHari: env.BUFFER_HARI,
  graceJam: env.GRACE_JAM,
  jamBatasKembali: env.JAM_BATAS_KEMBALI,
  dpPersen: env.DP_PERSEN,
  telatBatas: env.TELAT_BATAS,
};

const GRACE_MENIT = aturan.graceJam * 60;
const MENIT_PER_HARI = 24 * 60;

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

export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 2) return "**";
  return `${"*".repeat(digits.length - 2)}${digits.slice(-2)}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function hariSewa(ambil: string, kembali: string): number {
  const a = parseIsoDate(ambil).getTime();
  const b = parseIsoDate(kembali).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function dpFor(totalSewa: number): number {
  return Math.ceil((totalSewa * aturan.dpPersen) / 100);
}

export function deadlineKembali(tanggalKembali: string): Date {
  const [jam, menit] = aturan.jamBatasKembali.split(":").map(Number);
  const d = parseIsoDate(tanggalKembali);
  d.setHours(jam ?? 0, menit ?? 0, 0, 0);
  return d;
}

export function hitungDendaAktual(
  waktuKembali: Date,
  tanggalKembali: string,
): { terlambatMenit: number; hariDenda: number } {
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

export function isTelat(
  status: string,
  tanggalKembali: string,
  dikembalikanAt: Date | string | null,
  now: Date = new Date(),
): boolean {
  if (status !== "Sedang Disewa") return false;
  if (dikembalikanAt) return false;
  return now.getTime() > deadlineKembali(tanggalKembali).getTime();
}

export function statusPenyewaSetelah(
  jumlahTelat: number,
  jumlahRusak: number,
): "Normal" | "Bermasalah" {
  return jumlahTelat >= aturan.telatBatas || jumlahRusak >= 1
    ? "Bermasalah"
    : "Normal";
}

export function serializeDateTime(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
