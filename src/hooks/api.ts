import {
  useCallback,
} from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, qs } from "../lib/api";
import type {
  AdminSku,
  AdminSkuDetail,
  CreateOrderPayload,
  KatalogSku,
  KetersediaanMonth,
  KetersediaanRange,
  OrderSummary,
  PesananDetail,
  PenyewaRow,
  RiwayatResponse,
  SnapPayment,
  SyncPayment,
} from "../lib/apiTypes";
import type { Kondisi } from "../lib/types";

export function useRefreshOrderData() {
  const client = useQueryClient();
  return useCallback(() => {
    for (const key of [
      ["katalog"],
      ["ketersediaan"],
      ["admin", "pesanan"],
      ["admin", "sku"],
      ["admin", "penyewa"],
      ["riwayat"],
    ]) {
      void client.invalidateQueries({ queryKey: key });
    }
  }, [client]);
}

export function useKatalog() {
  return useQuery({
    queryKey: ["katalog"],
    queryFn: () => api.get<{ data: KatalogSku[] }>("/katalog"),
    select: (r) => r.data,
  });
}

export function useKetersediaanMonth(
  skuId: number | undefined,
  bulan: string | undefined,
) {
  return useQuery({
    queryKey: ["ketersediaan", "bulan", skuId, bulan],
    queryFn: () =>
      api.get<KetersediaanMonth>(
        `/ketersediaan${qs({ sku: skuId, bulan })}`,
      ),
    enabled: Boolean(skuId && bulan),
  });
}

export function useKetersediaanRange(
  skuId: number | undefined,
  ambil: string,
  kembali: string,
) {
  return useQuery({
    queryKey: ["ketersediaan", "range", skuId, ambil, kembali],
    queryFn: () =>
      api.get<KetersediaanRange>(
        `/ketersediaan${qs({ sku: skuId, ambil, kembali })}`,
      ),
    enabled: Boolean(skuId && ambil && kembali && kembali >= ambil),
  });
}

export function useKetersediaanRanges(
  skuIds: number[],
  ambil: string,
  kembali: string,
) {
  const enabled = Boolean(
    ambil && kembali && kembali >= ambil && skuIds.length > 0,
  );
  return useQueries({
    queries: skuIds.map((skuId) => ({
      queryKey: ["ketersediaan", "range", skuId, ambil, kembali],
      queryFn: () =>
        api.get<KetersediaanRange>(
          `/ketersediaan${qs({ sku: skuId, ambil, kembali })}`,
        ),
      enabled,
    })),
  });
}

export function usePublicPesanan(kode: string | undefined) {
  return useQuery({
    queryKey: ["pesanan", "public", kode],
    queryFn: () => api.get<{ data: PesananDetail }>(`/pesanan/${kode}`),
    select: (r) => r.data,
    enabled: Boolean(kode),
    retry: false,
  });
}

export function useRiwayat(phone: string | null) {
  return useQuery({
    queryKey: ["riwayat", phone],
    queryFn: () =>
      api.get<RiwayatResponse>(`/riwayat${qs({ nomor_hp: phone })}`),
    enabled: Boolean(phone),
    retry: false,
    staleTime: 0,
  });
}

export function useAdminPesananList() {
  return useQuery({
    queryKey: ["admin", "pesanan"],
    queryFn: () => api.get<{ data: OrderSummary[] }>("/admin/pesanan"),
    select: (r) => r.data,
  });
}

export function useAdminPesanan(id: number | null) {
  return useQuery({
    queryKey: ["admin", "pesanan", id],
    queryFn: () => api.get<{ data: PesananDetail }>(`/admin/pesanan/${id}`),
    select: (r) => r.data,
    enabled: Boolean(id && Number.isInteger(id)),
    retry: false,
  });
}

export function useAdminSkus() {
  return useQuery({
    queryKey: ["admin", "sku"],
    queryFn: () => api.get<{ data: AdminSku[] }>("/admin/sku"),
    select: (r) => r.data,
  });
}

export function useAdminSku(id: number | null) {
  return useQuery({
    queryKey: ["admin", "sku", id],
    queryFn: () => api.get<{ data: AdminSkuDetail }>(`/admin/sku/${id}`),
    select: (r) => r.data,
    enabled: Boolean(id && Number.isInteger(id)),
    retry: false,
  });
}

export function useAdminPenyewa() {
  return useQuery({
    queryKey: ["admin", "penyewa"],
    queryFn: () => api.get<{ data: PenyewaRow[] }>("/admin/penyewa"),
    select: (r) => r.data,
  });
}

export function useCreatePublicPesanan() {
  const refresh = useRefreshOrderData();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) =>
      api.post<{ id: number; kode: string }>("/pesanan", payload),
    onSuccess: refresh,
  });
}

export function useCreateAdminPesanan() {
  const refresh = useRefreshOrderData();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) =>
      api
        .post<{ data: PesananDetail }>("/admin/pesanan", payload)
        .then((r) => r.data),
    onSuccess: refresh,
  });
}

function useOrderAction<TVars>(
  buildFn: (vars: TVars) => Promise<{ data: PesananDetail }>,
) {
  const refresh = useRefreshOrderData();
  return useMutation({
    mutationFn: (vars: TVars) => buildFn(vars).then((r) => r.data),
    onSuccess: refresh,
  });
}

export function useApproveOrder() {
  return useOrderAction<{ id: number }>(({ id }) =>
    api.post<{ data: PesananDetail }>(`/admin/pesanan/${id}/setujui`),
  );
}

export function useRejectOrder() {
  return useOrderAction<{ id: number }>(({ id }) =>
    api.post<{ data: PesananDetail }>(`/admin/pesanan/${id}/tolak`),
  );
}

export function usePickedUpOrder() {
  return useOrderAction<{ id: number; unitIds: number[] }>(({ id, unitIds }) =>
    api.post<{ data: PesananDetail }>(`/admin/pesanan/${id}/picked-up`, {
      unitIds,
    }),
  );
}

export interface ReturnPayload {
  dikembalikanAt: string;
  inspeksi: Array<{
    unitId: number;
    kondisi: Kondisi;
    catatan: string;
    acuanIds: number[];
  }>;
}

export function useReturnOrder() {
  return useOrderAction<{ id: number; payload: ReturnPayload }>(
    ({ id, payload }) =>
      api.post<{ data: PesananDetail }>(
        `/admin/pesanan/${id}/pengembalian`,
        payload,
      ),
  );
}

export function useCompleteOrder() {
  return useOrderAction<{ id: number }>(({ id }) =>
    api.post<{ data: PesananDetail }>(`/admin/pesanan/${id}/selesai`),
  );
}

export function useRequestPayment(kode: string) {
  return useMutation({
    mutationFn: ({ jenis }: { jenis: "DP" | "Pelunasan" }) =>
      api
        .post<{ data: SnapPayment }>(`/pesanan/${kode}/bayar`, { jenis })
        .then((r) => r.data),
  });
}

export function useSinkronPembayaran(kode: string) {
  const refresh = useRefreshOrderData();
  return useMutation({
    mutationFn: () =>
      api
        .post<{ data: SyncPayment }>(`/pesanan/${kode}/sinkron-pembayaran`)
        .then((r) => r.data),
    onSuccess: refresh,
  });
}

export function useUpdateSku(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      hargaSewaPerHari?: number;
      tarifDendaHarian?: number;
      depositNormal?: number;
      depositBermasalah?: number;
    }) =>
      api
        .put<{ data: AdminSkuDetail }>(`/admin/sku/${id}`, patch)
        .then((r) => r.data),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin", "sku"] });
      void client.invalidateQueries({ queryKey: ["katalog"] });
    },
  });
}

export function useMarkUnitBaik() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (unitId: number) =>
      api.patch<{ data: unknown }>(`/admin/unit/${unitId}/kondisi`, {
        kondisi: "Baik",
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin", "sku"] });
      void client.invalidateQueries({ queryKey: ["katalog"] });
    },
  });
}
