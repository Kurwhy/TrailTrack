interface SnapResult {
  order_id?: string;
  transaction_status?: string;
  status_message?: string;
}

export interface SnapCallbacks {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, callbacks: SnapCallbacks) => void;
    };
  }
}

let loading: Promise<void> | null = null;

/**
 * Loads Snap.js on demand with the public client key so the payment script is
 * never part of the initial bundle.
 */
export function loadSnap(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Snap hanya tersedia di browser."));
  }
  if (window.snap) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-trailtrack-snap]",
    );
    const script = existing ?? document.createElement("script");
    script.src = import.meta.env.VITE_MIDTRANS_SNAP_JS_URL;
    script.setAttribute("data-client-key", import.meta.env.VITE_MIDTRANS_CLIENT_KEY);
    script.setAttribute("data-trailtrack-snap", "true");
    script.async = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      loading = null;
      reject(new Error("Gagal memuat halaman pembayaran Midtrans."));
    });
    if (!existing) document.body.appendChild(script);
  });

  return loading;
}
