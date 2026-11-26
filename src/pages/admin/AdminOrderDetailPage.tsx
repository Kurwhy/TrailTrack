import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  Info,
  Loader2,
  PackageCheck,
  X,
} from "lucide-react";
import {
  formatRupiah,
  formatTanggalLengkap,
  formatTanggalWaktu,
  maskNomorHp,
} from "../../lib/format";
import { usePageMeta } from "../../lib/usePageMeta";
import {
  useAdminPesanan,
  useApproveOrder,
  useCompleteOrder,
  usePickedUpOrder,
  useRejectOrder,
  useReturnOrder,
  useSinkronPembayaran,
} from "../../hooks/api";
import { Card, SectionLabel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import {
  Badge,
  KondisiBadge,
  StatusPenyewaBadge,
  StatusPesananBadge,
} from "../../components/ui/Badge";
import { EmptyState } from "../../components/shared/EmptyState";
import {
  InspectionModal,
  type InspectionEntry,
} from "../../components/admin/InspectionModal";

function BillLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <AnimatedNumber value={value} format={formatRupiah} className="font-semibold text-ink" />
    </div>
  );
}

export function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const query = useAdminPesanan(Number.isInteger(orderId) ? orderId : null);
  const detail = query.data;

  const approve = useApproveOrder();
  const reject = useRejectOrder();
  const pickedUp = usePickedUpOrder();
  const returnOrder = useReturnOrder();
  const complete = useCompleteOrder();
  const sinkron = useSinkronPembayaran(detail?.kode ?? "");

  usePageMeta(
    detail ? `${detail.kode} - Panel Staf TrailTrack` : "Pesanan - Panel Staf",
    true,
  );

  const [notice, setNotice] = useState<{ tone: "ok" | "error"; msg: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"setujui" | "tolak" | null>(null);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<number[]>([]);

  const unitSkuMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const u of detail?.availableUnits ?? []) map.set(u.id, u.skuId);
    return map;
  }, [detail?.availableUnits]);

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-card border border-line bg-panel py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Memuat pesanan.
      </div>
    );
  }

  if (query.isError || !detail) {
    return (
      <EmptyState
        icon={PackageCheck}
        title="Pesanan tidak ditemukan"
        description="Kode pesanan tidak cocok. Kembali ke daftar pesanan untuk memilih pesanan lain."
        action={
          <Link
            to="/admin/pesanan"
            className="inline-flex h-11 items-center rounded-control border border-line px-4 text-sm font-medium text-ink hover:bg-moss/[0.06]"
          >
            Kembali ke daftar pesanan
          </Link>
        }
      />
    );
  }

  const totalQty = detail.items.reduce((sum, item) => sum + item.qty, 0);
  const selectedCount = (skuId: number) =>
    selectedUnits.filter((unitId) => unitSkuMap.get(unitId) === skuId).length;
  const pickedUpValid =
    selectedUnits.length === totalQty &&
    detail.items.every((item) => selectedCount(item.skuId) === item.qty);
  const selisih = detail.tagihan.selisihAkhir;
  const busy =
    approve.isPending ||
    reject.isPending ||
    pickedUp.isPending ||
    complete.isPending;

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction === "setujui") {
        await approve.mutateAsync({ id: detail.id });
        setNotice({ tone: "ok", msg: "Pesanan disetujui. Status berubah menjadi Menunggu Pembayaran." });
      } else {
        await reject.mutateAsync({ id: detail.id });
        setNotice({ tone: "ok", msg: "Pesanan ditolak. Kuota tanggal dilepas untuk pesanan lain." });
      }
      setConfirmAction(null);
    } catch (error) {
      setNotice({
        tone: "error",
        msg: error instanceof Error ? error.message : "Aksi gagal.",
      });
      setConfirmAction(null);
    }
  };

  const handlePickedUp = async () => {
    try {
      await pickedUp.mutateAsync({ id: detail.id, unitIds: selectedUnits });
      setSelectedUnits([]);
      setNotice({ tone: "ok", msg: "Serah terima dicatat. Status pesanan menjadi Sedang Disewa." });
    } catch (error) {
      setNotice({
        tone: "error",
        msg: error instanceof Error ? error.message : "Picked Up gagal.",
      });
    }
  };

  const handleInspectionConfirm = async (
    waktuKembali: Date,
    entries: InspectionEntry[],
  ): Promise<string | null> => {
    try {
      await returnOrder.mutateAsync({
        id: detail.id,
        payload: {
          dikembalikanAt: waktuKembali.toISOString(),
          inspeksi: entries,
        },
      });
      setInspectionOpen(false);
      setNotice({
        tone: "ok",
        msg: "Pengembalian dan inspeksi tersimpan. Unit rusak ditahan dari stok siap sewa.",
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Inspeksi gagal disimpan.";
    }
  };

  const handleComplete = async () => {
    try {
      await complete.mutateAsync({ id: detail.id });
      setNotice({ tone: "ok", msg: "Pesanan diselesaikan." });
    } catch (error) {
      setNotice({
        tone: "error",
        msg: error instanceof Error ? error.message : "Pesanan gagal diselesaikan.",
      });
    }
  };

  const handleCekStatus = async () => {
    try {
      const hasil = await sinkron.mutateAsync();
      setNotice({
        tone: "ok",
        msg:
          hasil.orderStatus === "Selesai"
            ? "Pembayaran terverifikasi. Pesanan selesai."
            : "Status pembayaran diperiksa. Pelunasan belum diterima.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        msg: error instanceof Error ? error.message : "Status pembayaran gagal diperiksa.",
      });
    }
  };

  return (
    <div>
      <Link
        to="/admin/pesanan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke daftar pesanan
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel>Panel staf</SectionLabel>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink tabular sm:text-3xl">
            {detail.kode}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {detail.penyewa?.nama} · {detail.penyewa ? maskNomorHp(detail.penyewa.nomorHp) : "-"}
          </p>
        </div>
        <StatusPesananBadge status={detail.status} telat={detail.telat} />
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

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">Ringkasan pesanan</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted">Tanggal ambil</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">
                  {formatTanggalLengkap(detail.tanggalAmbil)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Tanggal kembali</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">
                  {formatTanggalLengkap(detail.tanggalKembali)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Durasi sewa</p>
                <p className="mt-0.5 text-sm font-semibold text-gold-300 tabular">{detail.hariSewa} hari</p>
              </div>
              <div>
                <p className="text-xs text-muted">Jumlah unit</p>
                <p className="mt-0.5 text-sm font-semibold text-ink tabular">{totalQty} unit</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-line pt-4">
              {detail.items.map((item) => (
                <div key={item.skuId} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-ink">{item.nama}</span>
                  <span className="font-semibold tabular text-ink">{item.qty} unit</span>
                </div>
              ))}
            </div>

            {(detail.pickedUpAt || detail.dikembalikanAt) && (
              <div className="mt-4 space-y-1 rounded-control border border-line bg-charcoal/50 px-3 py-2 text-xs text-muted">
                {detail.pickedUpAt && <p>Diambil: {formatTanggalWaktu(detail.pickedUpAt)}</p>}
                {detail.dikembalikanAt && <p>Dikembalikan: {formatTanggalWaktu(detail.dikembalikanAt)}</p>}
              </div>
            )}
          </Card>

          {detail.status === "Menunggu Persetujuan" && (
            <Card className="border-amber/30 p-5 sm:p-6">
              <Badge tone="amber" pulse>
                Menunggu Persetujuan
              </Badge>
              <h2 className="mt-3 text-base font-bold text-ink">Persetujuan penyewa bermasalah</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Penyewa tercatat Bermasalah. Setujui untuk lanjut ke pembayaran, atau tolak
                untuk melepas kuota tanggal.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setConfirmAction("setujui")} disabled={busy}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Setujui
                </Button>
                <Button variant="danger" onClick={() => setConfirmAction("tolak")} disabled={busy}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Tolak
                </Button>
              </div>
            </Card>
          )}

          {detail.status === "Terkonfirmasi" && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-bold text-ink">Serah terima alat</h2>
              <p className="mt-1 text-sm text-muted">
                Pilih kode unit yang benar-benar dibawa penyewa. Jumlah harus tepat untuk setiap alat.
              </p>
              <div className="mt-4 space-y-4">
                {detail.items.map((item) => {
                  const tersedia = detail.availableUnits.filter((u) => u.skuId === item.skuId);
                  const terpilih = selectedCount(item.skuId);
                  return (
                    <div key={item.skuId}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">{item.nama}</p>
                        <Badge tone={terpilih === item.qty ? "emerald" : "neutral"}>
                          {terpilih} / {item.qty} unit
                        </Badge>
                      </div>
                      {tersedia.length === 0 ? (
                        <p className="mt-2 rounded-control border border-amber/30 bg-amber/[0.06] px-3 py-2 text-xs text-amber">
                          Tidak ada unit Baik yang tersedia untuk SKU ini.
                        </p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {tersedia.map((unit) => {
                            const selected = selectedUnits.includes(unit.id);
                            const penuh = terpilih >= item.qty && !selected;
                            return (
                              <button
                                key={unit.id}
                                type="button"
                                aria-pressed={selected}
                                disabled={penuh}
                                onClick={() =>
                                  setSelectedUnits((prev) =>
                                    selected ? prev.filter((u) => u !== unit.id) : [...prev, unit.id],
                                  )
                                }
                                className={
                                  selected
                                    ? "min-h-[44px] rounded-control border border-gold-500 bg-gold-500/[0.12] px-3 text-xs font-semibold text-gold-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                                    : "min-h-[44px] rounded-control border border-line px-3 text-xs font-medium text-muted transition-colors hover:bg-moss/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-40"
                                }
                              >
                                {unit.kodeUnit}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button
                className="mt-4 w-full sm:w-auto"
                onClick={() => void handlePickedUp()}
                disabled={!pickedUpValid || busy}
                loading={pickedUp.isPending}
              >
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
                Tandai Picked Up
              </Button>
            </Card>
          )}

          {detail.status === "Sedang Disewa" && !detail.dikembalikanAt && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-bold text-ink">Pengembalian alat</h2>
              <p className="mt-1 text-sm text-muted">
                Catat waktu kembali dan periksa kondisi setiap unit. Unit yang tidak Baik
                langsung ditahan dari kalender.
              </p>
              {detail.telat && (
                <p className="mt-3 flex items-start gap-2 rounded-control border border-coral/30 bg-coral/[0.06] px-3 py-2 text-xs text-coraltext">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Pesanan melewati batas pengembalian. Denda akan dihitung saat pengembalian disimpan.
                </p>
              )}
              <Button className="mt-4" onClick={() => setInspectionOpen(true)}>
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                Catat Pengembalian
              </Button>
            </Card>
          )}

          {detail.status === "Sedang Disewa" && detail.dikembalikanAt && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-bold text-ink">Penyelesaian pesanan</h2>
              {selisih > 0 ? (
                <>
                  <p className="mt-1 text-sm text-muted">
                    Tagihan akhir melebihi deposit. Minta pelunasan{" "}
                    {formatRupiah(selisih)} melalui Midtrans. Status diperbarui otomatis
                    setelah penyewa membayar.
                  </p>
                  <Button
                    className="mt-4"
                    variant="secondary"
                    onClick={() => void handleCekStatus()}
                    loading={sinkron.isPending}
                  >
                    Periksa Status Pembayaran
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-muted">
                    Deposit mencukupi tagihan akhir.
                    {selisih < 0 ? ` Kembalikan ${formatRupiah(Math.abs(selisih))} ke penyewa.` : ""}
                  </p>
                  <Button className="mt-4" onClick={() => void handleComplete()} loading={complete.isPending}>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Selesaikan Pesanan
                  </Button>
                </>
              )}
            </Card>
          )}

          {detail.status === "Selesai" && (
            <Card className="border-emerald/30 p-5 sm:p-6">
              <h2 className="text-base font-bold text-ink">Pesanan selesai</h2>
              <p className="mt-1 text-sm text-muted">
                {selisih < 0
                  ? `Kembalian ${formatRupiah(Math.abs(selisih))} sudah dicatat admin.`
                  : "Seluruh tagihan sudah lunas dan alat sudah diperiksa."}
              </p>
            </Card>
          )}

          {detail.status === "Ditolak" && (
            <Card className="border-coral/30 p-5 sm:p-6">
              <h2 className="text-base font-bold text-ink">Pesanan ditolak</h2>
              <p className="mt-1 text-sm text-muted">
                Kuota tanggal dilepas. Penyewa dapat menghubungi basecamp untuk informasi lanjutan.
              </p>
            </Card>
          )}

          {detail.inspeksi.length > 0 && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-bold text-ink">Hasil inspeksi</h2>
              <p className="mt-1 text-sm text-muted">
                {detail.inspeksi.length} unit diperiksa saat pengembalian.
              </p>
              <ul className="mt-4 space-y-2">
                {detail.inspeksi.map((item) => (
                  <li
                    key={item.pesananUnitId}
                    className="rounded-control border border-line bg-charcoal/40 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink tabular">
                        {item.kodeUnit ?? "-"}
                      </span>
                      <div className="flex items-center gap-2">
                        <KondisiBadge kondisi={item.kondisi} />
                        <span className="text-xs font-semibold text-ink tabular">
                          {formatRupiah(item.biayaKerusakan)}
                        </span>
                      </div>
                    </div>
                    {item.poin.length > 0 && (
                      <p className="mt-1 text-xs text-muted">
                        {item.poin.map((p) => p.namaKerusakan).join(", ")}
                      </p>
                    )}
                    {item.catatan && <p className="mt-1 text-xs text-muted">{item.catatan}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">Rincian tagihan</h2>
            <div className="mt-4 space-y-2">
              <BillLine label="Total sewa" value={detail.tagihan.totalSewa} />
              <BillLine label="DP" value={detail.dp} />
              <div className="my-2 border-t border-line" />
              <BillLine label="Sisa Sewa" value={detail.tagihan.sisaSewa} />
              <BillLine label="Denda Keterlambatan" value={detail.tagihan.denda} />
              <BillLine label="Biaya Kerusakan" value={detail.tagihan.kerusakan} />
              <BillLine label="Deposit Dibayar" value={detail.tagihan.deposit} />
              <div className="my-2 border-t border-line" />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-ink">Selisih Akhir</span>
                <AnimatedNumber
                  value={selisih}
                  format={formatRupiah}
                  className={selisih > 0 ? "text-lg font-bold text-coraltext" : "text-lg font-bold text-emerald"}
                />
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">Penyewa</h2>
            <p className="mt-2 text-sm font-semibold text-ink">{detail.penyewa?.nama}</p>
            <p className="text-xs text-muted tabular">
              {detail.penyewa ? maskNomorHp(detail.penyewa.nomorHp) : "-"}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {detail.penyewa && <StatusPenyewaBadge status={detail.penyewa.status} />}
              <span className="text-xs text-muted tabular">
                {detail.penyewa?.jumlahTelat ?? 0} telat · {detail.penyewa?.jumlahRusak ?? 0} rusak
              </span>
            </div>
            <p className="mt-3 rounded-control border border-line bg-charcoal/50 px-3 py-2 text-xs text-muted">
              Status deposit dipakai saat pesan: {detail.statusPenyewaSaatPesan}.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === "tolak" ? "Tolak pesanan?" : "Setujui pesanan?"}
        description={
          confirmAction === "tolak"
            ? "Kuota tanggal akan dilepas dan status pesanan menjadi Ditolak."
            : "Status pesanan berubah menjadi Menunggu Pembayaran. Penyewa dapat membayar DP dan deposit."
        }
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              Batal
            </Button>
            <Button
              variant={confirmAction === "tolak" ? "danger" : "primary"}
              onClick={() => void handleConfirm()}
              loading={approve.isPending || reject.isPending}
            >
              {confirmAction === "tolak" ? "Tolak pesanan" : "Setujui pesanan"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">Pastikan keputusan ini sesuai hasil pengecekan basecamp.</p>
      </Modal>

      <InspectionModal
        open={inspectionOpen}
        onClose={() => setInspectionOpen(false)}
        order={detail}
        onConfirm={handleInspectionConfirm}
      />
    </div>
  );
}
