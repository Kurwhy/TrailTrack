import { Loader2, Users } from "lucide-react";
import { maskNomorHp } from "../../lib/format";
import { usePageMeta } from "../../lib/usePageMeta";
import { useAdminPenyewa } from "../../hooks/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusPenyewaBadge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/shared/EmptyState";

export function AdminTenantsPage() {
  usePageMeta("Penyewa - Panel Staf TrailTrack", true);
  const query = useAdminPenyewa();
  const penyewa = query.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Penyewa</h1>
      <p className="mt-1 text-sm text-muted">
        Riwayat keterlambatan dan kerusakan menentukan status penyewa.
      </p>

      {query.isLoading ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-card border border-line bg-panel py-16 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Memuat penyewa.
        </div>
      ) : query.isError ? (
        <div className="mt-6">
          <EmptyState
            title="Penyewa tidak dapat dimuat"
            description="Periksa koneksi ke server, lalu coba lagi."
            action={
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Coba lagi
              </Button>
            }
          />
        </div>
      ) : penyewa.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Users}
            title="Belum ada penyewa"
            description="Data penyewa dibuat otomatis saat pesanan pertama dibuat."
          />
        </div>
      ) : (
        <>
          <Card className="mt-6 hidden overflow-hidden md:block">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Daftar penyewa dengan jumlah keterlambatan, kerusakan, dan status
              </caption>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Nama</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Nomor HP</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Telat</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Rusak</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {penyewa.map((p) => (
                  <tr key={p.id} className="border-b border-line/70 last:border-0 hover:bg-moss/[0.03]">
                    <td className="px-4 py-3 font-medium text-ink">{p.nama}</td>
                    <td className="px-4 py-3 text-muted tabular">{maskNomorHp(p.nomorHp)}</td>
                    <td className="px-4 py-3 text-ink tabular">{p.jumlahTelat}</td>
                    <td className="px-4 py-3 text-ink tabular">{p.jumlahRusak}</td>
                    <td className="px-4 py-3">
                      <StatusPenyewaBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ul className="mt-6 space-y-3 md:hidden">
            {penyewa.map((p) => (
              <li key={p.id} className="rounded-card border border-line bg-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{p.nama}</p>
                    <p className="text-xs text-muted tabular">{maskNomorHp(p.nomorHp)}</p>
                  </div>
                  <StatusPenyewaBadge status={p.status} />
                </div>
                <p className="mt-2 text-xs text-muted tabular">
                  {p.jumlahTelat} telat · {p.jumlahRusak} rusak
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
