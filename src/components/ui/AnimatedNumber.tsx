import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  className?: string;
  durationMs?: number;
}

/**
 * Counts up to the new value so a changing total is easy to follow.
 * Under prefers-reduced-motion the final value appears instantly.
 */
export function AnimatedNumber({
  value,
  format,
  className,
  durationMs = 480,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (value - from) * eased);
      setDisplay(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, durationMs, reduced]);

  return (
    <span className={cn("tabular", className)}>{format(display)}</span>
  );
}
