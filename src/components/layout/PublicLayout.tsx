import { History } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Logo } from "../shared/Logo";
import { appMeta } from "../../lib/config";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bone">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-moss-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-bone"
      >
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-bone">
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Navigasi utama">
            <NavLink
              to="/riwayat"
              className={({ isActive }) =>
                `inline-flex min-h-[44px] items-center gap-2 rounded-control px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 ${
                  isActive
                    ? "bg-moss-50 text-moss-700"
                    : "text-muted hover:bg-moss/[0.06] hover:text-ink"
                }`
              }
            >
              <History className="h-4 w-4" aria-hidden="true" />
              Cek Riwayat
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="konten" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-bone">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <img
              src="/brand/logo-mark.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-md border border-line object-cover"
            />
            <span className="text-sm font-bold text-ink">{appMeta.nama}</span>
          </div>
          <p className="text-xs text-muted">
            {appMeta.deskripsi}. &copy; {new Date().getFullYear()} {appMeta.nama}.
          </p>
        </div>
      </footer>
    </div>
  );
}
