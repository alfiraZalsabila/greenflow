import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { PageMeta } from "@/components/shared/page-meta";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LeafIcon } from "@/icons";

interface PlaceholderPageProps {
  title: string;
  description: string;
  reference?: string;
}

/**
 * Kerangka halaman Phase 0. Isi sebenarnya ditambahkan pada fase fitur
 * masing-masing; halaman ini menjaga rute, judul, dan navigasi tetap utuh.
 */
export function PlaceholderPage({
  title,
  description,
  reference,
}: PlaceholderPageProps) {
  return (
    <div>
      <PageMeta title={`${title} | GREENFLOW`} description={description} />
      <PageBreadcrumb pageTitle={title} />

      <Card className="max-w-3xl">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <LeafIcon className="size-6" />
          </span>

          <div className="space-y-3">
            <Badge variant="light" color="success" size="sm">
              Tahap berikutnya
            </Badge>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {description}
            </p>
            {reference ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Rujukan: {reference}
              </p>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
