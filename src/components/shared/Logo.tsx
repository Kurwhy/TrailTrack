import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

export function Logo({
  to = "/",
  compact = false,
  className,
}: {
  to?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-control",
        className,
      )}
      aria-label="TrailTrack, ke halaman katalog"
    >
      <img
        src="/brand/logo-mark.png"
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 rounded-lg border border-line object-cover"
      />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight text-ink">
          Trail<span className="text-moss-500">Track</span>
        </span>
        {!compact && (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Rental alat gunung
          </span>
        )}
      </span>
    </Link>
  );
}
