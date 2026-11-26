import { Router } from "express";
import { db } from "../db/client";
import { requireAdmin } from "../middleware/auth";
import { notFound } from "../lib/errors";
import {
  approveOrder,
  completeOrder,
  createOrder,
  pickedUpOrder,
  recordReturn,
  rejectOrder,
} from "../lib/orderService";
import { getOrderDetailById, listOrders } from "../lib/serializers";
import {
  createOrderSchema,
  pickedUpSchema,
  returnSchema,
} from "../lib/validation";

export const adminPesananRouter = Router();
adminPesananRouter.use(requireAdmin);

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) notFound("Pesanan tidak ditemukan.");
  return id;
}

async function detail(id: number) {
  const data = await getOrderDetailById(db, id, { admin: true });
  if (!data) notFound("Pesanan tidak ditemukan.");
  return data;
}

adminPesananRouter.get("/pesanan", async (_req, res) => {
  res.json({ data: await listOrders(db) });
});

adminPesananRouter.get("/pesanan/:id", async (req, res) => {
  res.json({ data: await detail(parseId(req.params.id)) });
});

adminPesananRouter.post("/pesanan", async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const hasil = await createOrder({ ...input, viaAdmin: true });
  res.status(201).json({ data: await detail(hasil.id) });
});

adminPesananRouter.post("/pesanan/:id/setujui", async (req, res) => {
  const id = parseId(req.params.id);
  await approveOrder(id);
  res.json({ data: await detail(id) });
});

adminPesananRouter.post("/pesanan/:id/tolak", async (req, res) => {
  const id = parseId(req.params.id);
  await rejectOrder(id);
  res.json({ data: await detail(id) });
});

adminPesananRouter.post("/pesanan/:id/picked-up", async (req, res) => {
  const id = parseId(req.params.id);
  const { unitIds } = pickedUpSchema.parse(req.body);
  await pickedUpOrder(id, unitIds);
  res.json({ data: await detail(id) });
});

adminPesananRouter.post("/pesanan/:id/pengembalian", async (req, res) => {
  const id = parseId(req.params.id);
  const input = returnSchema.parse(req.body);
  await recordReturn(
    id,
    {
      dikembalikanAt: new Date(input.dikembalikanAt),
      inspeksi: input.inspeksi,
    },
    req.admin!.id,
  );
  res.json({ data: await detail(id) });
});

adminPesananRouter.post("/pesanan/:id/selesai", async (req, res) => {
  const id = parseId(req.params.id);
  await completeOrder(id);
  res.json({ data: await detail(id) });
});
