import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Wrench } from "lucide-react";
import { formatRupiah } from "../../lib/format";
import { KATEGORI_ACUAN, KONDISI } from "../../lib/types";
import { usePageMeta } from "../../lib/usePageMeta";
import { useAdminSku, useMarkUnitBaik, useUpdateSku } from "../../hooks/api";
import { Card, SectionLabel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { Badge, KondisiBadge, kondisiTone } from "../../components/ui/Badge";
import { EmptyState } from "../../components/shared/EmptyState";

export function AdminSkuDetailPage() {
  const { skuId } = useParams<{ skuId: string }>();
  const id = Number(skuId);
  const query = useAdminSku(Number.isInteger(id) ? id : null);
  const detail = query.data;

  const updateSku = useUpdateSku(Number.isInteger(id) ? id : 0);
  const markBaik = useMarkUnitBaik();

  const [hargaSewa, setHargaSewa] = useState("0");
  const [denda, setDenda] = useState("0");
  const [depositNormal, setDepositNormal] = useState("0");
  const [depositBermasalah, setDepositBermasalah] = useState("0");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; msg: string } | null>(null);

  usePageMeta(detail ? `${detail.kode} - Inventaris` : "Inventaris", true);

  useEffect(() => {
    if (!detail) return;
    setHargaSewa(String(detail.hargaSewaPerHari));
    setDenda(String(detail.tarifDendaHarian));
    setDepositNormal(String(detail.depositNormal));
    setDepositBermasalah(String(detail.depositBermasalah));
  }, [detail]);

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-card border border-line bg-panel py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Memuat SKU.
      </div>
    );
  }

  if (query.isError || !detail) {
    return (
      <EmptyState
        icon={Wrench}
        title="SKU tidak ditemukan"
        description="Pilih SKU lain dari daftar inventaris."
        action={
          <Link
            to="/admin/inventaris"
            className="inline-flex h-11 items-center rounded-control border border-line px-4 text-sm font-medium text-ink hover:bg-moss/[0.06]"
          >
            Kembali ke inventaris
          </Link>
        }
      />
    );
  }

  const jumlahKondisi: Record<string, number> = {};
  for (const kondisi of KONDISI) jumlahKondisi[kondisi] = 0;
  for (const unit of detail.units) jumlahKondisi[unit.kondisi] += 1;

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    try {
      await updateSku.mutateAsync({
        hargaSewaPerHari: Math.max(0, Number(hargaSewa) || 0),
        tarifDendaHarian: Math.max(0, Number(denda) || 0),
        depositNormal: Math.max(0, Number(depositNormal) || 0),
        depositBermasalah: Math.max(0, Number(depositBermasalah) || 0),
      });
      setNotice({ tone: "ok", msg: "Tarif SKU diperbarui." });
    } catch (error) {
      setNotice({
        tone: "error",
        msg: error instanceof Error ? error.message : "Tarif gagal diperbarui.",
      });
    }
  };

  const handleMarkBaik = async (unitId: number) => {
    setNotice(null);
    try {
      await markBaik.mutateAsync(unitId);
      setNotice({ tone: "ok", msg: "Unit ditandai Baik dan kembali ke stok siap sewa." });
    } catch (error) {
      setNotice({
        tone: "error",
        msg: error instanceof Error ? error.message : "Unit tidak dapat diubah.",
      });
    }
  };

  return (
    <div>
      <Link
        to="/admin/inventaris"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke inventaris
      </Link>

      <div className="mt-4">
        <SectionLabel>Detail SKU</SectionLabel>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {detail.nama}
        </h1>
        <p className="mt-1 text-sm text-muted tabular">
          {detail.kode} · {detail.kategori}
        </p>
      </div>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={
            notice.tone === "error"
              ? "mt-4 rounded-card border border-coral/30 bg-coral/[0.08] px-4 py-3 text-sm text-coraltext"
              : "mt-4 rounded-card border border-emerald/30 bg-emerald/[0.08] px-4 py-3 text-sm text-emerald"
          }
        >
          {notice.msg}
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink">Tarif dan deposit</h2>
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <Field label="Harga sewa per hari" htmlFor="tarif-sewa">
              <Input
                id="tarif-sewa"
                type="number"
                min={0}
                inputMode="numeric"
                value={hargaSewa}
                onChange={(e) => setHargaSewa(e.target.value)}
              />
            </Field>
            <Field label="Tarif denda per hari" htmlFor="tarif-denda">
              <Input
                id="tarif-denda"
                type="number"
                min={0}
                inputMode="numeric"
                value={denda}
                onChange={(e) => setDenda(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Deposit normal" htmlFor="deposit-normal">
                <Input
                  id="deposit-normal"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={depositNormal}
                  onChange={(e) => setDepositNormal(e.target.value)}
                />
              </Field>
              <Field label="Deposit bermasalah" htmlFor="deposit-bermasalah">
                <Input
                  id="deposit-bermasalah"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={depositBermasalah}
                  onChange={(e) => setDepositBermasalah(e.target.value)}
                />
              </Field>
            </div>
            <div className="rounded-control border border-line bg-charcoal/50 px-3 py-2 text-xs text-muted tabular">
              Sewa {formatRupiah(Number(hargaSewa) || 0)}/hari · Denda{" "}
              {formatRupiah(Number(denda) || 0)}/hari
            </div>
            <Button type="submit" loading={updateSku.isPending}>
              Simpan tarif
            </Button>
          </form>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink">Acuan biaya</h2>
          <p className="mt-1 text-sm text-muted">
            Dipakai saat inspeksi untuk menghitung biaya kerusakan per unit.
          </p>
          {detail.acuan.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Belum ada acuan biaya"
                description="Acuan biaya untuk SKU ini belum diisi."
                className="py-8"
              />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {KATEGORI_ACUAN.map((kategori) => {
                const items = detail.acuan.filter((a) => a.kategori === kategori);
                if (items.length === 0) return null;
                return (
                  <div key={kategori}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{kategori}</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {items.map((acuan) => (
                        <li
                          key={acuan.id}
                          className="flex items-center justify-between gap-3 rounded-control border border-line bg-charcoal/40 px-3 py-2 text-sm"
                        >
                          <span className="text-ink">{acuan.namaKerusakan}</span>
                          <span className="font-semibold text-ink tabular">{formatRupiah(acuan.biaya)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink">Unit ({detail.units.length})</h2>
          <div className="flex flex-wrap gap-1.5">
            {KONDISI.map((kondisi) => (
              <Badge key={kondisi} tone={kondisiTone(kondisi)}>
                {kondisi}: {jumlahKondisi[kondisi]}
              </Badge>
            ))}
          </div>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {detail.units.map((unit) => (
            <li
              key={unit.id}
              className="flex items-center justify-between gap-3 rounded-control border border-line bg-charcoal/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink tabular">{unit.kodeUnit}</p>
                <div className="mt-1">
                  <KondisiBadge kondisi={unit.kondisi} />
                </div>
              </div>
              {unit.kondisi === "Baik" ? (
                <span className="text-xs text-emerald">Layak sewa</span>
              ) : unit.kondisi === "Hilang" ? (
                <span className="text-xs text-muted">Tidak dapat dipulihkan</span>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleMarkBaik(unit.id)}
                  loading={markBaik.isPending}
                >
                  Tandai Baik
                </Button>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Unit berstatus Hilang tidak dapat ditandai Baik. Unit yang ditandai Baik kembali masuk stok siap sewa.
        </p>
      </Card>
    </div>
  );
}
