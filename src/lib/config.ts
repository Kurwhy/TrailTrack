const env = import.meta.env;

/**
 * Business rules are read from the environment (Bab 6 / Bab 10).
 * No fallback numbers are written in code so the values stay in one place.
 * The backend (Tahap 2) reads the un-prefixed equivalents from the same file.
 */
export const config = {
  bufferHari: Number(env.VITE_BUFFER_HARI),
  graceJam: Number(env.VITE_GRACE_JAM),
  jamBatasKembali: env.VITE_JAM_BATAS_KEMBALI,
  dpPersen: Number(env.VITE_DP_PERSEN),
  telatBatas: Number(env.VITE_TELAT_BATAS),
  adminEmail: env.VITE_ADMIN_EMAIL,
  adminPassword: env.VITE_ADMIN_PASSWORD,
};

export const appMeta = {
  nama: "TrailTrack",
  deskripsi: "Rental perlengkapan gunung",
};
