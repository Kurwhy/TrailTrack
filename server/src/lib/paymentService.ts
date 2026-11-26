import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { pembayaran, pesanan, penyewa } from "../db/schema";
import { ApiError, conflict, notFound } from "./errors";
import {
  createSnapTransaction,
  getMidtransStatus,
  mapMidtransStatus,
} from "./midtrans";

function insertId(result: unknown): number {
  if (Array.isArray(result)) {
    return Number((result[0] as { insertId?: number })?.insertId ?? 0);
  }
  return Number((result as { insertId?: number })?.insertId ?? 0);
}

async function loadOrderByKode(kode: string) {
  const [order] = await db
    .select()
    .from(pesanan)
    .where(eq(pesanan.kode, kode))
    .limit(1);
  if (!order) notFound("Pesanan tidak ditemukan.");
  return order;
}

export interface SnapPaymentResult {
  snapToken: string;
  orderId: string;
  jumlah: number;
  jenis: "DP" | "Pelunasan";
}

export async function requestSnapPayment(
  kode: string,
  jenis: "DP" | "Pelunasan",
): Promise<SnapPaymentResult> {
  const order = await loadOrderByKode(kode);

  if (jenis === "DP") {
    if (order.status === "Menunggu Persetujuan") {
      conflict("Pesanan masih menunggu persetujuan admin.");
    }
    if (order.status !== "Menunggu Pembayaran") {
      conflict("Pesanan tidak dalam status yang dapat dibayar.");
    }
  } else {
    if (order.status !== "Sedang Disewa" || !order.dikembalikanAt) {
      conflict("Pelunasan belum tersedia untuk pesanan ini.");
    }
    if (order.selisihAkhir <= 0) {
      conflict("Tidak ada selisih yang perlu dilunasi.");
    }
  }

  const jumlah =
    jenis === "DP" ? order.dp + order.deposit : Math.max(0, order.selisihAkhir);

  let [row] = await db
    .select()
    .from(pembayaran)
    .where(
      and(eq(pembayaran.pesananId, order.id), eq(pembayaran.jenis, jenis)),
    )
    .limit(1);

  if (row?.status === "Berhasil") {
    conflict("Pembayaran ini sudah lunas.");
  }

  if (!row) {
    const res = await db.insert(pembayaran).values({
      pesananId: order.id,
      jenis,
      jumlah,
      midtransOrderId: `${kode}-${jenis}-${Date.now()}`,
      status: "Menunggu",
    });
    const id = insertId(res);
    [row] = await db
      .select()
      .from(pembayaran)
      .where(eq(pembayaran.id, id))
      .limit(1);
  }
  if (!row) throw new ApiError(500, "Gagal menyiapkan data pembayaran.");

  if (row.status === "Menunggu" && row.snapToken && row.jumlah === jumlah) {
    return {
      snapToken: row.snapToken,
      orderId: row.midtransOrderId,
      jumlah,
      jenis,
    };
  }

  const orderId = `${kode}-${jenis}-${Date.now()}`;
  await db
    .update(pembayaran)
    .set({
      midtransOrderId: orderId,
      jumlah,
      status: "Menunggu",
      snapToken: null,
      midtransTransactionId: null,
      paidAt: null,
    })
    .where(eq(pembayaran.id, row.id));

  const [pelanggan] = await db
    .select()
    .from(penyewa)
    .where(eq(penyewa.id, order.penyewaId))
    .limit(1);

  const snap = await createSnapTransaction({
    orderId,
    grossAmount: jumlah,
    customer: pelanggan
      ? { nama: pelanggan.nama, phone: pelanggan.nomorHp }
      : undefined,
  });

  await db
    .update(pembayaran)
    .set({ snapToken: snap.token })
    .where(eq(pembayaran.id, row.id));

  return { snapToken: snap.token, orderId, jumlah, jenis };
}

export interface ApplyStatusInput {
  midtransOrderId: string;
  transactionStatus?: string;
  transactionId?: string;
  grossAmount?: string;
}

export interface ApplyStatusResult {
  found: boolean;
  status: "Berhasil" | "Gagal" | "Menunggu";
  orderStatus?: string;
}

export async function applyMidtransStatus(
  input: ApplyStatusInput,
): Promise<ApplyStatusResult> {
  const [row] = await db
    .select()
    .from(pembayaran)
    .where(eq(pembayaran.midtransOrderId, input.midtransOrderId))
    .limit(1);
  if (!row) return { found: false, status: "Menunggu" };

  if (input.grossAmount !== undefined) {
    const gross = Number(input.grossAmount);
    if (!Number.isFinite(gross) || Math.round(gross) !== row.jumlah) {
      throw new ApiError(400, "Nilai gross_amount tidak cocok dengan tagihan.", {
        expected: row.jumlah,
        received: input.grossAmount,
      });
    }
  }

  const outcome = mapMidtransStatus(input.transactionStatus);

  if (row.status === "Berhasil") {
    const [order] = await db
      .select({ status: pesanan.status })
      .from(pesanan)
      .where(eq(pesanan.id, row.pesananId))
      .limit(1);
    return { found: true, status: "Berhasil", orderStatus: order?.status };
  }

  if (outcome === "Menunggu") {
    return { found: true, status: "Menunggu" };
  }

  if (outcome === "Gagal") {
    await db
      .update(pembayaran)
      .set({ status: "Gagal" })
      .where(eq(pembayaran.id, row.id));
    return { found: true, status: "Gagal" };
  }

  return await db.transaction(async (tx) => {
    await tx
      .update(pembayaran)
      .set({
        status: "Berhasil",
        paidAt: new Date(),
        midtransTransactionId:
          input.transactionId ?? row.midtransTransactionId ?? null,
      })
      .where(eq(pembayaran.id, row.id));

    const [order] = await tx
      .select()
      .from(pesanan)
      .where(eq(pesanan.id, row.pesananId))
      .limit(1);
    if (!order) return { found: true, status: "Berhasil" as const };

    let orderStatus = order.status;
    if (row.jenis === "DP" || row.jenis === "Deposit") {
      if (order.status === "Menunggu Pembayaran") {
        orderStatus = "Terkonfirmasi";
        await tx
          .update(pesanan)
          .set({ status: "Terkonfirmasi" })
          .where(eq(pesanan.id, order.id));
      }
    } else if (
      order.status === "Sedang Disewa" &&
      order.dikembalikanAt
    ) {
      orderStatus = "Selesai";
      await tx
        .update(pesanan)
        .set({ status: "Selesai" })
        .where(eq(pesanan.id, order.id));
    }
    return { found: true, status: "Berhasil" as const, orderStatus };
  });
}

export interface SyncResult {
  kode: string;
  orderStatus: string;
  pembayaran: Array<{
    jenis: string;
    status: string;
    jumlah: number;
    paidAt: string | null;
  }>;
}

export async function syncOrderPayments(kode: string): Promise<SyncResult> {
  const order = await loadOrderByKode(kode);
  const rows = await db
    .select()
    .from(pembayaran)
    .where(eq(pembayaran.pesananId, order.id));

  for (const row of rows) {
    if (row.status !== "Menunggu") continue;
    // Seeded or not-yet-requested rows have no Midtrans transaction yet.
    if (row.midtransOrderId.startsWith("seed-")) continue;
    if (!row.snapToken) continue;
    const status = await getMidtransStatus(row.midtransOrderId);
    if (!status) continue;
    await applyMidtransStatus({
      midtransOrderId: row.midtransOrderId,
      transactionStatus: status.transaction_status,
      transactionId: status.transaction_id,
      grossAmount: status.gross_amount,
    });
  }

  const [fresh] = await db
    .select()
    .from(pesanan)
    .where(eq(pesanan.id, order.id))
    .limit(1);
  const freshPayments = await db
    .select()
    .from(pembayaran)
    .where(eq(pembayaran.pesananId, order.id));

  return {
    kode,
    orderStatus: fresh?.status ?? order.status,
    pembayaran: freshPayments.map((p) => ({
      jenis: p.jenis,
      status: p.status,
      jumlah: p.jumlah,
      paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : null,
    })),
  };
}
