import { useEffect, useMemo, useState } from "react";
import { config } from "../../lib/config";
import {
  formatRupiah,
  formatTanggalLengkap,
  toLocalDateTimeInput,
} from "../../lib/format";
import { hitungDendaAktual } from "../../lib/rules";
import { KONDISI, type Kondisi } from "../../lib/types";
import type { PesananDetail } from "../../lib/apiTypes";
import { cn } from "../../lib/utils";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Field } from "../ui/Input";
import { Modal } from "../ui/Modal";

export interface InspectionEntry {
  unitId: number;
  kondisi: Kondisi;
  catatan: string;
  acuanIds: number[];
}

interface InspectionModalProps {
  open: boolean;
  onClose: () => void;
  order: PesananDetail;
  onConfirm: (waktuKembali: Date, entries: InspectionEntry[]) => Promise<string | null>;
}

interface EntryState {
  kondisi: Kondisi;
  catatan: string;
  acuanIds: number[];
}

export function InspectionModal({ open, onClose, order, onConfirm }: InspectionModalProps) {
  const orderUnits = order.units;
  const [waktu, setWaktu] = useState(toLocalDateTimeInput(new Date()));
  const [entries, setEntries] = useState<Record<number, EntryState>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const skuName = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of order.items) map.set(item.skuId, item.nama);
    return map;
  }, [order.items]);

  useEffect(() => {
    if (!open) return;
    setWaktu(toLocalDateTimeInput(new Date()));
    setError(null);
    setSubmitting(false);
    const initial: Record<number, EntryState> = {};
    for (const unit of orderUnits) {
      initial[unit.id] = { kondisi: "Baik", catatan: "", acuanIds: [] };
    }
    setEntries(initial);
    // Reset only when the dialog opens; orderUnits identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order.id]);

  const updateEntry = (unitId: number, patch: Partial<EntryState>) => {
    setEntries((prev) => ({ ...prev, [unitId]: { ...prev[unitId], ...patch } }));
  };

  const tarifDenda = order.items.reduce(
    (sum, item) => sum + item.tarifDendaHarian * item.qty,
    0,
  );
  const waktuDate = new Date(waktu);
  const validWaktu = !Number.isNaN(waktuDate.getTime());
  const hariDenda = validWaktu ? hitungDendaAktual(waktuDate, order.tanggalKembali).hariDenda : 0;
  const totalDenda = hariDenda * tarifDenda;

  const totalKerusakan = orderUnits.reduce((sum, unit) => {
    const entry = entries[unit.id];
    if (!entry) return sum;
    return (
      sum +
      entry.acuanIds.reduce((acc, id) => {
        const acuan = order.acuan.find((a) => a.id === id);
        return acc + (acuan?.biaya ?? 0);
      }, 0)
    );
  }, 0);

  const selisih =
    Math.max(0, order.totalSewa - order.dp) +
    totalDenda +
    totalKerusakan -
    order.deposit;

  const handleSubmit = async () => {
    setError(null);
    if (!validWaktu) {
      setError("Waktu pengembalian tidak valid.");
      return;
    }
    const list: InspectionEntry[] = [];
    for (const unit of orderUnits) {
      const entry = entries[unit.id];
      if (!entry) continue;
      const catatan = entry.catatan.trim();
      if (entry.kondisi !== "Baik") {
        if (catatan.length === 0) {
          setError("Catatan wajib diisi untuk unit yang tidak berstatus Baik.");
          return;
        }
        if (catatan.length > 500) {
          setError("Catatan maksimal 500 karakter.");
          return;
        }
        const punyaAcuan = order.acuan.some(
          (a) => a.skuId === unit.skuId && a.kategori === entry.kondisi,
        );
        if (punyaAcuan && entry.acuanIds.length === 0) {
          setError("Pilih minimal satu poin kerusakan untuk unit tersebut.");
          return;
        }
      }
      list.push({
        unitId: unit.id,
        kondisi: entry.kondisi,
        catatan,
        acuanIds: entry.kondisi === "Baik" ? [] : entry.acuanIds,
      });
    }
    setSubmitting(true);
    try {
      const message = await onConfirm(waktuDate, list);
      if (message) setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Catat pengembalian"
      description={`${order.kode}. Periksa setiap unit, lalu simpan hasil inspeksi.`}
      widthClassName="sm:max-w-2xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="text-xs text-muted">Selisih akhir estimasi</p>
            <AnimatedNumber
              value={selisih}
              format={formatRupiah}
              className={cn("text-lg font-bold", selisih > 0 ? "text-coraltext" : "text-emerald")}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={() => void handleSubmit()} loading={submitting}>
              Simpan inspeksi
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Field
          label="Waktu pengembalian aktual"
          htmlFor="waktu-kembali"
          hint={`Batas pengembalian ${formatTanggalLengkap(order.tanggalKembali)} pukul ${config.jamBatasKembali}.`}
        >
          <input
            id="waktu-kembali"
            type="datetime-local"
            value={waktu}
            onChange={(e) => setWaktu(e.target.value)}
            className="h-11 w-full rounded-control border border-line bg-paper px-3 text-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
          />
        </Field>

        <div className="space-y-3">
          {orderUnits.map((unit) => {
            const entry =
              entries[unit.id] ?? { kondisi: "Baik" as Kondisi, catatan: "", acuanIds: [] };
            const acuanOptions = order.acuan.filter(
              (a) => a.skuId === unit.skuId && a.kategori === entry.kondisi,
            );
            const biayaUnit = entry.acuanIds.reduce((acc, id) => {
              const acuan = order.acuan.find((a) => a.id === id);
              return acc + (acuan?.biaya ?? 0);
            }, 0);
            return (
              <div key={unit.id} className="rounded-card border border-line bg-charcoal/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink tabular">{unit.kodeUnit}</p>
                    <p className="text-xs text-muted">{skuName.get(unit.skuId)}</p>
                  </div>
                  {biayaUnit > 0 && <Badge tone="coral">{formatRupiah(biayaUnit)}</Badge>}
                </div>

                <fieldset className="mt-3">
                  <legend className="mb-1.5 text-xs font-medium text-muted">Kondisi unit</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {KONDISI.map((kondisi) => {
                      const active = entry.kondisi === kondisi;
                      return (
                        <label
                          key={kondisi}
                          className={cn(
                            "cursor-pointer rounded-control border px-2 py-2 text-center text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-gold-500 focus-within:ring-offset-2 focus-within:ring-offset-panel",
                            active
                              ? "border-gold-500 bg-gold-500/[0.12] text-gold-200"
                              : "border-line text-muted hover:bg-moss/[0.06]",
                          )}
                        >
                          <input
                            type="radio"
                            name={`kondisi-${unit.id}`}
                            value={kondisi}
                            checked={active}
                            onChange={() => updateEntry(unit.id, { kondisi, acuanIds: [] })}
                            className="sr-only"
                          />
                          {kondisi}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {entry.kondisi !== "Baik" && (
                  <div className="mt-3 space-y-3">
                    <Field
                      label="Catatan inspeksi"
                      htmlFor={`catatan-${unit.id}`}
                      required
                      hint={`${entry.catatan.length}/500 karakter.`}
                    >
                      <textarea
                        id={`catatan-${unit.id}`}
                        value={entry.catatan}
                        maxLength={500}
                        rows={2}
                        onChange={(e) => updateEntry(unit.id, { catatan: e.target.value })}
                        className="w-full rounded-control border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/70 transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
                        placeholder="Tuliskan kondisi yang ditemukan"
                      />
                    </Field>

                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted">
                        Poin kerusakan ({entry.kondisi})
                      </p>
                      {acuanOptions.length === 0 ? (
                        <p className="rounded-control border border-line bg-paper px-3 py-2 text-xs text-muted">
                          Acuan biaya untuk kategori ini belum tersedia. Biaya kerusakan dihitung 0.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {acuanOptions.map((acuan) => {
                            const checked = entry.acuanIds.includes(acuan.id);
                            return (
                              <li key={acuan.id}>
                                <label
                                  className={cn(
                                    "flex cursor-pointer items-center justify-between gap-3 rounded-control border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-gold-500 focus-within:ring-offset-2 focus-within:ring-offset-panel",
                                    checked
                                      ? "border-gold-500/50 bg-gold-500/[0.06] text-ink"
                                      : "border-line text-muted hover:bg-moss/[0.06]",
                                  )}
                                >
                                  <span className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        const next = e.target.checked
                                          ? [...entry.acuanIds, acuan.id]
                                          : entry.acuanIds.filter((id) => id !== acuan.id);
                                        updateEntry(unit.id, { acuanIds: next });
                                      }}
                                      className="h-4 w-4 accent-gold-500"
                                    />
                                    {acuan.namaKerusakan}
                                  </span>
                                  <span className="text-xs font-semibold tabular text-ink">
                                    {formatRupiah(acuan.biaya)}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-card border border-line bg-charcoal/60 p-4">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted">Hari denda</p>
              <p className="font-semibold text-ink tabular">{hariDenda} hari</p>
            </div>
            <div>
              <p className="text-xs text-muted">Denda keterlambatan</p>
              <p className="font-semibold text-ink tabular">{formatRupiah(totalDenda)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Biaya kerusakan</p>
              <p className="font-semibold text-ink tabular">{formatRupiah(totalKerusakan)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            Denda memakai toleransi grace period dan pembulatan hari sesuai aturan basecamp.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-coraltext">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
