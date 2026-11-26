import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { formatRupiah, formatTanggalLengkap } from "../../lib/format";
import { isValidPhone, normalizePhone } from "../../lib/rules";
import { usePageMeta } from "../../lib/usePageMeta";
import { useRiwayat } from "../../hooks/api";
import { Card, SectionLabel } from "../../components/ui/Card";
import { Field, Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { StatusPenyewaBadge, StatusPesananBadge } from "../../components/ui/Badge";
import { EmptyState, InlineError } from "../../components/shared/EmptyState";

export function HistoryPage() {
  usePageMeta("Cek Riwayat Sewa - TrailTrack", true);
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const query = useRiwayat(submitted);
  const data = query.data;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    if (!isValidPhone(phone)) {
      setValidationError("Nomor HP diawali 08 atau +62, 10 sampai 15 digit.");
      setSubmitted(null);
      return;
    }
    const normalized = normalizePhone(phone);
    if (submitted === normalized) {
      void query.refetch();
    } else {
      setSubmitted(normalized);
    }
  };

  const loading = Boolean(submitted) && query.isFetching;
  const errorMessage =
    validationError ??
    (query.isError
      ? query.error instanceof Error
        ? query.error.message
        : "Riwayat tidak dapat dimuat."
      : null);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <SectionLabel>Riwayat sewa</SectionLabel>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Cek riwayat dengan nomor HP.
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Masukkan nomor HP yang Anda pakai saat memesan. Kami menampilkan kode
        pesanan, status, denda, dan biaya kerusakan.
      </p>

      <Card className="mt-6 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Nomor HP" htmlFor="cari-hp" className="flex-1" error={errorMessage ?? undefined}>
            <Input
              id="cari-hp"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              invalid={Boolean(errorMessage)}
              aria-describedby={errorMessage ? "cari-hp-error" : undefined}
            />
          </Field>
          <Button type="submit" size="lg" loading={loading} className="sm:w-auto">
            <Search className="h-4 w-4" aria-hidden="true" />
            Cek riwayat
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted">
          Nomor HP hanya dipakai untuk menampilkan pesanan Anda. Hasil tidak
          menampilkan nomor lengkap.
        </p>
      </Card>

      <div className="mt-6">
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-card border border-line bg-panel py-12 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Mencari pesanan untuk nomor ini.
          </div>
        )}

        {!loading && query.isError && (
          <InlineError>{errorMessage}</InlineError>
        )}

        {!loading && !query.isError && !submitted && (
          <EmptyState
            icon={Search}
            title="Masukkan nomor HP untuk mulai"
            description="Riwayat akan muncul di sini setelah Anda menekan Cek riwayat."
          />
        )}

        {!loading && !query.isError && submitted && data && !data.penyewa && (
          <EmptyState
            icon={Search}
            title="Nomor HP belum tercatat"
            description="Tidak ada pesanan untuk nomor ini. Periksa kembali nomor yang Anda pakai saat memesan."
            action={
              <Link
                to="/"
                className="inline-flex h-11 items-center rounded-control border border-line px-4 text-sm font-medium text-ink hover:bg-moss/[0.06]"
              >
                Kembali ke katalog
              </Link>
            }
          />
        )}

        {!loading && !query.isError && data?.penyewa && (
          <div className="space-y-4">
            <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-semibold text-ink">{data.penyewa.nama}</p>
                <p className="text-xs text-muted tabular">
                  {data.penyewa.nomorHp} · {data.penyewa.jumlahTelat} telat ·{" "}
                  {data.penyewa.jumlahRusak} rusak
                </p>
              </div>
              <StatusPenyewaBadge status={data.penyewa.status} />
            </Card>

            {data.pesanan.length === 0 ? (
              <EmptyState
                title="Belum ada pesanan"
                description="Nomor ini terdaftar, tetapi belum memiliki pesanan."
                action={
                  <Link
                    to="/"
                    className="inline-flex h-11 items-center rounded-control border border-line px-4 text-sm font-medium text-ink hover:bg-moss/[0.06]"
                  >
                    Lihat katalog alat
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {data.pesanan.map((order) => (
                  <li key={order.id}>
                    <Link
                      to={`/pesanan/${order.kode}`}
                      className="block rounded-card border border-line bg-panel p-4 transition-colors hover:border-gold-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-ink tabular">{order.kode}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {formatTanggalLengkap(order.tanggalAmbil)} sampai{" "}
                            {formatTanggalLengkap(order.tanggalKembali)}
                          </p>
                        </div>
                        <StatusPesananBadge status={order.status} telat={order.telat} />
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-muted">Total denda</dt>
                          <dd className="font-semibold text-ink tabular">
                            {formatRupiah(order.totalDenda)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">Biaya kerusakan</dt>
                          <dd className="font-semibold text-ink tabular">
                            {formatRupiah(order.totalKerusakan)}
                          </dd>
                        </div>
                      </dl>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
