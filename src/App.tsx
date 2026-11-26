import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PublicLayout } from "./components/layout/PublicLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import { CatalogPage } from "./pages/public/CatalogPage";

const OrderDetailPage = lazy(() =>
  import("./pages/public/OrderDetailPage").then((m) => ({ default: m.OrderDetailPage })),
);
const HistoryPage = lazy(() =>
  import("./pages/public/HistoryPage").then((m) => ({ default: m.HistoryPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/public/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);
const AdminLoginPage = lazy(() =>
  import("./pages/admin/AdminLoginPage").then((m) => ({ default: m.AdminLoginPage })),
);
const AdminOrdersPage = lazy(() =>
  import("./pages/admin/AdminOrdersPage").then((m) => ({ default: m.AdminOrdersPage })),
);
const AdminNewOrderPage = lazy(() =>
  import("./pages/admin/AdminNewOrderPage").then((m) => ({ default: m.AdminNewOrderPage })),
);
const AdminOrderDetailPage = lazy(() =>
  import("./pages/admin/AdminOrderDetailPage").then((m) => ({
    default: m.AdminOrderDetailPage,
  })),
);
const AdminInventoryPage = lazy(() =>
  import("./pages/admin/AdminInventoryPage").then((m) => ({ default: m.AdminInventoryPage })),
);
const AdminSkuDetailPage = lazy(() =>
  import("./pages/admin/AdminSkuDetailPage").then((m) => ({ default: m.AdminSkuDetailPage })),
);
const AdminTenantsPage = lazy(() =>
  import("./pages/admin/AdminTenantsPage").then((m) => ({ default: m.AdminTenantsPage })),
);

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Memuat halaman.
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/pesanan/:kode" element={<OrderDetailPage />} />
          <Route path="/riwayat" element={<HistoryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/pesanan" replace />} />
          <Route path="pesanan" element={<AdminOrdersPage />} />
          <Route path="pesanan/baru" element={<AdminNewOrderPage />} />
          <Route path="pesanan/:id" element={<AdminOrderDetailPage />} />
          <Route path="inventaris" element={<AdminInventoryPage />} />
          <Route path="inventaris/:skuId" element={<AdminSkuDetailPage />} />
          <Route path="penyewa" element={<AdminTenantsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
