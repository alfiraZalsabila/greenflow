import { RequireAuth, RequireRole, PublicOnly } from "@/components/auth/guards";
import AppLayout from "@/components/layout/app-layout";
import AuditPage from "@/pages/main/audit";
import BantuanPage from "@/pages/main/bantuan";
import DashboardPage from "@/pages/main/dashboard";
import KalibrasiPage from "@/pages/main/kalibrasi";
import LahanPage from "@/pages/main/lahan";
import LaporanPage from "@/pages/main/laporan";
import NotifikasiPage from "@/pages/main/notifikasi";
import ParameterPage from "@/pages/main/parameter";
import PenggunaPage from "@/pages/main/pengguna";
import PenyiramanPage from "@/pages/main/penyiraman";
import PerangkatPage from "@/pages/main/perangkat";
import ProfilPage from "@/pages/main/profil";
import RiwayatPage from "@/pages/main/riwayat";
import {
  Error403Page,
  Error404Page,
} from "@/pages/main/pages";
import {
  AuthLayout,
  ResetPasswordPage,
  SignInPage,
  SignUpPage,
} from "@/pages/others/auth";
import "flatpickr/dist/flatpickr.css";
import { Route, Routes, Navigate } from "react-router";

export default function App() {
  return (
    <Routes>
      {/* Area aplikasi */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/lahan" element={<LahanPage />} />
          <Route path="/perangkat" element={<PerangkatPage />} />
          <Route path="/penyiraman" element={<PenyiramanPage />} />
          <Route path="/kontrol-penyiraman" element={<Navigate to="/penyiraman" replace />} />
          <Route path="/riwayat" element={<RiwayatPage />} />
          <Route path="/parameter" element={<ParameterPage />} />
          <Route path="/kalibrasi" element={<KalibrasiPage />} />
          <Route path="/laporan" element={<LaporanPage />} />
          <Route path="/notifikasi" element={<NotifikasiPage />} />
          <Route path="/profil" element={<ProfilPage />} />
          <Route path="/bantuan" element={<BantuanPage />} />

          {/* Khusus admin; server tetap menolak akses langsung (E-03). */}
          <Route element={<RequireRole role="admin" />}>
            <Route path="/pengguna" element={<PenggunaPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Route>
        </Route>
      </Route>

      {/* Area autentikasi */}
      <Route element={<PublicOnly />}>
        <Route element={<AuthLayout />}>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Route>

      {/* Error & fallback */}
      <Route path="/error-403" element={<Error403Page />} />
      <Route path="/error-404" element={<Error404Page />} />
      <Route path="*" element={<Error404Page />} />
    </Routes>
  );
}
