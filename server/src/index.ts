import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ZodError } from "zod";
import { env } from "./env";
import { pool } from "./db/client";
import { ApiError } from "./lib/errors";
import { publicRouter } from "./routes/public";
import { authRouter } from "./routes/auth";
import { adminPesananRouter } from "./routes/adminPesanan";
import { adminInventarisRouter } from "./routes/adminInventaris";
import { adminPenyewaRouter } from "./routes/adminPenyewa";
import { devRouter } from "./routes/dev";
import { midtransRouter } from "./routes/midtrans";

const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", publicRouter);
app.use("/api/admin", authRouter);
app.use("/api/admin", adminPesananRouter);
app.use("/api/admin", adminInventarisRouter);
app.use("/api/admin", adminPenyewaRouter);
app.use("/api/midtrans", midtransRouter);
app.use("/api/dev", devRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Endpoint tidak ditemukan." });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ message: err.message, details: err.details });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      message: err.issues[0]?.message ?? "Input tidak valid.",
      details: err.issues,
    });
    return;
  }
  console.error("[api] error", err);
  res.status(500).json({ message: "Terjadi kesalahan pada server." });
});

async function start() {
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    console.error("[api] database tidak terhubung", error);
    process.exit(1);
  }
  app.listen(env.PORT, () => {
    console.log(
      `[api] TrailTrack API berjalan di http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
  });
}

void start();
