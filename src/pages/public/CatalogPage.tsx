import { lazy, Suspense, useMemo, useState } from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import { config } from "../../lib/config";
import { daysBetweenInclusive, labelKategori, toIsoDate } from "../../lib/format";
import { KATEGORI_SKU, type KategoriSku } from "../../lib/types";
import type { KatalogSku } from "../../lib/apiTypes";
import { useKatalog, useKetersediaanRanges } from "../../hooks/api";
import { Card, SectionLabel } from "../../components/ui/Card";
import { Field, Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/shared/EmptyState";
import { TopoPattern } from "../../components/shared/TopoPattern";
import { SkuCard } from "../../components/catalog/SkuCard";

const BookingDrawer = lazy(() =>
  import("../../components/catalog/BookingDrawer").then((m) => ({
    default: m.BookingDrawer,
  })),
);

export function CatalogPage() {
  const katalog = useKatalog();
  const skus = useMemo(() => katalog.data ?? [], [katalog.data]);
  const todayIso = toIsoDate(new Date());

  const [ambil, setAmbil] = useState("");
  const [kembali, setKembali] = useState("");
  const [filter, setFilter] = useState<"Semua" | KategoriSku>("Semua");
  const [selectedSku, setSelectedSku] = useState<KatalogSku | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const rangeActive = Boolean(ambil && kembali && kembali >= ambil);
  const rangeQueries = useKetersediaanRanges(
    skus.map((s) => s.id),
    ambil,
    kembali,
  );

  const sisaMap = useMemo(() => {
    const map = new Map<number, number>();
    skus.forEach((sku, index) => {
      map.set(
        sku.id,
        rangeActive
          ? (rangeQueries[index]?.data?.minSisa ?? sku.unitBaik)
          : sku.unitBaik,
      );
    });
    return map;
  }, [skus, rangeQueries, rangeActive]);

  const totalSiap = skus.reduce((sum, s) => sum + s.unitBaik, 0);
  const durasi = rangeActive ? daysBetweenInclusive(ambil, kembali) : 0;

  const kategoriTersedia = useMemo(() => {
    const present = new Set(skus.map((s) => s.kategori));
    return KATEGORI_SKU.filter((k) => present.has(k));
  }, [skus]);

  const filtered = useMemo(
    () =>
      filter === "Semua"
        ? skus
        : skus.filter((s) => s.kategori === filter),
    [skus, filter],
  );

  const featured = filter === "Semua" ? filtered[0] : null;
  const gridItems = filter === "Semua" ? filtered.slice(1) : filtered;
  const sisaFor = (sku: KatalogSku) => sisaMap.get(sku.id) ?? sku.unitBaik;

  const handleSelect = (sku: KatalogSku) => {
    setSelectedSku(sku);
    setDrawerOpen(true);
  };

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0">
          <TopoPattern className="absolute -right-28 -top-16 h-[560px] w-[760px] text-moss opacity-[0.12]" />
          <TopoPattern className="absolute -bottom-24 -left-32 h-[420px] w-[560px] text-burnt opacity-[0.05]" />
        </div>
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <SectionLabel>Rental perlengkapan gunung</SectionLabel>
              <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl">
                Sewa perlengkapan gunung per tanggal.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
                Cek sisa unit tenda, carrier, sleeping bag, dan alat gunung lain
                sebelum berangkat. Pilih tanggal, lihat rincian biaya, lalu
                pesan dengan DP dan deposit.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-2 rounded-control border border-line bg-paper px-3 py-1.5 text-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-moss-500" aria-hidden="true" />
                  <span className="tabular">{skus.length} jenis alat</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-control border border-line bg-paper px-3 py-1.5 text-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-moss-500" aria-hidden="true" />
                  <span className="tabular">{totalSiap} unit siap sewa</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-control border border-burnt/30 bg-burnt-50 px-3 py-1.5 text-burnt-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-burnt" aria-hidden="true" />
                  <span className="tabular">Buffer {config.bufferHari} hari</span>
                </span>
              </div>
            </div>

            <Card className="relative overflow-hidden p-5 shadow-float sm:p-6">
              <TopoPattern className="pointer-events-none absolute -right-12 -top-12 h-52 w-72 text-moss opacity-[0.08]" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-control bg-moss-50">
                    <CalendarRange className="h-4 w-4 text-moss-600" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">Rencana tanggal sewa</h2>
                    <p className="text-xs text-muted">Durasi termasuk hari ambil dan kembali.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Tanggal ambil" htmlFor="hero-ambil">
                    <Input
                      id="hero-ambil"
                      type="date"
                      min={todayIso}
                      value={ambil}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAmbil(value);
                        if (kembali && value && kembali < value) setKembali("");
                      }}
                    />
                  </Field>
                  <Field label="Tanggal kembali" htmlFor="hero-kembali">
                    <Input
                      id="hero-kembali"
                      type="date"
                      min={ambil || todayIso}
                      value={kembali}
                      onChange={(e) => setKembali(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-bone px-3 py-2">
                  {rangeActive ? (
                    <>
                      <span className="text-xs font-semibold text-moss-700">
                        {durasi} hari sewa
                      </span>
                      <span className="text-xs text-muted">
                        Sisa unit mengikuti tanggal ini
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-burnt-700">
                        Isi tanggal untuk melihat sisa unit
                      </span>
                      <span className="text-xs text-muted">
                        Pilih alat untuk membuka kalender
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section
        id="katalog"
        className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6"
        aria-labelledby="katalog-judul"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Katalog alat</SectionLabel>
            <h2
              id="katalog-judul"
              className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              Pilih alat, atur tanggalnya.
            </h2>
            <p className="mt-1 text-sm text-muted">
              {rangeActive
                ? "Angka sisa mengikuti tanggal yang Anda pilih."
                : "Angka sisa menunjukkan unit berkondisi baik saat ini."}
            </p>
          </div>
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink tabular">{filtered.length}</span> alat
            {filter !== "Semua" ? ` di ${labelKategori(filter)}` : ""}
          </p>
        </div>

        {katalog.isLoading ? (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-card border border-line bg-paper py-16 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Memuat katalog alat.
          </div>
        ) : katalog.isError ? (
          <div className="mt-6">
            <EmptyState
              title="Katalog tidak dapat dimuat"
              description="Periksa koneksi ke server, lalu coba lagi."
              action={
                <Button variant="secondary" onClick={() => void katalog.refetch()}>
                  Coba lagi
                </Button>
              }
            />
          </div>
        ) : skus.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Belum ada alat di katalog"
              description="Hubungi basecamp untuk memastikan ketersediaan perlengkapan."
            />
          </div>
        ) : (
          <>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
              <button
                type="button"
                onClick={() => setFilter("Semua")}
                className={
                  filter === "Semua"
                    ? "min-h-[40px] shrink-0 rounded-control border border-moss-500 bg-moss-500 px-3 text-sm font-semibold text-bone"
                    : "min-h-[40px] shrink-0 rounded-control border border-line bg-paper px-3 text-sm font-medium text-ink transition-colors hover:border-moss/40 hover:bg-moss/[0.04]"
                }
                aria-pressed={filter === "Semua"}
              >
                Semua{" "}
                <span className={filter === "Semua" ? "text-bone/80" : "text-muted"}>
                  {skus.length}
                </span>
              </button>
              {kategoriTersedia.map((kategori) => {
                const jumlah = skus.filter((s) => s.kategori === kategori).length;
                const active = filter === kategori;
                return (
                  <button
                    key={kategori}
                    type="button"
                    onClick={() => setFilter(kategori)}
                    className={
                      active
                        ? "min-h-[40px] shrink-0 rounded-control border border-moss-500 bg-moss-500 px-3 text-sm font-semibold text-bone"
                        : "min-h-[40px] shrink-0 rounded-control border border-line bg-paper px-3 text-sm font-medium text-ink transition-colors hover:border-moss/40 hover:bg-moss/[0.04]"
                    }
                    aria-pressed={active}
                  >
                    {labelKategori(kategori)}{" "}
                    <span className={active ? "text-bone/80" : "text-muted"}>
                      {jumlah}
                    </span>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Belum ada alat di kategori ini"
                  description="Pilih kategori lain atau tampilkan semua alat."
                  action={
                    <Button variant="secondary" onClick={() => setFilter("Semua")}>
                      Tampilkan semua
                    </Button>
                  }
                />
              </div>
            ) : (
              <>
                {featured && (
                  <div className="mt-6">
                    <SkuCard
                      sku={featured}
                      sisa={sisaFor(featured)}
                      rangeActive={rangeActive}
                      variant="featured"
                      onSelect={handleSelect}
                    />
                  </div>
                )}

                {gridItems.length > 0 && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {gridItems.map((sku) => (
                      <SkuCard
                        key={sku.id}
                        sku={sku}
                        sisa={sisaFor(sku)}
                        rangeActive={rangeActive}
                        variant="standard"
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>

      {selectedSku && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 text-sm text-ink">
              <span className="rounded-card border border-line bg-paper px-4 py-3">
                Membuka panel pemesanan.
              </span>
            </div>
          }
        >
          <BookingDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            sku={selectedSku}
            initialAmbil={ambil || null}
            initialKembali={kembali || null}
          />
        </Suspense>
      )}
    </div>
  );
}
