import { Router } from "express";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { db } from "../db/client";
import { adminUsers } from "../db/schema";
import { env } from "../env";
import { loginSchema } from "../lib/validation";
import {
  clearSessionCookie,
  getAdminFromRequest,
  setSessionCookie,
} from "../middleware/auth";
import { loginLimiter } from "../middleware/rateLimit";

export const authRouter = Router();

authRouter.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.trim().toLowerCase()))
    .limit(1);

  if (!admin) {
    res.status(401).json({ message: "Email atau kata sandi tidak sesuai." });
    return;
  }

  if (admin.terkunciSampai) {
    const lockUntil = new Date(admin.terkunciSampai).getTime();
    if (lockUntil > Date.now()) {
      const sisaMenit = Math.max(1, Math.ceil((lockUntil - Date.now()) / 60000));
      res.status(423).json({
        message: `Akun terkunci sementara. Coba lagi dalam ${sisaMenit} menit.`,
      });
      return;
    }
  }

  const cocok = await compare(password, admin.passwordHash);
  if (!cocok) {
    const gagal = admin.gagalLogin + 1;
    const terkunci = gagal >= 5;
    await db
      .update(adminUsers)
      .set({
        gagalLogin: terkunci ? 0 : gagal,
        terkunciSampai: terkunci
          ? new Date(Date.now() + 15 * 60 * 1000)
          : admin.terkunciSampai,
      })
      .where(eq(adminUsers.id, admin.id));
    if (terkunci) {
      res.status(423).json({
        message: "Terlalu banyak percobaan. Akun dikunci selama 15 menit.",
      });
      return;
    }
    res.status(401).json({
      message: "Email atau kata sandi tidak sesuai.",
      details: { sisaPercobaan: Math.max(0, 5 - gagal) },
    });
    return;
  }

  await db
    .update(adminUsers)
    .set({ gagalLogin: 0, terkunciSampai: null })
    .where(eq(adminUsers.id, admin.id));

  const payload = { id: admin.id, nama: admin.nama, email: admin.email };
  setSessionCookie(res, payload);
  res.json({ data: payload });
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// Session probe: returns 200 with null when there is no session so public or
// logged-out visits do not read as failed requests.
authRouter.get("/me", (req, res) => {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    res.json({ data: null });
    return;
  }
  setSessionCookie(res, admin);
  res.json({ data: admin });
});
