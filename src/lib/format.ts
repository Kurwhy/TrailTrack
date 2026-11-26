const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatAngka(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

/** Parse "YYYY-MM-DD" into a local Date at midnight. */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
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

export function daysBetweenInclusive(ambil: string, kembali: string): number {
  const a = parseIsoDate(ambil).getTime();
  const b = parseIsoDate(kembali).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

export function formatTanggal(iso?: string): string {
  if (!iso) return "-";
  const d = parseIsoDate(iso.slice(0, 10));
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTanggalPendek(iso?: string): string {
  if (!iso) return "-";
  const d = parseIsoDate(iso.slice(0, 10));
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function formatTanggalLengkap(iso?: string): string {
  if (!iso) return "-";
  const d = parseIsoDate(iso.slice(0, 10));
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatWaktu(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const jam = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  return `${jam}.${menit}`;
}

export function formatTanggalWaktu(iso?: string | null): string {
  if (!iso) return "-";
  return `${formatTanggalLengkap(iso.slice(0, 10))}, ${formatWaktu(iso)}`;
}

export function namaBulan(month: number): string {
  return BULAN[month];
}

export function maskNomorHp(nomor: string): string {
  const bersih = nomor.replace(/\D/g, "");
  if (bersih.length <= 2) return "**";
  return `${"*".repeat(bersih.length - 2)}${bersih.slice(-2)}`;
}

export function bulanLabel(tahun: number, bulan: number): string {
  return `${BULAN[bulan]} ${tahun}`;
}

const LABEL_KATEGORI: Record<string, string> = {
  Stove: "Kompor",
};

export function labelKategori(kategori: string): string {
  return LABEL_KATEGORI[kategori] ?? kategori;
}
