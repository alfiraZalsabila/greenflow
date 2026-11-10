import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "@/i18n";
import { BellIcon, XIcon } from "@/icons";
import { cn } from "@/utils";
import { Fragment, useState, useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Spinner } from "@/components/ui/spinner";
import type { NotificationItem } from "./types";

export default function NotificationDropdown() {
  const t = useTranslations("header.notifications");
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);

  // Fetch notifications from API
  const { data: notifikasi = [], isLoading } = useQuery({
    queryKey: ["notifications-dropdown"],
    queryFn: async () => {
      try {
        const result = await api.get<{ notifikasi: NotificationItem[] }>(`/notifikasi?limit=5`);
        return result.notifikasi || [];
      } catch (err) {
        console.error("Error fetching notifications:", err);
        return [];
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setNotifying(false);
    }
  };

  // Get unread count
  const unreadCount = useMemo(() => {
    return notifikasi.filter((n) => !n.baca).length;
  }, [notifikasi]);

  // Update notifying state when unread count changes
  if (unreadCount > 0 && !notifying) {
    setNotifying(true);
  }

  const getTypeIcon = (tipe: string) => {
    switch (tipe) {
      case "kering_soil":
        return "🌵";
      case "pump_failure":
        return "💧";
      case "sensor_error":
        return "📡";
      case "manual_trigger":
        return "👤";
      case "system_alert":
        return "⚙️";
      default:
        return "📢";
    }
  };

  const getTypeLabel = (tipe: string) => {
    switch (tipe) {
      case "kering_soil":
        return "Tanah Kering";
      case "pump_failure":
        return "Pompa Gagal";
      case "sensor_error":
        return "Error Sensor";
      case "manual_trigger":
        return "Trigger Manual";
      case "system_alert":
        return "Alert Sistem";
      default:
        return tipe;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "text-red-500 dark:text-red-400";
      case "warning":
        return "text-orange-500 dark:text-orange-400";
      case "info":
        return "text-blue-500 dark:text-blue-400";
      default:
        return "text-gray-500 dark:text-gray-400";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "baru saja";
    if (diffMins < 60) return `${diffMins}m lalu`;
    if (diffHours < 24) return `${diffHours}h lalu`;
    return date.toLocaleString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            className="relative"
            aria-label="Toggle notifications"
          >
            {unreadCount > 0 && (
              <>
                <span
                  className={cn(
                    "absolute inset-e-0 -top-0.5 z-10 h-2 w-2 translate-x-1/2 rounded-full bg-orange-400 rtl:-inset-e-1.5",
                    !notifying ? "hidden" : "flex",
                  )}
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                </span>
              </>
            )}
            <BellIcon className="size-auto!" />
          </Button>
        }
      />

      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-87.5 overflow-hidden p-3 sm:w-90.25 dark:bg-[#1E2635]"
      >
        <div className="flex items-center justify-between pb-3">
          <div>
            <h5 className="text-title-sm font-semibold text-gray-800 dark:text-gray-200">
              {t("title")}
            </h5>
            {unreadCount > 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400">
                {unreadCount} notifikasi baru
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setIsOpen(false)}
            className="size-"
            aria-label="Close notifications"
          >
            <XIcon className="size-5" />
          </Button>
        </div>

        <DropdownMenuSeparator className="my-0" />

        <ScrollArea scrollbars="vertical" className="h-96">
          <div className="flex flex-col pe-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <Spinner className="size-5" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Memuat notifikasi...</p>
              </div>
            ) : notifikasi.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <div className="text-2xl">📭</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tidak ada notifikasi</p>
              </div>
            ) : (
              notifikasi.map((item) => (
                <Fragment key={item.id}>
                  <DropdownMenuItem
                    className={cn(
                      "flex flex-col gap-2 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-white/5",
                      !item.baca ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`text-lg flex-shrink-0 ${getSeverityColor(item.severity)}`}>
                        {getTypeIcon(item.tipe)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90 line-clamp-1">
                              {getTypeLabel(item.tipe)}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                              {item.pesan}
                            </p>
                          </div>
                          {!item.baca && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatTime(item.dibuatPada)}</span>
                          {item.severity === "error" && (
                            <>
                              <span>•</span>
                              <span className="text-red-500 dark:text-red-400 font-medium">Penting</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-0.5 bg-gray-100 last-of-type:hidden dark:bg-gray-700" />
                </Fragment>
              ))
            )}
          </div>
        </ScrollArea>

        <Button
          variant="outline"
          size="default"
          nativeButton={false}
          render={<Link to="/notifikasi" />}
          className="mt-3 w-full"
          onClick={() => setIsOpen(false)}
        >
          {t("viewAll")}
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
