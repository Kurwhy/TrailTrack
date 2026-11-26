import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import type { Kondisi, StatusPenyewa, StatusPesanan } from "../../lib/types";

export type Tone = "gold" | "emerald" | "amber" | "coral" | "neutral";

const tones: Record<Tone, string> = {
  gold: "bg-moss-50 text-moss-700 border-moss-200",
  emerald: "bg-moss-50 text-moss-700 border-moss-200",
  amber: "bg-burnt-50 text-burnt-700 border-burnt-100",
  coral: "bg-[#FBEAE7] text-coraltext border-[#EFC9C1]",
  neutral: "bg-[#F1EFE7] text-muted border-line",
};

interface BadgeProps {
  tone?: Tone;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", pulse, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        pulse && "animate-amber-pulse motion-reduce:animate-none",
        className,
      )}
    >
      {pulse && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

export function statusPesananTone(status: StatusPesanan, telat?: boolean): Tone {
  if (telat) return "coral";
  switch (status) {
    case "Menunggu Persetujuan":
      return "amber";
    case "Ditolak":
      return "coral";
    case "Menunggu Pembayaran":
      return "amber";
    case "Terkonfirmasi":
      return "emerald";
    case "Sedang Disewa":
      return "gold";
    case "Selesai":
      return "neutral";
  }
}

export function StatusPesananBadge({
  status,
  telat,
  className,
}: {
  status: StatusPesanan;
  telat?: boolean;
  className?: string;
}) {
  const pulse = status === "Menunggu Persetujuan";
  return (
    <Badge tone={statusPesananTone(status, telat)} pulse={pulse} className={className}>
      {telat ? "Sedang Disewa (Telat)" : status}
    </Badge>
  );
}

export function kondisiTone(kondisi: Kondisi): Tone {
  switch (kondisi) {
    case "Baik":
      return "emerald";
    case "Perlu Perbaikan Ringan":
      return "amber";
    case "Rusak":
    case "Hilang":
      return "coral";
  }
}

export function KondisiBadge({ kondisi, className }: { kondisi: Kondisi; className?: string }) {
  return (
    <Badge tone={kondisiTone(kondisi)} className={className}>
      {kondisi}
    </Badge>
  );
}

export function StatusPenyewaBadge({
  status,
  className,
}: {
  status: StatusPenyewa;
  className?: string;
}) {
  return (
    <Badge tone={status === "Bermasalah" ? "amber" : "emerald"} className={className}>
      {status}
    </Badge>
  );
}
