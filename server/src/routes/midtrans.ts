import { Router } from "express";
import { z } from "zod";
import { applyMidtransStatus } from "../lib/paymentService";
import { verifyMidtransSignature } from "../lib/midtrans";

export const midtransRouter = Router();

const asString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v));

const notifikasiSchema = z.object({
  order_id: z.string().min(1),
  status_code: asString,
  gross_amount: asString,
  signature_key: z.string().min(1),
  transaction_status: z.string().min(1),
  transaction_id: z.string().optional(),
  fraud_status: z.string().optional(),
});

midtransRouter.post("/notifikasi", async (req, res) => {
  const body = notifikasiSchema.parse(req.body);

  if (
    !verifyMidtransSignature(
      body.order_id,
      body.status_code,
      body.gross_amount,
      body.signature_key,
    )
  ) {
    res.status(401).json({ message: "Signature notifikasi tidak valid." });
    return;
  }

  const result = await applyMidtransStatus({
    midtransOrderId: body.order_id,
    transactionStatus: body.transaction_status,
    transactionId: body.transaction_id,
    grossAmount: body.gross_amount,
  });

  // Always acknowledge a well-signed notification so Midtrans stops retrying,
  // even when the order id is not one we track.
  res.json({ ok: true, ...result });
});
