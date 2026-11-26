CREATE TABLE `acuan_biaya` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku_id` int NOT NULL,
	`kategori` enum('Perlu Perbaikan Ringan','Rusak','Hilang') NOT NULL,
	`nama_kerusakan` varchar(120) NOT NULL,
	`biaya` int NOT NULL DEFAULT 0,
	CONSTRAINT `acuan_biaya_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` varchar(120) NOT NULL,
	`email` varchar(160) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`gagal_login` int NOT NULL DEFAULT 0,
	`terkunci_sampai` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_admin_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `inspeksi` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pesanan_unit_id` int NOT NULL,
	`kondisi` enum('Baik','Perlu Perbaikan Ringan','Rusak','Hilang') NOT NULL,
	`catatan` text,
	`biaya_kerusakan` int NOT NULL DEFAULT 0,
	`admin_id` int NOT NULL,
	`inspected_at` datetime NOT NULL,
	CONSTRAINT `inspeksi_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_inspeksi_pu` UNIQUE(`pesanan_unit_id`)
);
--> statement-breakpoint
CREATE TABLE `inspeksi_detail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspeksi_id` int NOT NULL,
	`acuan_biaya_id` int NOT NULL,
	`biaya` int NOT NULL DEFAULT 0,
	CONSTRAINT `inspeksi_detail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pembayaran` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pesanan_id` int NOT NULL,
	`jenis` enum('DP','Deposit','Pelunasan') NOT NULL,
	`jumlah` int NOT NULL,
	`midtrans_order_id` varchar(64) NOT NULL,
	`midtrans_transaction_id` varchar(64),
	`snap_token` varchar(255),
	`status` enum('Menunggu','Berhasil','Gagal') NOT NULL DEFAULT 'Menunggu',
	`paid_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pembayaran_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_pembayaran_order` UNIQUE(`midtrans_order_id`)
);
--> statement-breakpoint
CREATE TABLE `penyewa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` varchar(120) NOT NULL,
	`nomor_hp` varchar(15) NOT NULL,
	`status` enum('Normal','Bermasalah') NOT NULL DEFAULT 'Normal',
	`jumlah_telat` int NOT NULL DEFAULT 0,
	`jumlah_rusak` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `penyewa_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_penyewa_hp` UNIQUE(`nomor_hp`)
);
--> statement-breakpoint
CREATE TABLE `pesanan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode` varchar(20) NOT NULL,
	`penyewa_id` int NOT NULL,
	`tanggal_ambil` date NOT NULL,
	`tanggal_kembali` date NOT NULL,
	`hari_sewa` int NOT NULL DEFAULT 1,
	`status` enum('Menunggu Persetujuan','Ditolak','Menunggu Pembayaran','Terkonfirmasi','Sedang Disewa','Selesai') NOT NULL,
	`status_penyewa_saat_pesan` enum('Normal','Bermasalah') NOT NULL,
	`total_sewa` int NOT NULL DEFAULT 0,
	`dp` int NOT NULL DEFAULT 0,
	`deposit` int NOT NULL DEFAULT 0,
	`picked_up_at` datetime,
	`dikembalikan_at` datetime,
	`hari_denda` int NOT NULL DEFAULT 0,
	`total_denda` int NOT NULL DEFAULT 0,
	`total_kerusakan` int NOT NULL DEFAULT 0,
	`selisih_akhir` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pesanan_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_pesanan_kode` UNIQUE(`kode`)
);
--> statement-breakpoint
CREATE TABLE `pesanan_item` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pesanan_id` int NOT NULL,
	`sku_id` int NOT NULL,
	`qty` int NOT NULL DEFAULT 1,
	CONSTRAINT `pesanan_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pesanan_unit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pesanan_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`picked_up_at` datetime NOT NULL,
	CONSTRAINT `pesanan_unit_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_pesanan_unit` UNIQUE(`pesanan_id`,`unit_id`)
);
--> statement-breakpoint
CREATE TABLE `sku` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode` varchar(20) NOT NULL,
	`nama` varchar(120) NOT NULL,
	`kategori` enum('Tenda Dome','Carrier','Sleeping Bag','Stove','Trekking Pole') NOT NULL,
	`foto_url` varchar(255),
	`harga_sewa_per_hari` int NOT NULL DEFAULT 0,
	`tarif_denda_harian` int NOT NULL DEFAULT 0,
	`deposit_normal` int NOT NULL DEFAULT 0,
	`deposit_bermasalah` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sku_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_sku_kode` UNIQUE(`kode`)
);
--> statement-breakpoint
CREATE TABLE `unit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku_id` int NOT NULL,
	`kode_unit` varchar(30) NOT NULL,
	`kondisi` enum('Baik','Perlu Perbaikan Ringan','Rusak','Hilang') NOT NULL DEFAULT 'Baik',
	`catatan` text,
	`kondisi_diubah_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `unit_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_unit_kode` UNIQUE(`kode_unit`)
);
--> statement-breakpoint
CREATE INDEX `idx_acuan_sku` ON `acuan_biaya` (`sku_id`);--> statement-breakpoint
CREATE INDEX `idx_detail_inspeksi` ON `inspeksi_detail` (`inspeksi_id`);--> statement-breakpoint
CREATE INDEX `idx_pembayaran_pesanan` ON `pembayaran` (`pesanan_id`);--> statement-breakpoint
CREATE INDEX `idx_pesanan_tanggal` ON `pesanan` (`tanggal_ambil`,`tanggal_kembali`);--> statement-breakpoint
CREATE INDEX `idx_pesanan_penyewa` ON `pesanan` (`penyewa_id`);--> statement-breakpoint
CREATE INDEX `idx_item_sku` ON `pesanan_item` (`sku_id`);--> statement-breakpoint
CREATE INDEX `idx_item_pesanan` ON `pesanan_item` (`pesanan_id`);--> statement-breakpoint
CREATE INDEX `idx_pu_unit` ON `pesanan_unit` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_unit_sku_kondisi` ON `unit` (`sku_id`,`kondisi`);