import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "../env";
import { ApiError } from "./errors";

const SNAP_BASE = env.MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com"
  : "https://app.sandbox.midtrans.com";
const API_BASE = env.MIDTRANS_IS_PRODUCTION
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

function authHeader(): string {
  return `Basic ${Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString("base64")}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function createSnapTransaction(params: {
  orderId: string;
  grossAmount: number;
  customer?: { nama?: string; phone?: string };
}): Promise<{ token: string; redirectUrl?: string }> {
  try {
    const response = await fetchWithTimeout(
      `${SNAP_BASE}/snap/v1/transactions`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: params.orderId,
            gross_amount: params.grossAmount,
          },
          customer_details: params.customer
            ? {
                first_name: params.customer.nama?.slice(0, 50),
                phone: params.customer.phone,
              }
            : undefined,
        }),
      },
    );
    const text = await response.text();
    let json: { token?: string; redirect_url?: string; error_messages?: string[] } | null =
      null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    if (!response.ok || !json?.token) {
      throw new ApiError(
        502,
        "Midtrans menolak pembuatan transaksi. Periksa konfigurasi kunci.",
        json?.error_messages ?? text.slice(0, 200),
      );
    }
    return { token: json.token, redirectUrl: json.redirect_url };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new ApiError(504, "Midtrans tidak merespons tepat waktu.");
    }
    throw new ApiError(502, "Tidak dapat menghubungi Midtrans.");
  }
}

export interface MidtransStatus {
  transaction_status?: string;
  fraud_status?: string;
  gross_amount?: string;
  transaction_id?: string;
  status_code?: string;
  status_message?: string;
}

export async function getMidtransStatus(
  orderId: string,
): Promise<MidtransStatus | null> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/v2/${encodeURIComponent(orderId)}/status`,
      {
        headers: { Authorization: authHeader(), Accept: "application/json" },
      },
    );
    const text = await response.text();
    let json: MidtransStatus | null = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new ApiError(
        502,
        "Gagal memeriksa status pembayaran ke Midtrans.",
        json?.status_message ?? text.slice(0, 200),
      );
    }
    return json;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new ApiError(504, "Midtrans tidak merespons tepat waktu.");
    }
    throw new ApiError(502, "Tidak dapat menghubungi Midtrans.");
  }
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signature: string,
): boolean {
  const expected = createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${env.MIDTRANS_SERVER_KEY}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type PaymentOutcome = "Berhasil" | "Gagal" | "Menunggu";

export function mapMidtransStatus(status?: string): PaymentOutcome {
  if (!status) return "Menunggu";
  if (status === "capture" || status === "settlement") return "Berhasil";
  if (["deny", "cancel", "expire", "failure"].includes(status)) return "Gagal";
  return "Menunggu";
}
