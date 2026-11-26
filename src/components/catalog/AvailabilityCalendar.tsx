import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMemo } from "react";
import {
  addDays,
  bulanLabel,

  toIsoDate,
} from "../../lib/format";
import type { AvailabilityDay } from "../../lib/apiTypes";
import { cn } from "../../lib/utils";

const HARI_PENDEK = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function startOfMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

interface AvailabilityCalendarProps {
  hari: AvailabilityDay[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  year: number;
  monthIndex: number;
  onShiftMonth: (delta: number) => void;
  ambil: string | null;
  kembali: string | null;
  onChange: (ambil: string | null, kembali: string | null) => void;
}

export function AvailabilityCalendar({
  hari,
  isLoading,
  isError,
  onRetry,
  year,
  monthIndex,
  onShiftMonth,
  ambil,
  kembali,
  onChange,
}: AvailabilityCalendarProps) {
  const today = toIsoDate(new Date());
  const cells = useMemo(() => startOfMonthGrid(year, monthIndex), [year, monthIndex]);
  const map = useMemo(() => {
    const result = new Map<string, AvailabilityDay>();
    for (const day of hari ?? []) result.set(day.date, day);
    return result;
  }, [hari]);

  const handleClick = (iso: string) => {
    if (!ambil || (ambil && kembali)) {
      onChange(iso, null);
      return;
    }
    if (iso < ambil) {
      onChange(iso, null);
      return;
    }
    onChange(ambil, iso);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onShiftMonth(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-control border border-line text-ink transition-colors hover:bg-moss/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold text-ink" aria-live="polite">
          {bulanLabel(year, monthIndex)}
        </p>
        <button
          type="button"
          onClick={() => onShiftMonth(1)}
          className="flex h-9 w-9 items-center justify-center rounded-control border border-line text-ink transition-colors hover:bg-moss/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {isError ? (
        <div className="rounded-card border border-coral/30 bg-coral/[0.06] px-4 py-6 text-center text-sm text-coraltext">
          Ketersediaan tidak dapat dimuat.
          <button
            type="button"
            onClick={onRetry}
            className="ml-2 font-semibold underline underline-offset-2"
          >
            Coba lagi
          </button>
        </div>
      ) : isLoading && !hari ? (
        <div className="flex items-center justify-center gap-2 rounded-card border border-line bg-panel py-12 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Memuat ketersediaan.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1">
            {HARI_PENDEK.map((hariLabel) => (
              <div
                key={hariLabel}
                className="pb-1 text-center text-[11px] font-semibold text-muted"
              >
                {hariLabel}
              </div>
            ))}
            {cells.map((date) => {
              const iso = toIsoDate(date);
              const inMonth = date.getMonth() === monthIndex;
              const avail = map.get(iso) ?? {
                date: iso,
                terpakai: 0,
                buffer: 0,
                sisa: 0,
              };
              const isPast = iso < today;
              const isAmbil = ambil === iso;
              const isKembali = kembali === iso;
              const inRange =
                ambil && kembali && iso > ambil && iso < kembali ? true : false;
              const endpoint = isAmbil || isKembali;
              const habis = avail.sisa <= 0;

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isPast || !inMonth}
                  onClick={() => handleClick(iso)}
                  aria-pressed={endpoint}
                  aria-label={`${date.getDate()} ${bulanLabel(year, monthIndex)}, terpakai ${avail.terpakai}, buffer ${avail.buffer}, sisa ${avail.sisa}`}
                  className={cn(
                    "flex min-h-[58px] flex-col items-start rounded-control border bg-paper p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 sm:min-h-[66px]",
                    !inMonth && "invisible",
                    isPast && "cursor-not-allowed border-transparent opacity-35",
                    !isPast &&
                      !endpoint &&
                      !inRange &&
                      "border-line hover:border-moss/40 hover:bg-moss/[0.04]",
                    inRange && "border-burnt/40 bg-burnt/[0.08]",
                    avail.buffer > 0 &&
                      !endpoint &&
                      !inRange &&
                      "border-burnt/30 bg-burnt/[0.05]",
                    habis && !endpoint && "border-line-strong bg-[#F1EFE7]",
                    endpoint &&
                      "border-burnt-600 bg-burnt-600 text-white hover:bg-burnt-700",
                  )}
                >
                  <span className="text-sm font-bold tabular">{date.getDate()}</span>
                  <span
                    className={cn(
                      "mt-0.5 w-full overflow-hidden whitespace-nowrap text-[8px] font-medium leading-tight tabular sm:text-[9px]",
                      endpoint
                        ? "text-white/85"
                        : habis
                          ? "text-coraltext"
                          : "text-muted",
                    )}
                  >
                    T{avail.terpakai} B{avail.buffer} S{avail.sisa}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
            <span>T = Terpakai</span>
            <span>B = Buffer</span>
            <span>S = Sisa</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-burnt" aria-hidden="true" />
              Masa buffer
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-coral" aria-hidden="true" />
              Habis
            </span>
          </div>
        </>
      )}
    </div>
  );
}
