import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import { config } from "../../lib/config";
import {
  daysBetweenInclusive,
  formatRupiah,
  formatTanggalLengkap,
  parseIsoDate,
} from "../../lib/format";
import {
  dpFor,
  isValidName,
  isValidPhone,
  normalizePhone,
  simulationDenda,
} from "../../lib/rules";
import type { CreateOrderPayload, KatalogSku } from "../../lib/apiTypes";
import { ApiClientError } from "../../lib/api";
import {
  useCreatePublicPesanan,
  useKetersediaanMonth,
  useKetersediaanRange,
  useRiwayat,
} from "../../hooks/api";
import { cn } from "../../lib/utils";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import { Field, Input } from "../ui/Input";
import { InlineError } from "../shared/EmptyState";
import { AvailabilityCalendar } from "./AvailabilityCalendar";

interface BookingDrawerProps {
  open: boolean;
  onClose: () => void;
  sku: KatalogSku;
  initialAmbil: string | null;
  initialKembali: string | null;
}

function BillRow({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={emphasis ? "font-semibold text-ink" : "text-muted"}>{label}</span>
      <AnimatedNumber
        value={value}
        format={formatRupiah}
        className={cn("font-semibold", emphasis ? "text-gold-300" : "text-ink")}
      />
    </div>
  );
}

export function BookingDrawer({
  open,
  onClose,
  sku,
  initialAmbil,
  initialKembali,
}: BookingDrawerProps) {
  const navigate = useNavigate();
  const createMutation = useCreatePublicPesanan();

  const [view, setView] = useState(() => {
    const base = initialAmbil ? parseIsoDate(initialAmbil) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [ambil, setAmbil] = useState<string | null>(initialAmbil);
  const [kembali, setKembali] = useState<string | null>(initialKembali);
  const [qty, setQty] = useState(1);
  const [nama, setNama] = useState("");
  const [nomorHp, setNomorHp] = useState("");
  const [jamTerlambat, setJamTerlambat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ nama?: string; nomorHp?: string }>({});
  const [phoneLookup, setPhoneLookup] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const base = initialAmbil ? parseIsoDate(initialAmbil) : new Date();
    setView({ year: base.getFullYear(), month: base.getMonth() });
    setAmbil(initialAmbil);
    setKembali(initialKembali);
    setQty(1);
    setNama("");
    setNomorHp("");
    setJamTerlambat("");
    setError(null);
    setFieldErrors({});
    setPhoneLookup(null);
  }, [open, sku.id, initialAmbil, initialKembali]);

  useEffect(() => {
    if (!open) return;
    if (!isValidPhone(nomorHp)) {
      setPhoneLookup(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setPhoneLookup(normalizePhone(nomorHp));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [nomorHp, open]);

  const bulan = `${view.year}-${String(view.month + 1).padStart(2, "0")}`;
  const monthQuery = useKetersediaanMonth(sku.id, bulan);
  const rangeReady = Boolean(ambil && kembali && kembali >= ambil);
  const rangeQuery = useKetersediaanRange(sku.id, ambil ?? "", kembali ?? "");
  const riwayatQuery = useRiwayat(phoneLookup);

  const hariSewa = rangeReady ? daysBetweenInclusive(ambil!, kembali!) : 0;
  const maxSisa = rangeReady
    ? (rangeQuery.data?.minSisa ?? sku.unitBaik)
    : sku.unitBaik;

  useEffect(() => {
    if (!rangeReady) return;
    setQty((current) => Math.min(Math.max(1, current), Math.max(1, maxSisa)));
  }, [rangeReady, maxSisa]);

  const statusPenyewa = riwayatQuery.data?.penyewa?.status ?? "Normal";
  const depositPerUnit =
    statusPenyewa === "Bermasalah" ? sku.depositBermasalah : sku.depositNormal;
  const totalSewa = sku.hargaSewaPerHari * qty * hariSewa;
  const dp = dpFor(totalSewa);
  const deposit = depositPerUnit * qty;
  const totalAwal = dp + deposit;
  const tarifDenda = sku.tarifDendaHarian * qty;
  const sim = useMemo(
    () => simulationDenda(Number(jamTerlambat) || 0, tarifDenda),
    [jamTerlambat, tarifDenda],
  );

  const shiftMonth = (delta: number) => {
    setView((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const nextErrors: { nama?: string; nomorHp?: string } = {};
    if (!isValidName(nama)) nextErrors.nama = "Nama lengkap 3 sampai 120 karakter.";
    if (!isValidPhone(nomorHp)) {
      nextErrors.nomorHp = "Nomor HP diawali 08 atau +62, 10 sampai 15 digit.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!rangeReady) {
      setError("Pilih tanggal ambil dan tanggal kembali pada kalender.");
      return;
    }
    if (maxSisa < 1) {
      setError("Stok tidak tersedia pada rentang tanggal yang dipilih.");
      return;
    }

    const payload: CreateOrderPayload = {
      nama,
      nomorHp,
      tanggalAmbil: ambil!,
      tanggalKembali: kembali!,
      items: [{ skuId: sku.id, qty }],
    };
    try {
      const hasil = await createMutation.mutateAsync(payload);
      onClose();
      navigate(`/pesanan/${hasil.kode}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        const details = err.details as
          | { konflik?: Array<{ tanggalPenuh?: Array<{ date: string }> }> }
          | undefined;
        const penuh = details?.konflik?.[0]?.tanggalPenuh
          ?.map((d) => d.date)
          .join(", ");
        setError(
          penuh
            ? `${err.message} Tanggal penuh: ${penuh}.`
            : err.message,
        );
      } else {
        setError("Pesanan tidak dapat dibuat.");
      }
    }
  };

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {rangeReady ? (
          <>
            <p className="text-xs text-muted">Total bayar awal</p>
            <AnimatedNumber
              value={totalAwal}
              format={formatRupiah}
              className="text-xl font-bold text-gold-300"
            />
            <p className="text-[11px] text-muted">DP {formatRupiah(dp)} + deposit</p>
          </>
        ) : (
          <p className="text-sm text-muted">
            Pilih tanggal ambil dan kembali pada kalender.
          </p>
        )}
      </div>
      <Button
        type="submit"
        form="form-pemesanan"
        size="lg"
        loading={createMutation.isPending}
        disabled={!rangeReady || maxSisa < 1}
        className="w-full sm:w-auto"
      >
        Pesan sekarang
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={sku.nama}
      description={`${sku.kode} · ${formatRupiah(sku.hargaSewaPerHari)} per hari`}
      footer={footer}
      widthClassName="sm:max-w-2xl"
    >
      <form id="form-pemesanan" onSubmit={handleSubmit} className="space-y-6">
        <section aria-labelledby="kalender-judul">
          <div className="mb-3 flex items-center justify-between">
            <h3 id="kalender-judul" className="text-sm font-semibold text-ink">
              Kalender ketersediaan
            </h3>
            <Badge tone={maxSisa > 0 ? "emerald" : "coral"}>
              {rangeReady
                ? rangeQuery.isFetching
                  ? "Menghitung sisa"
                  : `Sisa ${maxSisa} unit`
                : `${sku.unitBaik} unit siap`}
            </Badge>
          </div>
          <AvailabilityCalendar
            hari={monthQuery.data?.hari}
            isLoading={monthQuery.isLoading || monthQuery.isFetching}
            isError={monthQuery.isError}
            onRetry={() => {
              void monthQuery.refetch();
            }}
            year={view.year}
            monthIndex={view.month}
            onShiftMonth={shiftMonth}
            ambil={ambil}
            kembali={kembali}
            onChange={(nextAmbil, nextKembali) => {
              setAmbil(nextAmbil);
              setKembali(nextKembali);
            }}
          />
          {rangeQuery.isError && (
            <p className="mt-2 text-xs text-coraltext">
              Gagal memeriksa sisa unit untuk rentang ini. Coba pilih ulang tanggal.
            </p>
          )}
        </section>

        <section className="rounded-card border border-line bg-charcoal/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Tanggal ambil</p>
              <p className="text-sm font-semibold text-ink">
                {ambil ? formatTanggalLengkap(ambil) : "Belum dipilih"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Tanggal kembali</p>
              <p className="text-sm font-semibold text-ink">
                {kembali ? formatTanggalLengkap(kembali) : "Belum dipilih"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Durasi</p>
              <p className="text-sm font-semibold text-gold-300 tabular">
                {hariSewa > 0 ? `${hariSewa} hari` : "-"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
            <div>
              <p className="text-sm font-medium text-ink">Jumlah unit</p>
              <p className="text-xs text-muted tabular">
                Maksimal {maxSisa} unit untuk rentang ini
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty((v) => Math.max(1, v - 1))}
                disabled={qty <= 1}
                className="flex h-11 w-11 items-center justify-center rounded-control border border-line text-ink transition-colors hover:bg-moss/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-40"
                aria-label="Kurangi jumlah unit"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="w-10 text-center text-lg font-bold tabular text-ink" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((v) => Math.min(Math.max(1, maxSisa), v + 1))}
                disabled={qty >= maxSisa}
                className="flex h-11 w-11 items-center justify-center rounded-control border border-line text-ink transition-colors hover:bg-moss/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-40"
                aria-label="Tambah jumlah unit"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="rincian-judul">
          <h3 id="rincian-judul" className="mb-3 text-sm font-semibold text-ink">
            Rincian biaya
          </h3>
          <div className="space-y-2 rounded-card border border-line bg-charcoal/60 p-4">
            <BillRow label="Total sewa" value={totalSewa} />
            <BillRow label={`DP ${config.dpPersen}%`} value={dp} />
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2 text-muted">
                Deposit
                {statusPenyewa === "Bermasalah" && <Badge tone="amber">Bermasalah</Badge>}
              </span>
              <AnimatedNumber value={deposit} format={formatRupiah} className="font-semibold text-ink" />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line pt-2 text-sm">
              <span className="font-semibold text-ink">Total bayar awal</span>
              <AnimatedNumber value={totalAwal} format={formatRupiah} className="font-bold text-gold-300" />
            </div>
          </div>
          {statusPenyewa === "Bermasalah" && (
            <p className="mt-2 rounded-control border border-amber/30 bg-amber/[0.06] px-3 py-2 text-xs text-amber">
              Nomor ini tercatat Bermasalah. Pesanan menunggu persetujuan admin dan deposit memakai tarif bermasalah.
            </p>
          )}
        </section>

        <section aria-labelledby="simulasi-judul">
          <h3 id="simulasi-judul" className="mb-1 text-sm font-semibold text-ink">
            Simulasi denda keterlambatan
          </h3>
          <p className="mb-3 text-xs text-muted">
            Batas kembali pukul {config.jamBatasKembali} pada tanggal kembali. Toleransi {config.graceJam} jam sebelum dihitung satu hari penuh.
          </p>
          <div className="rounded-card border border-line bg-charcoal/60 p-4">
            <Field label="Berapa jam terlambat" htmlFor="jam-terlambat" hint="Simulasi hanya menghitung, tidak menyimpan data.">
              <Input
                id="jam-terlambat"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={jamTerlambat}
                onChange={(e) => setJamTerlambat(e.target.value)}
                placeholder="0"
              />
            </Field>
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-3 text-sm">
              <span className="text-muted">
                {sim.hariDenda === 0
                  ? `Masih dalam toleransi ${config.graceJam} jam`
                  : `${sim.hariDenda} hari denda x ${formatRupiah(tarifDenda)}`}
              </span>
              <AnimatedNumber
                value={sim.total}
                format={formatRupiah}
                className={cn("font-bold", sim.total > 0 ? "text-coraltext" : "text-emerald")}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="pemesan-judul" className="space-y-4">
          <h3 id="pemesan-judul" className="text-sm font-semibold text-ink">
            Data pemesan
          </h3>
          <Field label="Nama lengkap" htmlFor="nama" required error={fieldErrors.nama}>
            <Input
              id="nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              invalid={Boolean(fieldErrors.nama)}
              autoComplete="name"
              placeholder="Nama sesuai identitas"
              aria-describedby={fieldErrors.nama ? "nama-error" : undefined}
            />
          </Field>
          <Field
            label="Nomor HP"
            htmlFor="nomorHp"
            required
            error={fieldErrors.nomorHp}
            hint="Dipakai untuk cek riwayat dan menentukan deposit."
          >
            <Input
              id="nomorHp"
              value={nomorHp}
              onChange={(e) => setNomorHp(e.target.value)}
              invalid={Boolean(fieldErrors.nomorHp)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              aria-describedby={fieldErrors.nomorHp ? "nomorHp-error" : "nomorHp-hint"}
            />
          </Field>
        </section>

        {error && <InlineError>{error}</InlineError>}
      </form>
    </Drawer>
  );
}
