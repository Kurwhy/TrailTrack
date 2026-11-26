import { Router } from "express";
import { db } from "../db/client";
import { isProd } from "../env";
import { simulatePayment } from "../lib/orderService";
import { getOrderDetailById } from "../lib/serializers";
import { paySchema } from "../lib/validation";
import { notFound } from "../lib/errors";

export const devRouter = Router();

devRouter.use((_req, res, next) => {
  if (isProd) {
    res.status(404).json({ message: "Endpoint tidak tersedia." });
    return;
  }
  next();
});

devRouter.post("/pesanan/:id/bayar", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) notFound("Pesanan tidak ditemukan.");
  const { jenis } = paySchema.parse(req.body);
  await simulatePayment(id, jenis);
  res.json({ data: await getOrderDetailById(db, id, { admin: true }) });
});
