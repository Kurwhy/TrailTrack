import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isProd } from "../env";

export interface AdminPayload {
  id: number;
  nama: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

const COOKIE_NAME = "tt_session";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

function signToken(admin: AdminPayload): string {
  return jwt.sign(
    { nama: admin.nama, email: admin.email },
    env.JWT_SECRET,
    { subject: String(admin.id), expiresIn: "12h" },
  );
}

export function setSessionCookie(res: Response, admin: AdminPayload) {
  res.cookie(COOKIE_NAME, signToken(admin), {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
  });
}

export function getAdminFromRequest(req: Request): AdminPayload | null {
  const token = (req.cookies?.[COOKIE_NAME] as string | undefined) ?? null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    const id = Number(payload.sub);
    if (!id) return null;
    return {
      id,
      nama: String(payload.nama ?? "Staf"),
      email: String(payload.email ?? ""),
    };
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = (req.cookies?.[COOKIE_NAME] as string | undefined) ?? null;
  if (!token) {
    res.status(401).json({ message: "Silakan masuk sebagai staf." });
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    const admin: AdminPayload = {
      id: Number(payload.sub),
      nama: String(payload.nama ?? "Staf"),
      email: String(payload.email ?? ""),
    };
    if (!admin.id) throw new Error("invalid");
    req.admin = admin;
    // Sliding session: refresh the cookie on activity, 12 jam sejak aktivitas terakhir.
    setSessionCookie(res, admin);
    next();
  } catch {
    res.status(401).json({ message: "Sesi tidak valid atau sudah berakhir." });
  }
}
