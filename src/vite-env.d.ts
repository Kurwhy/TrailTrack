/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BUFFER_HARI: string;
  readonly VITE_GRACE_JAM: string;
  readonly VITE_JAM_BATAS_KEMBALI: string;
  readonly VITE_DP_PERSEN: string;
  readonly VITE_TELAT_BATAS: string;
  readonly VITE_ADMIN_EMAIL: string;
  readonly VITE_ADMIN_PASSWORD: string;
  readonly VITE_MIDTRANS_CLIENT_KEY: string;
  readonly VITE_MIDTRANS_SNAP_JS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
