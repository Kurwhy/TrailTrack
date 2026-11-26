import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { SectionLabel } from "../../components/ui/Card";
import { EmptyState } from "../../components/shared/EmptyState";
import { usePageMeta } from "../../lib/usePageMeta";

export function NotFoundPage() {
  usePageMeta("Halaman tidak ditemukan - TrailTrack", true);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <SectionLabel>404</SectionLabel>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
        Halaman tidak ditemukan.
      </h1>
      <p className="mt-2 text-sm text-muted">
        Tautan yang Anda buka tidak tersedia. Kembali ke katalog untuk memulai.
      </p>
      <div className="mt-6">
        <EmptyState
          icon={Compass}
          title="Tidak ada yang bisa ditampilkan di sini"
          description="Periksa kembali alamat halaman atau pilih menu yang tersedia."
          action={
            <Link
              to="/"
              className="inline-flex h-11 items-center rounded-control bg-gold-500 px-4 text-sm font-semibold text-charcoal hover:bg-gold-400"
            >
              Kembali ke katalog
            </Link>
          }
        />
      </div>
    </div>
  );
}
