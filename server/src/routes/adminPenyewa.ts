import { Router } from "express";
import { db } from "../db/client";
import { penyewa } from "../db/schema";
import { requireAdmin } from "../middleware/auth";

export const adminPenyewaRouter = Router();
adminPenyewaRouter.use(requireAdmin);

adminPenyewaRouter.get("/penyewa", async (_req, res) => {
  const rows = await db.select().from(penyewa).orderBy(penyewa.nama);
  res.json({ data: rows });
});
