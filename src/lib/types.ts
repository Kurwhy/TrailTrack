export const KONDISI = [
  "Baik",
  "Perlu Perbaikan Ringan",
  "Rusak",
  "Hilang",
] as const;
export type Kondisi = (typeof KONDISI)[number];

export const KATEGORI_SKU = [
  "Tenda Dome",
  "Carrier",
  "Sleeping Bag",
  "Stove",
  "Trekking Pole",
  "Kursi & Meja",
  "Hydropack",
  "Senter",
  "Lampu",
  "Sepatu",
  "Jaket",
  "Sarung Tangan",
  "Gas Portable",
  "Matras",
  "Hammock",
] as const;
export type KategoriSku = (typeof KATEGORI_SKU)[number];

export const STATUS_PESANAN = [
  "Menunggu Persetujuan",
  "Ditolak",
  "Menunggu Pembayaran",
  "Terkonfirmasi",
  "Sedang Disewa",
  "Selesai",
] as const;
export type StatusPesanan = (typeof STATUS_PESANAN)[number];

export const STATUS_PENYEWA = ["Normal", "Bermasalah"] as const;
export type StatusPenyewa = (typeof STATUS_PENYEWA)[number];

export const KATEGORI_ACUAN = [
  "Perlu Perbaikan Ringan",
  "Rusak",
  "Hilang",
] as const;
export type KategoriAcuan = (typeof KATEGORI_ACUAN)[number];

export interface Sku {
  id: number;
  kode: string;
  nama: string;
  kategori: KategoriSku;
  hargaSewaPerHari: number;
  tarifDendaHarian: number;
  depositNormal: number;
  depositBermasalah: number;
}

export interface Unit {
  id: number;
  skuId: number;
  kodeUnit: string;
  kondisi: Kondisi;
}

export interface AcuanBiaya {
  id: number;
  skuId: number;
  kategori: KategoriAcuan;
  namaKerusakan: string;
  biaya: number;
}

export interface Penyewa {
  id: number;
  nama: string;
  nomorHp: string;
  status: StatusPenyewa;
  jumlahTelat: number;
  jumlahRusak: number;
}

export interface PesananItem {
  skuId: number;
  qty: number;
}

export interface InspeksiUnit {
  unitId: number;
  kondisi: Kondisi;
  catatan: string;
  acuanIds: number[];
  biayaKerusakan: number;
}

export interface Pesanan {
  id: number;
  kode: string;
  penyewaId: number;
  tanggalAmbil: string;
  tanggalKembali: string;
  hariSewa: number;
  status: StatusPesanan;
  statusPenyewaSaatPesan: StatusPenyewa;
  totalSewa: number;
  dp: number;
  deposit: number;
  items: PesananItem[];
  unitIds: number[];
  pickedUpAt?: string;
  dikembalikanAt?: string;
  hariDenda: number;
  totalDenda: number;
  totalKerusakan: number;
  selisihAkhir: number;
  inspeksi: InspeksiUnit[];
  pembayaranAwalLunas: boolean;
  pelunasanLunas: boolean;
  createdAt: string;
}

export interface AvailabilityDay {
  date: string;
  terpakai: number;
  buffer: number;
  sisa: number;
}

export interface Tagihan {
  totalSewa: number;
  sisaSewa: number;
  denda: number;
  kerusakan: number;
  deposit: number;
  selisihAkhir: number;
}
