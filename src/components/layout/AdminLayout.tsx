import {
  Boxes,
  ClipboardList,
  LogOut,
  Menu,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../store/AuthContext";
import { Logo } from "../shared/Logo";

const navItems = [
  { to: "/admin/pesanan", label: "Pesanan", icon: ClipboardList },
  { to: "/admin/inventaris", label: "Inventaris", icon: Boxes },
  { to: "/admin/penyewa", label: "Penyewa", icon: Users },
];

function NavItem({
  to,
  label,
  icon: Icon,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: typeof ClipboardList;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex min-h-[44px] items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500",
          isActive
            ? "bg-gold-500/[0.12] text-gold-200"
            : "text-muted hover:bg-moss/[0.06] hover:text-ink",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "h-1.5 w-1.5 rotate-45",
              isActive ? "bg-gold-400" : "bg-line-strong",
            )}
            aria-hidden="true"
          />
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function AdminLayout() {
  const { isAuthed, loading, logout, adminNama } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Memeriksa sesi staf.
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const sidebarContent = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo to="/admin/pesanan" compact />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Panel Staf
        </p>
      </div>
      <nav aria-label="Navigasi admin" className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <p className="px-3 pb-2 text-xs text-muted">{adminNama}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-control px-3 text-sm font-medium text-muted transition-colors hover:bg-coral/[0.08] hover:text-coraltext focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          <span className="h-1.5 w-1.5 rotate-45 bg-line-strong" aria-hidden="true" />
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-charcoal">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-panel lg:block">
        {sidebarContent()}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-charcoal px-4 sm:px-6 lg:hidden">
          <Logo to="/admin/pesanan" compact />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="menu-admin-mobile"
            aria-label={menuOpen ? "Tutup menu admin" : "Buka menu admin"}
            className="flex h-11 w-11 items-center justify-center rounded-control border border-line text-ink transition-colors hover:bg-moss/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </header>

        {menuOpen && (
          <div
            id="menu-admin-mobile"
            className="border-b border-line bg-panel lg:hidden"
          >
            {sidebarContent(() => setMenuOpen(false))}
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
