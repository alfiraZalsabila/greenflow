import { PageMeta } from "@/components/shared/page-meta";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";

import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";

export default function Error404Page() {
  return (
    <div>
      <PageMeta
        title="Halaman Tidak Ditemukan | GREENFLOW"
        description="Halaman yang Anda cari tidak ditemukan."
      />
      <PageBreadcrumb pageTitle="Halaman tidak ditemukan" />

      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/3">
        <p className="mb-2 text-sm font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-300">
          Galat 404
        </p>
        <h1 className="mb-3 text-2xl font-bold text-gray-800 dark:text-white/90">
          Halaman tidak ditemukan
        </h1>
        <p className="mb-6 max-w-md text-sm text-gray-600 dark:text-gray-300">
          Alamat yang Anda buka tidak tersedia atau sudah dipindahkan. Periksa
          kembali tautannya atau kembali ke dashboard.
        </p>
        <Button
          nativeButton={false}
          render={<Link to="/" />}
          className="h-11"
        >
          Kembali ke dashboard
        </Button>
      </div>
    </div>
  );
}
