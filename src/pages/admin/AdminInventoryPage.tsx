import { Link } from "react-router-dom";
import { Boxes, Loader2 } from "lucide-react";
import { formatRupiah } from "../../lib/format";
import { KONDISI } from "../../lib/types";
import { usePageMeta } from "../../lib/usePageMeta";
import { useAdminSkus } from "../../hooks/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/shared/EmptyState";
import { kondisiTone, Badge } from "../../components/ui/Badge";

export function AdminInventoryPage() {
  usePageMeta("Inventaris - Panel Staf TrailTrack", true);
  const query = useAdminSkus();
  const skus = query.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Inventaris</h1>
      <p className="mt-1 text-sm text-muted">
        Jumlah unit per kondisi. Unit yang bukan Baik tidak masuk stok siap sewa.
      </p>

      {query.isLoading ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-card border border-line bg-panel py-16 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Memuat inventaris.
        </div>
      ) : query.isError ? (
        <div className="mt-6">
          <EmptyState
            title="Inventaris tidak dapat dimuat"
            description="Periksa koneksi ke server, lalu coba lagi."
            action={
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Coba lagi
              </Button>
            }
          />
        </div>
      ) : skus.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Boxes}
            title="Belum ada SKU"
            description="Tambahkan SKU terlebih dahulu untuk mulai mengelola inventaris."
          />
        </div>
      ) : (
        <>
          <Card className="mt-6 hidden overflow-hidden md:block">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Daftar SKU dengan jumlah unit per kondisi</caption>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">SKU</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Kategori</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Sewa/hari</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Kondisi unit</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((sku) => (
                  <tr
                    key={sku.id}
                    className="border-b border-line/70 last:border-0 hover:bg-moss/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <Link to={`/admin/inventaris/${sku.id}`} className="block">
                        <span className="block font-semibold text-gold-300 hover:text-gold-200">
                          {sku.kode}
                        </span>
                        <span className="block text-xs text-muted">{sku.nama}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{sku.kategori}</td>
                    <td className="px-4 py-3 text-ink tabular">
                      {formatRupiah(sku.hargaSewaPerHari)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {KONDISI.map((kondisi) => (
                          <Badge key={kondisi} tone={kondisiTone(kondisi)}>
                            {kondisi}: {sku.kondisiCount[kondisi] ?? 0}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ul className="mt-6 space-y-3 md:hidden">
            {skus.map((sku) => (
              <li key={sku.id}>
                <Link
                  to={`/admin/inventaris/${sku.id}`}
                  className="block rounded-card border border-line bg-panel p-4 hover:border-gold-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gold-300 tabular">{sku.kode}</p>
                      <p className="text-sm text-ink">{sku.nama}</p>
                      <p className="text-xs text-muted">{sku.kategori}</p>
                    </div>
                    <span className="text-xs font-semibold text-ink tabular">
                      {formatRupiah(sku.hargaSewaPerHari)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {KONDISI.map((kondisi) => (
                      <Badge key={kondisi} tone={kondisiTone(kondisi)}>
                        {kondisi}: {sku.kondisiCount[kondisi] ?? 0}
                      </Badge>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
