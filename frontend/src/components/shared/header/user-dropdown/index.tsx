import { ROLE_LABELS } from "@greenflow/shared";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { useAuth } from "@/contexts";
import { useTranslations } from "@/i18n";
import {
  ChevronDownIcon,
  GearIcon,
  InfoCircleIcon,
  LogOutIcon,
  UserCircleIcon,
} from "@/icons";
import { cn, getInitials } from "@/utils";

export default function UserDropdown() {
  const t = useTranslations("userDropdown");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await logout();
      void navigate("/signin", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400">
        <span className="me-3 flex size-11 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          {user ? getInitials(user.nama) : <UserCircleIcon className="size-6" />}
        </span>

        <span className="me-1 hidden max-w-40 truncate text-sm font-medium sm:block">
          {user?.nama ?? "Pengguna"}
        </span>

        <ChevronDownIcon
          className={cn(
            "size-5 text-gray-500 duration-200 dark:text-gray-400",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={12} className="w-65 p-3">
        <div className="px-3 py-2">
          <span className="block truncate text-sm font-medium text-gray-700 dark:text-gray-300">
            {user?.nama ?? "Pengguna GREENFLOW"}
          </span>
          <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
            {user?.email ?? "—"}
          </span>
          {user ? (
            <span className="mt-2 inline-flex rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              {ROLE_LABELS[user.peran]}
            </span>
          ) : null}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link to="/profil" />}>
          <UserCircleIcon className="size-6" />
          {t("editProfile")}
        </DropdownMenuItem>

        <DropdownMenuItem render={<Link to="/profil" />}>
          <GearIcon className="size-6" />
          {t("accountSettings")}
        </DropdownMenuItem>

        <DropdownMenuItem render={<Link to="/bantuan" />}>
          <InfoCircleIcon className="size-6" />
          {t("support")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
        >
          <LogOutIcon />
          {isLoggingOut ? "Sedang keluar..." : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
