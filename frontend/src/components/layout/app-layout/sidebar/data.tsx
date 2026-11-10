import {
  BarChartIcon,
  BellIcon,
  ChipIcon,
  ClockIcon,
  GearIcon,
  InfoCircleIcon,
  LayoutGridIcon,
  MapIcon,
  TargetIcon,
  TaskIcon,
  UserCircleIcon,
  UserDollarIcon,
  WaterDropIcon,
} from "@/icons";
import type { NavItem } from "./types";

export const navItems: NavItem[] = [
  {
    icon: <LayoutGridIcon className="size-6" />,
    key: "dashboard",
    path: "/",
  },
  {
    icon: <MapIcon className="size-6" />,
    key: "lahan",
    path: "/lahan",
  },
  {
    icon: <ChipIcon className="size-6" />,
    key: "perangkat",
    path: "/perangkat",
  },
  {
    icon: <WaterDropIcon className="size-6" />,
    key: "penyiraman",
    path: "/penyiraman",
  },
  {
    icon: <ClockIcon className="size-6" />,
    key: "riwayat",
    path: "/riwayat",
  },
  {
    icon: <GearIcon className="size-6" />,
    key: "parameter",
    path: "/parameter",
  },
  {
    icon: <TargetIcon className="size-6" />,
    key: "kalibrasi",
    path: "/kalibrasi",
  },
  {
    icon: <BarChartIcon className="size-6" />,
    key: "laporan",
    path: "/laporan",
  },
  {
    icon: <BellIcon className="size-6" />,
    key: "notifikasi",
    path: "/notifikasi",
  },
  {
    icon: <UserCircleIcon className="size-6" />,
    key: "profil",
    path: "/profil",
  },
];

export const supportItems: NavItem[] = [
  {
    icon: <InfoCircleIcon className="size-6" />,
    key: "bantuan",
    path: "/bantuan",
  },
];

/**
 * Menu khusus admin. Phase 1 akan menyembunyikan grup ini untuk peran
 * pengguna; server tetap menolak aksesnya (E-03).
 */
export const othersItems: NavItem[] = [
  {
    icon: <UserDollarIcon className="size-6" />,
    key: "pengguna",
    path: "/pengguna",
  },
  {
    icon: <TaskIcon className="size-6" />,
    key: "audit",
    path: "/audit",
  },
];
