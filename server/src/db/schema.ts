import {
  mysqlTable,
  int,
  varchar,
  text,
  date,
  datetime,
  mysqlEnum,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

export const KONDISI = ["Baik", "Perlu Perbaikan Ringan", "Rusak", "Hilang"] as const;
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
export const STATUS_PESANAN = [
  "Menunggu Persetujuan",
  "Ditolak",
  "Menunggu Pembayaran",
  "Terkonfirmasi",
  "Sedang Disewa",
  "Selesai",
] as const;
export const STATUS_PENYEWA = ["Normal", "Bermasalah"] as const;
export const JENIS_PEMBAYARAN = ["DP", "Deposit", "Pelunasan"] as const;
export const STATUS_PEMBAYARAN = ["Menunggu", "Berhasil", "Gagal"] as const;

export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  nama: varchar("nama", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  gagalLogin: int("gagal_login").notNull().default(0),
  terkunciSampai: datetime("terkunci_sampai"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("uq_admin_email").on(t.email)]);

export const sku = mysqlTable("sku", {
  id: int("id").autoincrement().primaryKey(),
  kode: varchar("kode", { length: 20 }).notNull(),
  nama: varchar("nama", { length: 120 }).notNull(),
  kategori: mysqlEnum("kategori", KATEGORI_SKU).notNull(),
  fotoUrl: varchar("foto_url", { length: 255 }),
  hargaSewaPerHari: int("harga_sewa_per_hari").notNull().default(0),
  tarifDendaHarian: int("tarif_denda_harian").notNull().default(0),
  depositNormal: int("deposit_normal").notNull().default(0),
  depositBermasalah: int("deposit_bermasalah").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("uq_sku_kode").on(t.kode)]);

export const unit = mysqlTable("unit", {
  id: int("id").autoincrement().primaryKey(),
  skuId: int("sku_id").notNull(),
  kodeUnit: varchar("kode_unit", { length: 30 }).notNull(),
  kondisi: mysqlEnum("kondisi", KONDISI).notNull().default("Baik"),
  catatan: text("catatan"),
  kondisiDiubahAt: timestamp("kondisi_diubah_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("uq_unit_kode").on(t.kodeUnit),
  index("idx_unit_sku_kondisi").on(t.skuId, t.kondisi),
]);

export const acuanBiaya = mysqlTable("acuan_biaya", {
  id: int("id").autoincrement().primaryKey(),
  skuId: int("sku_id").notNull(),
  kategori: mysqlEnum("kategori", ["Perlu Perbaikan Ringan", "Rusak", "Hilang"]).notNull(),
  namaKerusakan: varchar("nama_kerusakan", { length: 120 }).notNull(),
  biaya: int("biaya").notNull().default(0),
}, (t) => [index("idx_acuan_sku").on(t.skuId)]);

export const penyewa = mysqlTable("penyewa", {
  id: int("id").autoincrement().primaryKey(),
  nama: varchar("nama", { length: 120 }).notNull(),
  nomorHp: varchar("nomor_hp", { length: 15 }).notNull(),
  status: mysqlEnum("status", STATUS_PENYEWA).notNull().default("Normal"),
  jumlahTelat: int("jumlah_telat").notNull().default(0),
  jumlahRusak: int("jumlah_rusak").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("uq_penyewa_hp").on(t.nomorHp)]);

export const pesanan = mysqlTable("pesanan", {
  id: int("id").autoincrement().primaryKey(),
  kode: varchar("kode", { length: 20 }).notNull(),
  penyewaId: int("penyewa_id").notNull(),
  tanggalAmbil: date("tanggal_ambil", { mode: "string" }).notNull(),
  tanggalKembali: date("tanggal_kembali", { mode: "string" }).notNull(),
  hariSewa: int("hari_sewa").notNull().default(1),
  status: mysqlEnum("status", STATUS_PESANAN).notNull(),
  statusPenyewaSaatPesan: mysqlEnum("status_penyewa_saat_pesan", STATUS_PENYEWA).notNull(),
  totalSewa: int("total_sewa").notNull().default(0),
  dp: int("dp").notNull().default(0),
  deposit: int("deposit").notNull().default(0),
  pickedUpAt: datetime("picked_up_at"),
  dikembalikanAt: datetime("dikembalikan_at"),
  hariDenda: int("hari_denda").notNull().default(0),
  totalDenda: int("total_denda").notNull().default(0),
  totalKerusakan: int("total_kerusakan").notNull().default(0),
  selisihAkhir: int("selisih_akhir").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  uniqueIndex("uq_pesanan_kode").on(t.kode),
  index("idx_pesanan_tanggal").on(t.tanggalAmbil, t.tanggalKembali),
  index("idx_pesanan_penyewa").on(t.penyewaId),
]);

export const pesananItem = mysqlTable("pesanan_item", {
  id: int("id").autoincrement().primaryKey(),
  pesananId: int("pesanan_id").notNull(),
  skuId: int("sku_id").notNull(),
  qty: int("qty").notNull().default(1),
}, (t) => [index("idx_item_sku").on(t.skuId), index("idx_item_pesanan").on(t.pesananId)]);

export const pesananUnit = mysqlTable("pesanan_unit", {
  id: int("id").autoincrement().primaryKey(),
  pesananId: int("pesanan_id").notNull(),
  unitId: int("unit_id").notNull(),
  pickedUpAt: datetime("picked_up_at").notNull(),
}, (t) => [
  uniqueIndex("uq_pesanan_unit").on(t.pesananId, t.unitId),
  index("idx_pu_unit").on(t.unitId),
]);

export const inspeksi = mysqlTable("inspeksi", {
  id: int("id").autoincrement().primaryKey(),
  pesananUnitId: int("pesanan_unit_id").notNull(),
  kondisi: mysqlEnum("kondisi", KONDISI).notNull(),
  catatan: text("catatan"),
  biayaKerusakan: int("biaya_kerusakan").notNull().default(0),
  adminId: int("admin_id").notNull(),
  inspectedAt: datetime("inspected_at").notNull(),
}, (t) => [uniqueIndex("uq_inspeksi_pu").on(t.pesananUnitId)]);

export const inspeksiDetail = mysqlTable("inspeksi_detail", {
  id: int("id").autoincrement().primaryKey(),
  inspeksiId: int("inspeksi_id").notNull(),
  acuanBiayaId: int("acuan_biaya_id").notNull(),
  biaya: int("biaya").notNull().default(0),
}, (t) => [index("idx_detail_inspeksi").on(t.inspeksiId)]);

export const pembayaran = mysqlTable("pembayaran", {
  id: int("id").autoincrement().primaryKey(),
  pesananId: int("pesanan_id").notNull(),
  jenis: mysqlEnum("jenis", JENIS_PEMBAYARAN).notNull(),
  jumlah: int("jumlah").notNull(),
  midtransOrderId: varchar("midtrans_order_id", { length: 64 }).notNull(),
  midtransTransactionId: varchar("midtrans_transaction_id", { length: 64 }),
  snapToken: varchar("snap_token", { length: 255 }),
  status: mysqlEnum("status", STATUS_PEMBAYARAN).notNull().default("Menunggu"),
  paidAt: datetime("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("uq_pembayaran_order").on(t.midtransOrderId),
  index("idx_pembayaran_pesanan").on(t.pesananId),
]);

export type PesananRow = typeof pesanan.$inferSelect;
export type PesananItemRow = typeof pesananItem.$inferSelect;
export type UnitRow = typeof unit.$inferSelect;
export type SkuRow = typeof sku.$inferSelect;
export type PenyewaRow = typeof penyewa.$inferSelect;
export type PembayaranRow = typeof pembayaran.$inferSelect;
export type InspeksiRow = typeof inspeksi.$inferSelect;
