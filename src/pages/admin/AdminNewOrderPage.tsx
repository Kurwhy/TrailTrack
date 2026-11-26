import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { config } from "../../lib/config";
import {
  daysBetweenInclusive,
  formatRupiah,
  toIsoDate,
} from "../../lib/format";
import {
  depositFor,
  dpFor,
  isValidName,
  isValidPhone,
  normalizePhone,
  totalSewaFor,
} from "../../lib/rules";
import type { CreateOrderPayload } from "../../lib/apiTypes";
import { usePageMeta } from "../../lib/usePageMeta";
import {
  useAdminPenyewa,
  useCreateAdminPesanan,
  useKatalog,
  useKetersediaanRanges,
} from "../../hooks/api";
import { Card, SectionLabel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { EmptyState, InlineError } from "../../components/shared/EmptyState";

interface Line {
  uid: number;
  skuId: number;
  qty: number;
}

export function AdminNewOrderPage() {
  usePageMeta("Pesanan Baru - Panel Staf TrailTrack", true);
  const navigate = useNavigate();
  const katalog = useKatalog();
  const penyewaQuery = useAdminPenyewa();
  const createMutation = useCreateAdminPesanan();
  const skus = useMemo(() => katalog.data ?? [], [katalog.data]);
  const today = toIsoDate(new Date());

  const [nama, setNama] = useState("");
  const [nomorHp, setNomorHp] = useState("");
  const [ambil, setAmbil] = useState("");
  const [kembali, setKembali] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [nextUid, setNextUid] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    nama?: string;
    nomorHp?: string;
    tanggal?: string;
    items?: string;
  }>({});

  useEffect(() => {
    if (lines.length === 0 && skus.length > 0) {
      setLines([{ uid: 1, skuId: skus[0].id, qty: 1 }]);
    }
  }, [skus, lines.length]);

  const rangeReady = Boolean(ambil && kembali && kembali >= ambil);
  const hariSewa = rangeReady ? daysBetweenInclusive(ambil, kembali) : 0;

  const statusPenyewa = useMemo(() => {
    if (!isValidPhone(nomorHp) || !penyewaQuery.data) return "Normal" as const;
    const phone = normalizePhone(nomorHp);
    return penyewaQuery.data.find((p) => p.nomorHp === phone)?.status ?? "Normal";
  }, [nomorHp, penyewaQuery.data]);

  const uniqueSkuIds = useMemo(
    () => [...new Set(lines.map((l) => l.skuId))].filter((id) => id > 0),
    [lines],
  );
  const rangeResults = useKetersediaanRanges(uniqueSkuIds, ambil, kembali);
  const sisaMap = useMemo(() => {
    const map = new Map<number, number | undefined>();
    uniqueSkuIds.forEach((id, i) => map.set(id, rangeResults[i]?.data?.minSisa));
    return map;
  }, [uniqueSkuIds, rangeResults]);

  const totalSewa = useMemo(() => {
    if (!rangeReady) return 0;
    return totalSewaFor(
      lines.map((l) => ({ skuId: l.skuId, qty: l.qty })),
      skus,
      hariSewa,
    );
  }, [lines, skus, hariSewa, rangeReady]);
  const dp = dpFor(totalSewa);
  const deposit = rangeReady
    ? depositFor(
        lines.map((l) => ({ skuId: l.skuId, qty: l.qty })),
        skus,
        statusPenyewa,
      )
    : 0;

  const sisaUntuk = (skuId: number) => (rangeReady ? sisaMap.get(skuId) : null);

  const updateLine = (uid: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((line) => (line.uid === uid ? { ...line, ...patch } : line)));
  };
  const addLine = () => {
    setLines((prev) => [...prev, { uid: nextUid, skuId: skus[0]?.id ?? 0, qty: 1 }]);
    setNextUid((n) => n + 1);
  };
  const removeLine = (uid: number) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.uid !== uid) : prev));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const nextErrors: typeof fieldErrors = {};
    if (!isValidName(nama)) nextErrors.nama = "Nama lengkap 3 sampai 120 karakter.";
    if (!isValidPhone(nomorHp)) {
      nextErrors.nomorHp = "Nomor HP diawali 08 atau +62, 10 sampai 15 digit.";
    }
    if (!rangeReady) nextErrors.tanggal = "Pilih tanggal ambil dan kembali yang valid.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const merged = new Map<number, number>();
    for (const line of lines) {
      if (line.qty < 1) {
        setFieldErrors({ items: "Jumlah unit minimal 1." });
        return;
      }
      merged.set(line.skuId, (merged.get(line.skuId) ?? 0) + line.qty);
    }

    for (const [skuId, qty] of merged) {
      const sisa = sisaMap.get(skuId);
      if (sisa === undefined) {
        setFieldErrors({ items: "Sisa unit belum selesai dihitung. Coba lagi." });
        return;
      }
      if (qty > sisa) {
        const sku = skus.find((s) => s.id === skuId);
        setFieldErrors({
          items: `Stok ${sku?.nama ?? "alat"} hanya ${sisa} unit pada rentang ini.`,
        });
        return;
      }
    }

    const payload: CreateOrderPayload = {
      nama,
      nomorHp,
      tanggalAmbil: ambil,
      tanggalKembali: kembali,
      items: Array.from(merged, ([skuId, qty]) => ({ skuId, qty })),
    };
    try {
      const detail = await createMutation.mutateAsync(payload);
      navigate(`/admin/pesanan/${detail.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pesanan tidak dapat dibuat.");
    }
  };

  if (katalog.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-card border border-line bg-panel py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Memuat data alat.
      </div>
    );
  }

  if (katalog.isError) {
    return (
      <EmptyState
        title="Data alat tidak dapat dimuat"
        description="Periksa koneksi ke server, lalu coba lagi."
        action={
          <Button variant="secondary" onClick={() => void katalog.refetch()}>
            Coba lagi
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SectionLabel>Panel staf</SectionLabel>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Pesanan baru
      </h1>
      <p className="mt-1 text-sm text-muted">
        Isi data penyewa dan alat. Aturan tanggal, DP, dan deposit sama dengan pesanan pelanggan.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <Card className="space-y-4 p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink">Data penyewa</h2>
          <Field label="Nama lengkap" htmlFor="baru-nama" required error={fieldErrors.nama}>
            <Input
              id="baru-nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              invalid={Boolean(fieldErrors.nama)}
              placeholder="Nama sesuai identitas"
              aria-describedby={fieldErrors.nama ? "baru-nama-error" : undefined}
            />
          </Field>
          <Field
            label="Nomor HP"
            htmlFor="baru-hp"
            required
            error={fieldErrors.nomorHp}
            hint="Nomor dinormalisasi ke format 08xxxxxxxxxx."
          >
            <Input
              id="baru-hp"
              value={nomorHp}
              onChange={(e) => setNomorHp(e.target.value)}
              invalid={Boolean(fieldErrors.nomorHp)}
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              aria-describedby={fieldErrors.nomorHp ? "baru-hp-error" : "baru-hp-hint"}
            />
          </Field>
          <div className="flex items-center gap-2 text-xs text-muted">
            Status penyewa tercatat:
            <Badge tone={statusPenyewa === "Bermasalah" ? "amber" : "emerald"}>
              {statusPenyewa}
            </Badge>
          </div>
        </Card>

        <Card className="space-y-4 p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink">Jadwal sewa</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal ambil" htmlFor="baru-ambil" required>
              <Input
                id="baru-ambil"
                type="date"
                min={today}
                value={ambil}
                onChange={(e) => {
                  const value = e.target.value;
                  setAmbil(value);
                  if (kembali && value && kembali < value) setKembali("");
                }}
              />
            </Field>
            <Field label="Tanggal kembali" htmlFor="baru-kembali" required>
              <Input
                id="baru-kembali"
                type="date"
                min={ambil || today}
                value={kembali}
                onChange={(e) => setKembali(e.target.value)}
              />
            </Field>
          </div>
          {fieldErrors.tanggal && (
            <p className="text-xs text-coraltext" role="alert">
              {fieldErrors.tanggal}
            </p>
          )}
          <p className="text-xs text-muted tabular">
            {rangeReady
              ? `${hariSewa} hari sewa, termasuk hari ambil dan kembali.`
              : "Pilih tanggal untuk menghitung durasi."}
          </p>
        </Card>

        <Card className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">Alat yang disewa</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah alat
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line) => {
              const sisa = sisaUntuk(line.skuId);
              const melebihi = sisa !== null && sisa !== undefined && line.qty > sisa;
              return (
                <div
                  key={line.uid}
                  className="grid gap-3 rounded-control border border-line bg-charcoal/50 p-3 sm:grid-cols-[1fr_120px_44px] sm:items-start"
                >
                  <Field label="Alat" htmlFor={`sku-${line.uid}`}>
                    <Select
                      id={`sku-${line.uid}`}
                      value={line.skuId}
                      onChange={(e) => updateLine(line.uid, { skuId: Number(e.target.value) })}
                    >
                      {skus.map((sku) => (
                        <option key={sku.id} value={sku.id}>
                          {sku.nama}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Jumlah"
                    htmlFor={`qty-${line.uid}`}
                    error={melebihi ? `Maks ${sisa}` : undefined}
                  >
                    <Input
                      id={`qty-${line.uid}`}
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={line.qty}
                      invalid={melebihi}
                      onChange={(e) =>
                        updateLine(line.uid, { qty: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                  </Field>
                  <div className="flex items-end sm:pb-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(line.uid)}
                      disabled={lines.length === 1}
                      aria-label="Hapus alat dari pesanan"
                      className="h-11 w-11 px-0 text-coraltext hover:bg-coral/[0.08]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  {rangeReady && (
                    <p className="text-xs text-muted sm:col-span-3">
                      {sisa === undefined
                        ? "Menghitung sisa unit."
                        : `Sisa ${sisa} unit pada rentang tanggal ini.`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {fieldErrors.items && (
            <p className="text-xs text-coraltext" role="alert">
              {fieldErrors.items}
            </p>
          )}
        </Card>

        <Card className="space-y-2 p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink">Rincian biaya</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Total sewa</span>
            <AnimatedNumber value={totalSewa} format={formatRupiah} className="font-semibold text-ink" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">DP {config.dpPersen}%</span>
            <AnimatedNumber value={dp} format={formatRupiah} className="font-semibold text-ink" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Deposit</span>
            <AnimatedNumber value={deposit} format={formatRupiah} className="font-semibold text-ink" />
          </div>
          <div className="flex items-center justify-between border-t border-line pt-2 text-sm">
            <span className="font-semibold text-ink">Total bayar awal</span>
            <AnimatedNumber
              value={dp + deposit}
              format={formatRupiah}
              className="font-bold text-gold-300"
            />
          </div>
          <p className="text-xs text-muted">
            {rangeReady
              ? `Pesanan admin langsung berstatus Menunggu Pembayaran. Deposit mengikuti status penyewa ${statusPenyewa}.`
              : "Lengkapi tanggal untuk menghitung biaya."}
          </p>
        </Card>

        {error && <InlineError>{error}</InlineError>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" size="lg" onClick={() => navigate("/admin/pesanan")}>
            Batal
          </Button>
          <Button type="submit" size="lg" loading={createMutation.isPending}>
            Simpan pesanan
          </Button>
        </div>
      </form>
    </div>
  );
}
