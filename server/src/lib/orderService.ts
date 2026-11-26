import { and, count, eq, inArray, like, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, type Executor, type Tx } from "../db/client";
import {
  acuanBiaya,
  inspeksi,
  inspeksiDetail,
  pembayaran,
  pesanan,
  pesananItem,
  pesananUnit,
  penyewa,
  sku,
  unit,
  KONDISI,
  STATUS_PESANAN,
  type UnitRow,
} from "../db/schema";
import { busyUnitIds, conflictDates, minSisaForRange } from "./availability";
import {
  ApiError,
  badRequest,
  conflict,
  notFound,
} from "./errors";
import {
  aturan,
  dpFor,
  hariSewa,
  hitungDendaAktual,
  normalizePhone,
  statusPenyewaSetelah,
  toIsoDate,
} from "./rules";

type Kondisi = (typeof KONDISI)[number];
type StatusPesanan = (typeof STATUS_PESANAN)[number];

export interface CreateOrderInput {
  nama: string;
  nomorHp: string;
  tanggalAmbil: string;
  tanggalKembali: string;
  items: Array<{ skuId: number; qty: number }>;
  viaAdmin: boolean;
}

export interface ReturnInput {
  dikembalikanAt: Date;
  inspeksi: Array<{
    unitId: number;
    kondisi: Kondisi;
    catatan: string;
    acuanIds: number[];
  }>;
}

function getInsertId(result: unknown): number {
  if (Array.isArray(result)) {
    return Number((result[0] as { insertId?: number })?.insertId ?? 0);
  }
  return Number((result as { insertId?: number })?.insertId ?? 0);
}

function isDuplicateKode(error: unknown): boolean {
  const e = error as {
    code?: string;
    errno?: number;
    sqlMessage?: string;
    message?: string;
  };
  if (e?.errno !== 1062 && e?.code !== "ER_DUP_ENTRY") return false;
  const message = `${e.sqlMessage ?? ""} ${e.message ?? ""}`;
  return /pesanan.*kode|uq_pesanan_kode/i.test(message);
}

async function nextKode(exec: Executor): Promise<string> {
  const prefix = `TT-${toIsoDate(new Date()).replace(/-/g, "")}-`;
  const target = exec as unknown as typeof db;
  const rows = await target
    .select({ total: count() })
    .from(pesanan)
    .where(like(pesanan.kode, `${prefix}%`));
  const seq = Number(rows[0]?.total ?? 0) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function ensureDpPayment(
  tx: Tx,
  pesananId: number,
  kode: string,
  jumlah: number,
) {
  const existing = await tx
    .select({ id: pembayaran.id })
    .from(pembayaran)
    .where(and(eq(pembayaran.pesananId, pesananId), eq(pembayaran.jenis, "DP")))
    .limit(1);
  if (existing.length > 0) return;
  await tx.insert(pembayaran).values({
    pesananId,
    jenis: "DP",
    jumlah,
    midtransOrderId: `${kode}-DP-${Date.now()}`,
    status: "Menunggu",
  });
}

async function ensurePelunasanPayment(
  tx: Tx,
  pesananId: number,
  kode: string,
  jumlah: number,
) {
  const existing = await tx
    .select({ id: pembayaran.id })
    .from(pembayaran)
    .where(
      and(eq(pembayaran.pesananId, pesananId), eq(pembayaran.jenis, "Pelunasan")),
    )
    .limit(1);
  if (existing.length > 0) return;
  await tx.insert(pembayaran).values({
    pesananId,
    jenis: "Pelunasan",
    jumlah,
    midtransOrderId: `${kode}-Pelunasan-${Date.now()}`,
    status: "Menunggu",
  });
}

export async function createOrder(input: CreateOrderInput) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        const phone = normalizePhone(input.nomorHp);
        let [pelanggan] = await tx
          .select()
          .from(penyewa)
          .where(eq(penyewa.nomorHp, phone))
          .limit(1);
        if (!pelanggan) {
          try {
            const res = await tx.insert(penyewa).values({
              nama: input.nama.trim(),
              nomorHp: phone,
              status: "Normal",
              jumlahTelat: 0,
              jumlahRusak: 0,
            });
            const id = getInsertId(res);
            [pelanggan] = await tx
              .select()
              .from(penyewa)
              .where(eq(penyewa.id, id))
              .limit(1);
          } catch {
            [pelanggan] = await tx
              .select()
              .from(penyewa)
              .where(eq(penyewa.nomorHp, phone))
              .limit(1);
          }
        }
        if (!pelanggan) throw new ApiError(500, "Gagal menyiapkan data penyewa.");

        const skuIds = [...new Set(input.items.map((i) => i.skuId))].sort(
          (a, b) => a - b,
        );
        for (const id of skuIds) {
          await tx.execute(sql`SELECT id FROM ${sku} WHERE ${sku.id} = ${id} FOR UPDATE`);
        }
        const skuRows = await tx
          .select()
          .from(sku)
          .where(inArray(sku.id, skuIds));
        if (skuRows.length !== skuIds.length) {
          badRequest("Ada SKU yang tidak ditemukan.");
        }
        const skuMap = new Map(skuRows.map((s) => [s.id, s]));

        const konflik: Array<unknown> = [];
        for (const item of input.items) {
          const sisa = await minSisaForRange(
            tx,
            item.skuId,
            input.tanggalAmbil,
            input.tanggalKembali,
          );
          if (item.qty > sisa) {
            const dates = await conflictDates(
              tx,
              item.skuId,
              input.tanggalAmbil,
              input.tanggalKembali,
              item.qty,
            );
            const s = skuMap.get(item.skuId);
            konflik.push({
              skuId: item.skuId,
              kode: s?.kode,
              nama: s?.nama,
              diminta: item.qty,
              sisaMaksimal: sisa,
              tanggalPenuh: dates,
            });
          }
        }
        if (konflik.length > 0) {
          throw new ApiError(
            409,
            "Stok tidak cukup pada beberapa tanggal.",
            { konflik },
          );
        }

        const jumlahHari = hariSewa(input.tanggalAmbil, input.tanggalKembali);
        let totalSewa = 0;
        let deposit = 0;
        for (const item of input.items) {
          const s = skuMap.get(item.skuId)!;
          totalSewa += s.hargaSewaPerHari * item.qty * jumlahHari;
          deposit +=
            (pelanggan.status === "Bermasalah"
              ? s.depositBermasalah
              : s.depositNormal) * item.qty;
        }
        const dp = dpFor(totalSewa);
        const statusPenyewaSaatPesan = pelanggan.status;
        const status: StatusPesanan = input.viaAdmin
          ? "Menunggu Pembayaran"
          : statusPenyewaSaatPesan === "Bermasalah"
            ? "Menunggu Persetujuan"
            : "Menunggu Pembayaran";

        const kode = await nextKode(tx);
        const res = await tx.insert(pesanan).values({
          kode,
          penyewaId: pelanggan.id,
          tanggalAmbil: input.tanggalAmbil,
          tanggalKembali: input.tanggalKembali,
          hariSewa: jumlahHari,
          status,
          statusPenyewaSaatPesan,
          totalSewa,
          dp,
          deposit,
        });
        const pesananId = getInsertId(res);
        await tx.insert(pesananItem).values(
          input.items.map((item) => ({
            pesananId,
            skuId: item.skuId,
            qty: item.qty,
          })),
        );
        if (status === "Menunggu Pembayaran") {
          await ensureDpPayment(tx, pesananId, kode, dp + deposit);
        }
        return { id: pesananId, kode };
      });
    } catch (error) {
      if (isDuplicateKode(error) && attempt < 3) continue;
      throw error;
    }
  }
  throw new ApiError(500, "Gagal membuat pesanan.");
}

export async function approveOrder(id: number) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(pesanan)
      .where(eq(pesanan.id, id))
      .limit(1);
    if (!row) notFound("Pesanan tidak ditemukan.");
    if (row.status !== "Menunggu Persetujuan") {
      conflict("Pesanan ini tidak sedang menunggu persetujuan.");
    }
    await tx
      .update(pesanan)
      .set({ status: "Menunggu Pembayaran" })
      .where(eq(pesanan.id, id));
    await ensureDpPayment(tx, id, row.kode, row.dp + row.deposit);
  });
}

export async function rejectOrder(id: number) {
  const [row] = await db.select().from(pesanan).where(eq(pesanan.id, id)).limit(1);
  if (!row) notFound("Pesanan tidak ditemukan.");
  if (row.status !== "Menunggu Persetujuan") {
    conflict("Pesanan ini tidak sedang menunggu persetujuan.");
  }
  await db.update(pesanan).set({ status: "Ditolak" }).where(eq(pesanan.id, id));
}

export async function pickedUpOrder(id: number, unitIds: number[]) {
  if (new Set(unitIds).size !== unitIds.length) {
    badRequest("Ada unit yang dipilih lebih dari sekali.");
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM ${pesanan} WHERE ${pesanan.id} = ${id} FOR UPDATE`);
    const [row] = await tx
      .select()
      .from(pesanan)
      .where(eq(pesanan.id, id))
      .limit(1);
    if (!row) notFound("Pesanan tidak ditemukan.");
    if (row.status !== "Terkonfirmasi") {
      conflict("Picked Up hanya untuk pesanan Terkonfirmasi.");
    }

    const itemRows = await tx
      .select()
      .from(pesananItem)
      .where(eq(pesananItem.pesananId, id));

    if (unitIds.length !== itemRows.reduce((s, i) => s + i.qty, 0)) {
      badRequest("Jumlah unit yang dipilih tidak sesuai pesanan.");
    }

    const ids = [...unitIds].sort((a, b) => a - b);
    for (const unitId of ids) {
      await tx.execute(sql`SELECT id FROM ${unit} WHERE ${unit.id} = ${unitId} FOR UPDATE`);
    }
    const unitRows = await tx
      .select()
      .from(unit)
      .where(inArray(unit.id, ids));
    if (unitRows.length !== ids.length) {
      badRequest("Ada unit yang tidak ditemukan.");
    }
    const busy = await busyUnitIds(tx);
    const perSku = new Map<number, number>();
    for (const u of unitRows) {
      if (u.kondisi !== "Baik") {
        conflict(`Unit ${u.kodeUnit} tidak berkondisi Baik.`);
      }
      if (busy.has(u.id)) {
        conflict(`Unit ${u.kodeUnit} sedang dipakai pesanan lain.`);
      }
      perSku.set(u.skuId, (perSku.get(u.skuId) ?? 0) + 1);
    }
    for (const item of itemRows) {
      if ((perSku.get(item.skuId) ?? 0) !== item.qty) {
        conflict("Jumlah unit per SKU tidak sesuai pesanan.");
      }
    }

    const now = new Date();
    await tx.insert(pesananUnit).values(
      ids.map((unitId) => ({
        pesananId: id,
        unitId,
        pickedUpAt: now,
      })),
    );
    await tx
      .update(pesanan)
      .set({ status: "Sedang Disewa", pickedUpAt: now })
      .where(eq(pesanan.id, id));
  });
}

export async function recordReturn(
  id: number,
  input: ReturnInput,
  adminId: number,
) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM ${pesanan} WHERE ${pesanan.id} = ${id} FOR UPDATE`);
    const [row] = await tx
      .select()
      .from(pesanan)
      .where(eq(pesanan.id, id))
      .limit(1);
    if (!row) notFound("Pesanan tidak ditemukan.");
    if (row.status !== "Sedang Disewa") {
      conflict("Pengembalian hanya untuk pesanan Sedang Disewa.");
    }

    const puRows = await tx
      .select()
      .from(pesananUnit)
      .where(eq(pesananUnit.pesananId, id));
    if (puRows.length === 0) conflict("Pesanan belum memiliki unit yang diambil.");
    const puByUnit = new Map(puRows.map((p) => [p.unitId, p]));
    if (input.inspeksi.length !== puRows.length) {
      badRequest("Setiap unit yang diambil harus memiliki hasil inspeksi.");
    }
    const seen = new Set<number>();
    for (const item of input.inspeksi) {
      if (!puByUnit.has(item.unitId)) {
        badRequest("Ada unit yang bukan bagian dari pesanan ini.");
      }
      if (seen.has(item.unitId)) {
        badRequest("Ada unit yang diperiksa lebih dari sekali.");
      }
      seen.add(item.unitId);
    }

    const puIds = puRows.map((p) => p.id);
    const existing = await tx
      .select({ id: inspeksi.id })
      .from(inspeksi)
      .where(inArray(inspeksi.pesananUnitId, puIds));
    if (existing.length > 0) {
      conflict("Inspeksi untuk pesanan ini sudah tercatat.");
    }

    const unitRows = await tx
      .select()
      .from(unit)
      .where(inArray(unit.id, input.inspeksi.map((i) => i.unitId)));
    const unitMap = new Map(unitRows.map((u) => [u.id, u]));

    const allAcuanIds = [...new Set(input.inspeksi.flatMap((i) => i.acuanIds))];
    const acuanRows =
      allAcuanIds.length > 0
        ? await tx
            .select()
            .from(acuanBiaya)
            .where(inArray(acuanBiaya.id, allAcuanIds))
        : [];
    const acuanMap = new Map(acuanRows.map((a) => [a.id, a]));

    let totalKerusakan = 0;
    const jumlahRusakBaru: { unitId: number }[] = [];
    const now = new Date();

    for (const item of input.inspeksi) {
      const u = unitMap.get(item.unitId);
      if (!u) badRequest("Unit tidak ditemukan.");
      const pu = puByUnit.get(item.unitId)!;

      let biayaKerusakan = 0;
      const detail: Array<{ acuanBiayaId: number; biaya: number }> = [];
      if (item.kondisi !== "Baik") {
        const catatan = item.catatan.trim();
        if (catatan.length === 0) {
          badRequest("Catatan wajib diisi untuk unit yang tidak berstatus Baik.");
        }
        if (catatan.length > 500) {
          badRequest("Catatan inspeksi maksimal 500 karakter.");
        }
        const punyaAcuan = await tx
          .select({ id: acuanBiaya.id })
          .from(acuanBiaya)
          .where(
            and(
              eq(acuanBiaya.skuId, u.skuId),
              eq(acuanBiaya.kategori, item.kondisi),
            ),
          )
          .limit(1);
        if (punyaAcuan.length > 0 && item.acuanIds.length === 0) {
          badRequest("Pilih minimal satu poin kerusakan untuk unit tersebut.");
        }
        for (const acuanId of item.acuanIds) {
          const acuan = acuanMap.get(acuanId);
          if (!acuan || acuan.skuId !== u.skuId || acuan.kategori !== item.kondisi) {
            badRequest("Poin kerusakan tidak sesuai SKU atau kategori kondisi.");
          }
          biayaKerusakan += acuan.biaya;
          detail.push({ acuanBiayaId: acuan.id, biaya: acuan.biaya });
        }
        if (item.kondisi === "Rusak" || item.kondisi === "Hilang") {
          jumlahRusakBaru.push({ unitId: u.id });
        }
      }

      const insRes = await tx.insert(inspeksi).values({
        pesananUnitId: pu.id,
        kondisi: item.kondisi,
        catatan: item.catatan.trim() || null,
        biayaKerusakan,
        adminId,
        inspectedAt: now,
      });
      const inspeksiId = getInsertId(insRes);
      if (detail.length > 0) {
        await tx.insert(inspeksiDetail).values(
          detail.map((d) => ({ inspeksiId, ...d })),
        );
      }
      totalKerusakan += biayaKerusakan;

      await tx
        .update(unit)
        .set({
          kondisi: item.kondisi,
          catatan: item.catatan.trim() || null,
          kondisiDiubahAt: now,
        })
        .where(eq(unit.id, u.id));
    }

    const itemRows = await tx
      .select({ qty: pesananItem.qty, tarif: sku.tarifDendaHarian })
      .from(pesananItem)
      .innerJoin(sku, eq(sku.id, pesananItem.skuId))
      .where(eq(pesananItem.pesananId, id));
    const tarifDendaTotal = itemRows.reduce(
      (sum, r) => sum + r.qty * r.tarif,
      0,
    );

    const { hariDenda } = hitungDendaAktual(
      input.dikembalikanAt,
      row.tanggalKembali,
    );
    const totalDenda = hariDenda * tarifDendaTotal;
    const sisaSewa = Math.max(0, row.totalSewa - row.dp);
    const selisihAkhir =
      sisaSewa + totalDenda + totalKerusakan - row.deposit;

    const [pelanggan] = await tx
      .select()
      .from(penyewa)
      .where(eq(penyewa.id, row.penyewaId))
      .limit(1);
    if (pelanggan) {
      const jumlahTelat = pelanggan.jumlahTelat + (hariDenda > 0 ? 1 : 0);
      const jumlahRusak = pelanggan.jumlahRusak + jumlahRusakBaru.length;
      await tx
        .update(penyewa)
        .set({
          jumlahTelat,
          jumlahRusak,
          status: statusPenyewaSetelah(jumlahTelat, jumlahRusak),
        })
        .where(eq(penyewa.id, pelanggan.id));
    }

    await tx
      .update(pesanan)
      .set({
        dikembalikanAt: input.dikembalikanAt,
        hariDenda,
        totalDenda,
        totalKerusakan,
        selisihAkhir,
      })
      .where(eq(pesanan.id, id));

    if (selisihAkhir > 0) {
      await ensurePelunasanPayment(tx, id, row.kode, selisihAkhir);
    }
  });
}

export async function completeOrder(id: number) {
  const [row] = await db.select().from(pesanan).where(eq(pesanan.id, id)).limit(1);
  if (!row) notFound("Pesanan tidak ditemukan.");
  if (row.status !== "Sedang Disewa") {
    conflict("Pesanan belum dalam status Sedang Disewa.");
  }
  if (!row.dikembalikanAt) {
    conflict("Catat pengembalian sebelum menyelesaikan pesanan.");
  }
  if (row.selisihAkhir > 0) {
    const paid = await db
      .select({ id: pembayaran.id })
      .from(pembayaran)
      .where(
        and(
          eq(pembayaran.pesananId, id),
          eq(pembayaran.jenis, "Pelunasan"),
          eq(pembayaran.status, "Berhasil"),
        ),
      )
      .limit(1);
    if (paid.length === 0) {
      conflict("Pelunasan belum lunas.");
    }
  }
  await db.update(pesanan).set({ status: "Selesai" }).where(eq(pesanan.id, id));
}

export async function simulatePayment(
  id: number,
  jenis: "DP" | "Pelunasan",
) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(pesanan)
      .where(eq(pesanan.id, id))
      .limit(1);
    if (!row) notFound("Pesanan tidak ditemukan.");

    if (jenis === "DP") {
      if (row.status === "Terkonfirmasi" || row.status === "Sedang Disewa" || row.status === "Selesai") {
        return;
      }
      if (row.status !== "Menunggu Pembayaran" && row.status !== "Menunggu Persetujuan") {
        conflict("Pesanan belum siap dibayar.");
      }
      await ensureDpPayment(tx, id, row.kode, row.dp + row.deposit);
      await tx
        .update(pembayaran)
        .set({
          status: "Berhasil",
          paidAt: new Date(),
          midtransTransactionId: `dev-dp-${Date.now()}`,
        })
        .where(and(eq(pembayaran.pesananId, id), eq(pembayaran.jenis, "DP")));
      await tx
        .update(pesanan)
        .set({ status: "Terkonfirmasi" })
        .where(eq(pesanan.id, id));
      return;
    }

    if (row.status === "Selesai") return;
    if (row.status !== "Sedang Disewa" || !row.dikembalikanAt) {
      conflict("Pelunasan hanya setelah pengembalian dicatat.");
    }
    const jumlah = Math.max(0, row.selisihAkhir);
    await ensurePelunasanPayment(tx, id, row.kode, jumlah);
    await tx
      .update(pembayaran)
      .set({
        status: "Berhasil",
        paidAt: new Date(),
        midtransTransactionId: `dev-pelunasan-${Date.now()}`,
      })
      .where(
        and(eq(pembayaran.pesananId, id), eq(pembayaran.jenis, "Pelunasan")),
      );
    await tx.update(pesanan).set({ status: "Selesai" }).where(eq(pesanan.id, id));
  });
}
