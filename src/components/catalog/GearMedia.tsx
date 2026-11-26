import { useState } from "react";
import {
  Armchair,
  Backpack,
  BedDouble,
  BedSingle,
  CookingPot,
  Droplets,
  Flashlight,
  Footprints,
  Fuel,
  Hand,
  Lamp,
  MoveVertical,
  Shirt,
  Table,
  Tent,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { KategoriSku } from "../../lib/types";
import { TopoPattern } from "../shared/TopoPattern";

export function gearIcon(kategori: KategoriSku, nama?: string): LucideIcon {
  switch (kategori) {
    case "Tenda Dome":
      return Tent;
    case "Carrier":
      return Backpack;
    case "Sleeping Bag":
      return BedDouble;
    case "Stove":
      return CookingPot;
    case "Trekking Pole":
      return MoveVertical;
    case "Kursi & Meja":
      return nama?.toLowerCase().includes("meja") ? Table : Armchair;
    case "Hydropack":
      return Droplets;
    case "Senter":
      return Flashlight;
    case "Lampu":
      return Lamp;
    case "Sepatu":
      return Footprints;
    case "Jaket":
      return Shirt;
    case "Sarung Tangan":
      return Hand;
    case "Gas Portable":
      return Fuel;
    case "Matras":
      return BedSingle;
    case "Hammock":
      return Waves;
    default:
      return Backpack;
  }
}

function HammockGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M9 9v30M39 9v30" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9 17c5 12 25 12 30 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9 17l-3-2M39 17l3-2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 22c4 4 8 4 12 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function PoleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M15 42L22 8M25 42l7-34" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M19 12h7M29 12h7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 42h6M23 42h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Gear visual for the catalog. Uses the local product photo when available,
 * with a field-guide illustration as the honest fallback.
 */
export function GearMedia({
  kategori,
  kode,
  nama,
  fotoUrl,
  className,
  large = false,
}: {
  kategori: KategoriSku;
  kode: string;
  nama?: string;
  fotoUrl?: string | null;
  className?: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const Icon = gearIcon(kategori, nama);
  const iconSize = large ? "h-14 w-14" : "h-9 w-9";
  const showPhoto = Boolean(fotoUrl) && !failed;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-card border border-line bg-[#F1EFE7]",
        className,
      )}
      role={showPhoto ? undefined : "img"}
      aria-label={showPhoto ? undefined : `Ilustrasi ${nama ?? kategori}`}
    >
      {showPhoto ? (
        <>
          <img
            src={fotoUrl ?? undefined}
            alt={nama ?? kategori}
            width={1000}
            height={750}
            loading={large ? "eager" : "lazy"}
            decoding="async"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute bottom-3 left-3 rounded-control border border-line bg-paper/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-moss-700">
            {kode}
          </span>
        </>
      ) : (
        <>
          <TopoPattern className="absolute inset-0 h-full w-full text-moss opacity-[0.16]" />
          <span
            aria-hidden="true"
            className="absolute left-3 top-3 h-2.5 w-2.5 border-l border-t border-moss/40"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-3 right-3 h-2.5 w-2.5 border-b border-r border-moss/40"
          />
          <span
            className={cn(
              "relative flex items-center justify-center rounded-2xl border border-line bg-paper shadow-[0_12px_28px_rgba(45,79,62,0.10)]",
              large ? "h-28 w-28" : "h-20 w-20",
            )}
          >
            {kategori === "Hammock" ? (
              <HammockGlyph className={cn("text-moss-600", iconSize)} />
            ) : kategori === "Trekking Pole" ? (
              <PoleGlyph className={cn("text-moss-600", iconSize)} />
            ) : (
              <Icon className={cn("text-moss-600", iconSize)} strokeWidth={1.5} aria-hidden="true" />
            )}
            <svg
              viewBox="0 0 16 16"
              className={cn(
                "absolute -right-2 -top-2 text-burnt",
                large ? "h-6 w-6" : "h-5 w-5",
              )}
              aria-hidden="true"
            >
              <path d="M4 15V2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M4.5 2.2L14 5.6 4.5 9z" fill="currentColor" />
            </svg>
          </span>
          <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-moss-700">
            {kode}
          </span>
        </>
      )}
    </div>
  );
}
