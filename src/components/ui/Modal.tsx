import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { useDialog } from "./useDialog";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClassName,
}: ModalProps) {
  const reduced = useReducedMotion();
  const panelRef = useDialog(open, onClose);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-ink/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={cn(
              "relative flex max-h-[92vh] w-full flex-col rounded-t-overlay border border-line bg-panel shadow-float sm:rounded-overlay",
              widthClassName ?? "sm:max-w-lg",
            )}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 340, damping: 32 }
            }
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
              <div>
                <h2 id="modal-title" className="text-lg font-bold text-ink">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-sm text-muted">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-moss/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                aria-label="Tutup dialog"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {children}
            </div>
            {footer && (
              <div className="border-t border-line px-5 py-4 sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
