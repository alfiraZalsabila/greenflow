import GridShape from "@/components/shared/grid-shape";
import { PageMeta } from "@/components/shared/page-meta";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";

export default function Error403Page() {
  return (
    <div className="relative z-1 flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white p-6 dark:bg-gray-900">
      <PageMeta
        title="Akses Ditolak | GREENFLOW"
        description="Anda tidak memiliki hak akses ke halaman ini."
      />
      <GridShape />

      <div className="mx-auto w-full max-w-lg text-center">
        <p className="mb-2 text-sm font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-300">
          Galat E-03
        </p>
        <h1 className="text-title-md mb-4 font-bold text-gray-800 xl:text-title-2xl dark:text-white/90">
          Akses ditolak
        </h1>
        <p className="mb-8 text-base text-gray-600 dark:text-gray-300">
          Anda tidak memiliki hak akses untuk membuka halaman ini. Halaman Kelola
          Akun Pengguna dan Log Aktivitas hanya tersedia untuk admin.
        </p>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link to="/" />}
          className="h-12.5"
        >
          Kembali ke dashboard
        </Button>
      </div>
    </div>
  );
}
