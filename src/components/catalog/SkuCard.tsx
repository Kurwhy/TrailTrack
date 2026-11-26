import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { formatRupiah, labelKategori } from "../../lib/format";
import { cn } from "../../lib/utils";
import type { KatalogSku } from "../../lib/apiTypes";
import { Badge } from "../ui/Badge";
import { GearMedia } from "./GearMedia";

interface SkuCardProps {
  sku: KatalogSku;
  sisa: number;
  rangeActive: boolean;
  variant: "featured" | "standard";
  onSelect: (sku: KatalogSku) => void;
}

export function SkuCard({ sku, sisa, rangeActive, variant, onSelect }: SkuCardProps) {
  const reduced = useReducedMotion();
  const featured = variant === "featured";
  const habis = sisa <= 0;
  const stockLabel = habis
    ? rangeActive
      ? "Habis di tanggal ini"
      : "Stok habis"
    : rangeActive
      ? `Sisa ${sisa} di tanggal ini`
      : `Sisa ${sisa}`;

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(sku)}
      whileHover={reduced ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "group flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-paper text-left transition-colors hover:border-moss/40 hover:shadow-[0_16px_36px_rgba(45,79,62,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bone",
        featured && "md:flex-row",
      )}
      aria-label={`Pilih ${sku.nama}, ${rangeActive ? `sisa ${sisa} pada tanggal terpilih` : `${sisa} unit siap sewa`}`}
    >
      <div className={cn(featured ? "md:w-1/2" : "w-full")}>
        <GearMedia
          kategori={sku.kategori}
          nama={sku.nama}
          kode={sku.kode}
          fotoUrl={sku.fotoUrl}
          large={featured}
          className={cn(
            "rounded-none border-0 border-b border-line",
            featured
              ? "h-56 md:h-full md:border-b-0 md:border-r"
              : "aspect-[4/3]",
          )}
        />
      </div>

      <div className={cn("flex flex-1 flex-col p-4", featured && "sm:p-6")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {labelKategori(sku.kategori)}
          </p>
          <Badge tone={habis ? "coral" : "emerald"}>{stockLabel}</Badge>
        </div>
        <h3
          className={cn(
            "mt-1.5 font-bold text-ink",
            featured ? "text-xl sm:text-2xl" : "text-base",
          )}
        >
          {sku.nama}
        </h3>
        {featured && (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Cek sisa unit untuk tanggal Anda, lalu atur jadwal ambil dan
            kembali sebelum berangkat.
          </p>
        )}
        <div className="mt-4">
          <p
            className={cn(
              "font-extrabold text-moss-700 tabular",
              featured ? "text-2xl" : "text-lg",
            )}
          >
            {formatRupiah(sku.hargaSewaPerHari)}
            <span className="ml-1 text-xs font-medium text-muted">/hari</span>
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Denda {formatRupiah(sku.tarifDendaHarian)}/hari · Deposit{" "}
            {formatRupiah(sku.depositNormal)}
          </p>
        </div>
        <div className="mt-auto flex items-center gap-2 pt-4 text-sm font-semibold text-moss-700 group-hover:text-moss-800">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Atur tanggal
        </div>
      </div>
    </motion.button>
  );
}
