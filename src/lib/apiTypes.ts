import type {
  KategoriAcuan,
  KategoriSku,
  Kondisi,
  StatusPenyewa,
  StatusPesanan,
} from "./types";

export interface KatalogSku {
  id: number;
  kode: string;
  nama: string;
  kategori: KategoriSku;
  fotoUrl: string | null;
  hargaSewaPerHari: number;
  tarifDendaHarian: number;
  depositNormal: number;
  depositBermasalah: number;
  unitBaik: number;
}

export interface AvailabilityDay {
  date: string;
  terpakai: number;
  buffer: number;
  sisa: number;
}

export interface KetersediaanMonth {
  sku: { id: number; kode: string; nama: string };
  bulan: string;
  hari: AvailabilityDay[];
}

export interface KetersediaanRange {
  sku: { id: number; kode: string; nama: string };
  ambil: string;
  kembali: string;
  hari: AvailabilityDay[];
  minSisa: number;
}

export interface PenyewaInfo {
  id?: number;
  nama: string;
  nomorHp: string;
  nomorHpMasked: string;
  status: StatusPenyewa;
  jumlahTelat: number;
  jumlahRusak: number;
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

export interface UnitView {
  id: number;
  skuId: number;
  kodeUnit: string;
  kondisi: Kondisi;
  catatan?: string | null;
  kondisiDiubahAt?: string;
}

export interface InspeksiView {
  pesananUnitId: number;
  unitId: number | null;
  kodeUnit: string | null;
  kondisi: Kondisi;
  catatan: string;
  biayaKerusakan: number;
  inspectedAt: string | null;
  poin: Array<{
    acuanBiayaId: number;
    namaKerusakan: string;
    biaya: number;
  }>;
}

export interface PembayaranView {
  id: number;
  jenis: "DP" | "Deposit" | "Pelunasan";
  jumlah: number;
  status: "Menunggu" | "Berhasil" | "Gagal";
  midtransOrderId: string;
  paidAt: string | null;
}

export interface TagihanView {
  totalSewa: number;
  dp: number;
  sisaSewa: number;
  denda: number;
  kerusakan: number;
  deposit: number;
  selisihAkhir: number;
}

export interface AcuanView {
  id: number;
  skuId: number;
  kategori: KategoriAcuan;
  namaKerusakan: string;
  biaya: number;
}

export interface PesananDetail {
  id: number;
  kode: string;
  status: StatusPesanan;
  statusPenyewaSaatPesan: StatusPenyewa;
  tanggalAmbil: string;
  tanggalKembali: string;
  hariSewa: number;
  totalSewa: number;
  dp: number;
  deposit: number;
  hariDenda: number;
  totalDenda: number;
  totalKerusakan: number;
  selisihAkhir: number;
  pickedUpAt: string | null;
  dikembalikanAt: string | null;
  createdAt: string | null;
  telat: boolean;
  penyewa: PenyewaInfo | null;
  items: OrderItemView[];
  units: UnitView[];
  inspeksi: InspeksiView[];
  pembayaran: PembayaranView[];
  availableUnits: Array<{ id: number; skuId: number; kodeUnit: string }>;
  acuan: AcuanView[];
  tagihan: TagihanView;
}

export interface OrderSummary {
  id: number;
  kode: string;
  status: StatusPesanan;
  tanggalAmbil: string;
  tanggalKembali: string;
  penyewaNama: string;
  jumlahUnit: number;
  telat: boolean;
  createdAt: string | null;
}

export interface RiwayatResponse {
  penyewa: {
    nama: string;
    nomorHp: string;
    status: StatusPenyewa;
    jumlahTelat: number;
    jumlahRusak: number;
  } | null;
  pesanan: Array<{
    id: number;
    kode: string;
    tanggalAmbil: string;
    tanggalKembali: string;
    status: StatusPesanan;
    totalDenda: number;
    totalKerusakan: number;
    telat: boolean;
  }>;
}

export interface AdminSku {
  id: number;
  kode: string;
  nama: string;
  kategori: KategoriSku;
  fotoUrl: string | null;
  hargaSewaPerHari: number;
  tarifDendaHarian: number;
  depositNormal: number;
  depositBermasalah: number;
  kondisiCount: Record<string, number>;
  totalUnit: number;
}

export interface AdminSkuDetail {
  id: number;
  kode: string;
  nama: string;
  kategori: KategoriSku;
  fotoUrl: string | null;
  hargaSewaPerHari: number;
  tarifDendaHarian: number;
  depositNormal: number;
  depositBermasalah: number;
  units: UnitView[];
  acuan: AcuanView[];
}

export interface PenyewaRow {
  id: number;
  nama: string;
  nomorHp: string;
  status: StatusPenyewa;
  jumlahTelat: number;
  jumlahRusak: number;
}

export interface AdminMe {
  id: number;
  nama: string;
  email: string;
}

export interface SnapPayment {
  snapToken: string;
  orderId: string;
  jumlah: number;
  jenis: "DP" | "Pelunasan";
}

export interface SyncPayment {
  kode: string;
  orderStatus: StatusPesanan;
  pembayaran: Array<{
    jenis: string;
    status: string;
    jumlah: number;
    paidAt: string | null;
  }>;
}

export interface CreateOrderPayload {
  nama: string;
  nomorHp: string;
  tanggalAmbil: string;
  tanggalKembali: string;
  items: Array<{ skuId: number; qty: number }>;
}
