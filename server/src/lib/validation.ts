import { z } from "zod";
import { KATEGORI_SKU, KONDISI } from "../db/schema";
import { isValidPhone, todayIso } from "./rules";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

export const createOrderSchema = z
  .object({
    nama: z
      .string()
      .trim()
      .min(3, "Nama minimal 3 karakter.")
      .max(120, "Nama maksimal 120 karakter."),
    nomorHp: z
      .string()
      .refine((v) => isValidPhone(v), "Nomor HP tidak valid."),
    tanggalAmbil: isoDate,
    tanggalKembali: isoDate,
    items: z
      .array(
        z.object({
          skuId: z.number().int().positive(),
          qty: z.number().int().min(1, "Jumlah minimal 1."),
        }),
      )
      .min(1, "Tambahkan minimal satu alat."),
  })
  .refine((d) => d.tanggalAmbil >= todayIso(), {
    message: "Tanggal ambil tidak boleh di masa lalu.",
    path: ["tanggalAmbil"],
  })
  .refine((d) => d.tanggalKembali >= d.tanggalAmbil, {
    message: "Tanggal kembali tidak boleh sebelum tanggal ambil.",
    path: ["tanggalKembali"],
  });

export const returnSchema = z.object({
  dikembalikanAt: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Waktu tidak valid."),
  inspeksi: z
    .array(
      z.object({
        unitId: z.number().int().positive(),
        kondisi: z.enum(KONDISI),
        catatan: z.string().max(500).optional().default(""),
        acuanIds: z.array(z.number().int().positive()).optional().default([]),
      }),
    )
    .min(1, "Inspeksi minimal satu unit."),
});

export const pickedUpSchema = z.object({
  unitIds: z.array(z.number().int().positive()).min(1),
});

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export const skuCreateSchema = z.object({
  kode: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Kode SKU hanya huruf, angka, dan tanda hubung."),
  nama: z.string().trim().min(3).max(120),
  kategori: z.enum(KATEGORI_SKU),
  fotoUrl: z.string().url().max(255).optional().nullable(),
  hargaSewaPerHari: z.number().int().min(0),
  tarifDendaHarian: z.number().int().min(0),
  depositNormal: z.number().int().min(0),
  depositBermasalah: z.number().int().min(0),
});

export const skuUpdateSchema = z.object({
  hargaSewaPerHari: z.number().int().min(0).optional(),
  tarifDendaHarian: z.number().int().min(0).optional(),
  depositNormal: z.number().int().min(0).optional(),
  depositBermasalah: z.number().int().min(0).optional(),
});

export const unitCreateSchema = z.object({
  skuId: z.number().int().positive(),
  kodeUnit: z.string().trim().min(3).max(30).optional(),
});

export const KATEGORI_ACUAN = ["Perlu Perbaikan Ringan", "Rusak", "Hilang"] as const;

export const acuanCreateSchema = z.object({
  skuId: z.number().int().positive(),
  kategori: z.enum(KATEGORI_ACUAN),
  namaKerusakan: z.string().trim().min(1).max(120),
  biaya: z.number().int().min(0),
});

export const acuanUpdateSchema = z.object({
  kategori: z.enum(KATEGORI_ACUAN).optional(),
  namaKerusakan: z.string().trim().min(1).max(120).optional(),
  biaya: z.number().int().min(0).optional(),
});

export const paySchema = z.object({
  jenis: z.enum(["DP", "Pelunasan"]),
});
