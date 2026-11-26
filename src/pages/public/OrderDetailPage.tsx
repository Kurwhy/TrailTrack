import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { config } from "../../lib/config";
import {
  formatRupiah,
  formatTanggalLengkap,
  formatTanggalWaktu,
} from "../../lib/format";
import { usePageMeta } from "../../lib/usePageMeta";
import {
  usePublicPesanan,
  useRequestPayment,
  useSinkronPembayaran,
} from "../../hooks/api";
import { loadSnap } from "../../lib/snap";
import { Card, SectionLabel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { StatusPesananBadge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/shared/EmptyState";

function BillLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <AnimatedNumber value={value} format={formatRupiah} className="font-semibold text-ink" />
    </div>
  );
}

export function OrderDetailPage() {
  const { kode } = useParams<{ kode: string }>();
  const query = usePublicPesanan(kode);
  const pesanan = query.data;
  const requestPayment = useRequestPayment(kode ?? "");
  const sinkron = useSinkronPembayaran(kode ?? "");
  const [payOpen, setPayOpen] = useState(false);
  const [payJenis, setPayJenis] = useState<"awal" | "pelunasan">("awal");
  const [paid, setPaid] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);

  usePageMeta(
    pesanan ? `Pesanan ${pesanan.kode} - TrailTrack` : "Pesanan - TrailTrack",
    true,
  );

  if (query.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="sr-only">Detail pesanan</h1>
        <div className="flex items-center justify-center gap-2 rounded-card border border-line bg-panel py-16 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Memuat detail pesanan.
        </div>
      </div>
    );
  }

  if (query.isError || !pesanan) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="sr-only">Detail pesanan</h1>
        <EmptyState
          icon={PackageCheck}
          title="Pesanan tidak ditemukan"
          description="Periksa kembali kode pesanan atau cek riwayat memakai nomor HP Anda."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                to="/"
                className="inline-flex h-11 items-center rounded-control border border-line px-4 text-sm font-medium text-ink hover:bg-moss/[0.06]"
              >
                Kembali ke katalog
              </Link>
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="inline-flex h-11 items-center rounded-control border border-line px-4 text-sm font-medium text-ink hover:bg-moss/[0.06]"
              >
                Coba lagi
              </button>
            </div>
          }
        />
      </div>
    );
  }

  const sudahKembali = Boolean(pesanan.dikembalikanAt);
  const butuhPelunasan =
    sudahKembali && pesanan.tagihan.selisihAkhir > 0 && pesanan.status !== "Selesai";

  const bukaPembayaran = (jenis: "awal" | "pelunasan") => {
    setPayError(null);
    setPayJenis(jenis);
    setPayOpen(true);
  };

  const prosesSelesai = async (
    jenis: "awal" | "pelunasan",
    pending = false,
  ) => {
    setPayError(null);
    let status = pesanan.status;
    try {
      const hasil = await sinkron.mutateAsync();
      status = hasil.orderStatus;
    } catch {
      /* webhook mungkin belum tiba; refetch di bawah tetap dilakukan */
    }
    await query.refetch();
    if (pending) {
      setPaid("Pembayaran sedang diproses. Status akan diperbarui otomatis.");
    } else if (
      status === "Terkonfirmasi" ||
      status === "Sedang Disewa" ||
      status === "Selesai"
    ) {
      setPaid(
        jenis === "awal"
          ? "Pembayaran DP dan deposit berhasil. Pesanan Anda terkonfirmasi."
          : "Pelunasan berhasil. Pesanan Anda selesai.",
      );
    } else {
      setPaid("Pembayaran diterima. Muat ulang halaman bila status belum berubah.");
    }
    setPayOpen(false);
  };

  const mulaiPembayaran = async () => {
    setPayError(null);
    setPaymentBusy(true);
    try {
      await loadSnap();
      const hasil = await requestPayment.mutateAsync({
        jenis: payJenis === "awal" ? "DP" : "Pelunasan",
      });
      setPaymentBusy(false);
      setPayOpen(false);
      const snap = window.snap;
      if (!snap) {
        throw new Error("Halaman pembayaran Midtrans tidak tersedia.");
      }
      snap.pay(hasil.snapToken, {
        onSuccess: () => void prosesSelesai(payJenis, false),
        onPending: () => void prosesSelesai(payJenis, true),
        onError: () => {
          setPayError("Pembayaran gagal di Midtrans. Silakan coba lagi.");
          setPayOpen(true);
        },
      });
    } catch (error) {
      setPaymentBusy(false);
      setPayOpen(true);
      setPayError(
        error instanceof Error ? error.message : "Pembayaran tidak dapat dimulai.",
      );
    }
  };

  const nominalBayar =
    payJenis === "awal" ? pesanan.dp + pesanan.deposit : pesanan.tagihan.selisihAkhir;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke katalog
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionLabel>Detail pesanan</SectionLabel>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {pesanan.kode}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {pesanan.penyewa?.nama} · {pesanan.penyewa?.nomorHpMasked ?? "-"}
          </p>
        </div>
        <StatusPesananBadge status={pesanan.status} telat={pesanan.telat} />
      </div>

      {paid && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2 rounded-card border border-emerald/30 bg-emerald/[0.08] px-4 py-3 text-sm text-emerald"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{paid}</span>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">Jadwal dan alat</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Tanggal ambil</dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink">
                  {formatTanggalLengkap(pesanan.tanggalAmbil)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Tanggal kembali</dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink">
                  {formatTanggalLengkap(pesanan.tanggalKembali)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Durasi sewa</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gold-300 tabular">
                  {pesanan.hariSewa} hari
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Batas pengembalian</dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink tabular">
                  Pukul {config.jamBatasKembali}
                </dd>
              </div>
            </dl>

            <div className="mt-5 space-y-2 border-t border-line pt-4">
              {pesanan.items.map((item) => (
                <div key={item.skuId} className="flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium text-ink">{item.nama}</p>
                    <p className="text-xs text-muted tabular">
                      {item.qty} unit x {formatRupiah(item.hargaSewaPerHari)} x {pesanan.hariSewa} hari
                    </p>
                  </div>
                  <span className="font-semibold text-ink tabular">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {sudahKembali && (
              <p className="mt-4 rounded-control border border-line bg-charcoal/50 px-3 py-2 text-xs text-muted">
                Dikembalikan pada {formatTanggalWaktu(pesanan.dikembalikanAt)}. Inspeksi
                tercatat {pesanan.inspeksi.length} unit.
              </p>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">Rincian tagihan</h2>
            <div className="mt-4 space-y-2">
              <BillLine label="Total sewa" value={pesanan.tagihan.totalSewa} />
              <BillLine label="DP" value={pesanan.dp} />
              <div className="my-2 border-t border-line" />
              <BillLine label="Sisa Sewa" value={pesanan.tagihan.sisaSewa} />
              <BillLine label="Denda Keterlambatan" value={pesanan.tagihan.denda} />
              <BillLine label="Biaya Kerusakan" value={pesanan.tagihan.kerusakan} />
              <BillLine label="Deposit Dibayar" value={pesanan.tagihan.deposit} />
              <div className="my-2 border-t border-line" />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-ink">Selisih Akhir</span>
                <AnimatedNumber
                  value={pesanan.tagihan.selisihAkhir}
                  format={formatRupiah}
                  className={
                    pesanan.tagihan.selisihAkhir > 0
                      ? "text-lg font-bold text-coraltext"
                      : "text-lg font-bold text-emerald"
                  }
                />
              </div>
              {pesanan.tagihan.selisihAkhir <= 0 && sudahKembali && (
                <p className="text-xs text-muted">
                  Deposit mencukupi. Kembalian{" "}
                  {formatRupiah(Math.abs(pesanan.tagihan.selisihAkhir))} diselesaikan admin
                  di basecamp.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">Pembayaran</h2>
            <p className="mt-1 text-sm text-muted">
              DP {config.dpPersen}% dari total sewa ditambah deposit.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">DP</span>
                <span className="font-semibold tabular text-ink">{formatRupiah(pesanan.dp)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Deposit</span>
                <span className="font-semibold tabular text-ink">{formatRupiah(pesanan.deposit)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="font-semibold text-ink">Bayar awal</span>
                <span className="font-bold tabular text-gold-300">
                  {formatRupiah(pesanan.dp + pesanan.deposit)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              {pesanan.status === "Menunggu Pembayaran" && (
                <Button className="w-full" onClick={() => bukaPembayaran("awal")}>
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Bayar DP dan deposit
                </Button>
              )}
              {pesanan.status === "Menunggu Persetujuan" && (
                <p className="rounded-control border border-amber/30 bg-amber/[0.06] px-3 py-2 text-xs text-amber">
                  Menunggu persetujuan admin. Pembayaran dibuka setelah pesanan disetujui.
                </p>
              )}
              {pesanan.status === "Terkonfirmasi" && (
                <p className="flex items-start gap-2 rounded-control border border-emerald/30 bg-emerald/[0.06] px-3 py-2 text-xs text-emerald">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Pesanan Anda terkonfirmasi. Silakan ambil alat di basecamp
                  sesuai jadwal.
                </p>
              )}
              {butuhPelunasan && (
                <Button className="w-full" onClick={() => bukaPembayaran("pelunasan")}>
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Bayar Pelunasan {formatRupiah(pesanan.tagihan.selisihAkhir)}
                </Button>
              )}
              {pesanan.status === "Sedang Disewa" && sudahKembali && pesanan.tagihan.selisihAkhir <= 0 && (
                <p className="rounded-control border border-line bg-charcoal/50 px-3 py-2 text-xs text-muted">
                  Alat sudah dikembalikan. Menunggu penyelesaian oleh admin.
                </p>
              )}
              {pesanan.status === "Sedang Disewa" && !sudahKembali && (
                <p className="rounded-control border border-line bg-charcoal/50 px-3 py-2 text-xs text-muted">
                  Alat sedang Anda bawa. Kembalikan paling lambat pukul {config.jamBatasKembali}{" "}
                  pada tanggal kembali.
                </p>
              )}
              {pesanan.status === "Selesai" && (
                <p className="flex items-start gap-2 rounded-control border border-emerald/30 bg-emerald/[0.06] px-3 py-2 text-xs text-emerald">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Pesanan selesai. Terima kasih sudah menyewa di basecamp kami.
                </p>
              )}
              {pesanan.status === "Ditolak" && (
                <p className="rounded-control border border-coral/30 bg-coral/[0.06] px-3 py-2 text-xs text-coraltext">
                  Pesanan ditolak admin. Silakan hubungi basecamp untuk informasi lanjutan.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">Butuh bantuan</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Tunjukkan kode pesanan ini saat mengambil alat di basecamp.
              Untuk cek semua pesanan, buka Cek Riwayat dan masukkan nomor HP Anda.
            </p>
            <Link
              to="/riwayat"
              className="mt-3 inline-flex h-11 items-center rounded-control border border-line px-4 text-sm font-medium text-ink hover:bg-moss/[0.06]"
            >
              Cek Riwayat Sewa
            </Link>
          </Card>
        </div>
      </div>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Pembayaran Midtrans"
        description="Anda akan menyelesaikan pembayaran melalui jendela Midtrans. Status pesanan diperbarui otomatis setelah pembayaran dikonfirmasi."
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setPayOpen(false)}
              disabled={paymentBusy}
            >
              Batal
            </Button>
            <Button onClick={() => void mulaiPembayaran()} loading={paymentBusy}>
              Lanjutkan ke pembayaran
            </Button>
          </div>
        }
      >
        <div className="rounded-card border border-line bg-charcoal/60 p-4 text-center">
          <p className="text-xs text-muted">
            {payJenis === "awal" ? "DP dan deposit" : "Pelunasan"}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-gold-300 tabular">
            {formatRupiah(nominalBayar)}
          </p>
        </div>
        <p className="mt-3 text-xs text-muted">
          Gunakan kartu atau metode pembayaran yang tersedia di Midtrans Sandbox.
        </p>
        {payError && (
          <p role="alert" className="mt-3 text-sm text-coraltext">
            {payError}
          </p>
        )}
      </Modal>
    </div>
  );
}
