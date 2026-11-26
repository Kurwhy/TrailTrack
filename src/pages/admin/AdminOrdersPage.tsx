import { Link } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { formatTanggalPendek } from "../../lib/format";
import { usePageMeta } from "../../lib/usePageMeta";
import { useAdminPesananList } from "../../hooks/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusPesananBadge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/shared/EmptyState";

export function AdminOrdersPage() {
  usePageMeta("Pesanan - Panel Staf TrailTrack", true);
  const query = useAdminPesananList();
  const daftar = query.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Pesanan</h1>
          <p className="mt-1 text-sm text-muted">
            Semua pesanan pelanggan dan admin, terbaru di atas.
          </p>
        </div>
        <Link
          to="/admin/pesanan/baru"
          className="inline-flex h-11 items-center gap-2 rounded-control bg-gold-500 px-4 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Pesanan baru
        </Link>
      </div>

      {query.isLoading ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-card border border-line bg-panel py-16 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Memuat pesanan.
        </div>
      ) : query.isError ? (
        <div className="mt-6">
          <EmptyState
            title="Pesanan tidak dapat dimuat"
            description="Periksa koneksi ke server, lalu coba lagi."
            action={
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Coba lagi
              </Button>
            }
          />
        </div>
      ) : daftar.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Belum ada pesanan"
            description="Pesanan dari pelanggan dan pesanan yang dibuat staf akan tampil di sini."
            action={
              <Link
                to="/admin/pesanan/baru"
                className="inline-flex h-11 items-center rounded-control border border-line px-4 text-sm font-medium text-ink hover:bg-moss/[0.06]"
              >
                Buat pesanan baru
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <Card className="mt-6 hidden overflow-hidden md:block">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Daftar pesanan dengan kode, penyewa, tanggal, dan status
              </caption>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Kode</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Penyewa</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Ambil</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Kembali</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-line/70 last:border-0 hover:bg-moss/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/pesanan/${order.id}`}
                        className="font-semibold text-gold-300 tabular hover:text-gold-200"
                      >
                        {order.kode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">{order.penyewaNama}</td>
                    <td className="px-4 py-3 text-muted tabular">
                      {formatTanggalPendek(order.tanggalAmbil)}
                    </td>
                    <td className="px-4 py-3 text-muted tabular">
                      {formatTanggalPendek(order.tanggalKembali)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPesananBadge status={order.status} telat={order.telat} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ul className="mt-6 space-y-3 md:hidden">
            {daftar.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/admin/pesanan/${order.id}`}
                  className="block rounded-card border border-line bg-panel p-4 hover:border-gold-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gold-300 tabular">{order.kode}</p>
                      <p className="mt-0.5 text-sm text-ink">{order.penyewaNama}</p>
                    </div>
                    <StatusPesananBadge status={order.status} telat={order.telat} />
                  </div>
                  <p className="mt-2 text-xs text-muted tabular">
                    {formatTanggalPendek(order.tanggalAmbil)} sampai{" "}
                    {formatTanggalPendek(order.tanggalKembali)} · {order.jumlahUnit} unit
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
