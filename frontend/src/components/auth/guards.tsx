import type { Role } from "@greenflow/shared";
import { Navigate, Outlet, useLocation } from "react-router";

import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";

function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
      <Spinner className="size-8 text-brand-600 dark:text-brand-400" />
      <span className="sr-only">Memuat sesi…</span>
    </div>
  );
}

export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <SessionLoading />;
  if (!user) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}

export function RequireRole({ role }: { role: Role }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <SessionLoading />;
  if (!user) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  if (user.peran !== role) return <Navigate to="/error-403" replace />;

  return <Outlet />;
}

/** Halaman autentikasi tidak perlu ditampilkan bila sesi masih aktif. */
export function PublicOnly() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <SessionLoading />;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}
