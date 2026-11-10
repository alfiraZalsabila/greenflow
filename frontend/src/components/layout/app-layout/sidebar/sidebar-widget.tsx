import { LeafIcon } from "@/icons";
import { Link } from "react-router";

export default function SidebarWidget() {
  return (
    <div className="mx-auto rounded-2xl bg-brand-50 px-4 py-5 text-center dark:bg-brand-500/10">
      <div className="mx-auto mb-2 flex size-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
        <LeafIcon className="size-5" />
      </div>
      <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
        GREENFLOW
      </h3>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Panel irigasi otomatis tanaman sawi.
      </p>
      <Link
        to="/bantuan"
        className="flex items-center justify-center rounded-lg bg-brand-600 p-2.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        Buka bantuan
      </Link>
    </div>
  );
}
