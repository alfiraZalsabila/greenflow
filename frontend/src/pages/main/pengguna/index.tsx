import {
  ROLE_LABELS,
  USER_STATUS_LABELS,
  type AuthUser,
  type Role,
  type UserStatus,
} from "@greenflow/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";

import { ApiError, api } from "@/api/client";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { PageMeta } from "@/components/shared/page-meta";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  CheckCircleIcon,
  GroupIcon,
  LockIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashBinIcon,
} from "@/icons";
import { useAuth } from "@/contexts";
import { formatWita, getInitials } from "@/utils";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";

type RoleFilter = Role | "semua";
type StatusFilter = UserStatus | "semua";

interface UserFilters {
  search?: string;
  peran?: Role;
  status?: UserStatus;
}

interface Feedback {
  variant: "success" | "destructive";
  text: string;
}

async function fetchUsers(
  filters: UserFilters,
  signal: AbortSignal,
): Promise<AuthUser[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.peran) params.set("peran", filters.peran);
  if (filters.status) params.set("status", filters.status);

  const query = params.toString();
  const data = await api.get<{ users: AuthUser[] }>(
    `/users${query ? `?${query}` : ""}`,
    signal,
  );
  return data.users;
}

export default function PenggunaPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("semua");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("semua");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AuthUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filters: UserFilters = {
    search: deferredSearch || undefined,
    peran: roleFilter === "semua" ? undefined : roleFilter,
    status: statusFilter === "semua" ? undefined : statusFilter,
  };

  const usersQuery = useQuery({
    queryKey: ["users", filters],
    queryFn: ({ signal }) => fetchUsers(filters, signal),
  });

  const notify = (variant: Feedback["variant"], text: string) => {
    setFeedback({ variant, text });
  };

  const runAction = async (
    target: AuthUser,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setBusyId(target.id);
    setFeedback(null);

    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      notify("success", successMessage);
    } catch (error) {
      notify(
        "destructive",
        error instanceof ApiError
          ? error.message
          : "Tindakan gagal. Silakan coba lagi.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = (target: AuthUser) => {
    const isActive = target.status === "aktif";
    return runAction(
      target,
      () =>
        api.post(
          `/users/${target.id}/${isActive ? "disable" : "enable"}`,
        ),
      isActive
        ? `Akun ${target.email} dinonaktifkan.`
        : `Akun ${target.email} diaktifkan kembali.`,
    );
  };

  const handleResetPassword = (target: AuthUser) =>
    runAction(
      target,
      () => api.post(`/users/${target.id}/reset-password`),
      `Tautan reset kata sandi untuk ${target.email} telah diminta.`,
    );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;

    await runAction(
      target,
      () => api.delete(`/users/${target.id}`),
      `Akun ${target.email} dihapus.`,
    );
    setDeleteTarget(null);
  };

  const users = usersQuery.data ?? [];
  const isLoading = usersQuery.isPending;
  const isError = usersQuery.isError;

  return (
    <div>
      <PageMeta
        title="Kelola Akun Pengguna | GREENFLOW"
        description="Kelola akun admin dan pengguna GREENFLOW."
      />
      <PageBreadcrumb pageTitle="Kelola Akun Pengguna" />

      {feedback ? (
        <Alert variant={feedback.variant} className="mb-5">
          <AlertDescription>{feedback.text}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <InputGroup className="sm:max-w-xs">
              <InputGroupAddon align="inline-start">
                <SearchIcon className="size-4 text-gray-500 dark:text-gray-400" />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="search"
                placeholder="Cari nama atau email..."
                aria-label="Cari pengguna"
              />
            </InputGroup>

            <Select
              value={roleFilter}
              onValueChange={(value) =>
                setRoleFilter(value as RoleFilter)
              }
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua peran</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="pengguna">Pengguna</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as StatusFilter)
              }
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua status</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="nonaktif">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Tambah pengguna
          </Button>
        </div>

        {isError ? (
          <div className="px-5 pb-6 sm:px-6">
            <Alert variant="destructive">
              <AlertDescription>
                Daftar pengguna gagal dimuat. Pastikan server berjalan lalu coba
                lagi.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/3">
                {[
                  "Pengguna",
                  "Peran",
                  "Status",
                  "Terakhir masuk",
                  "Aksi",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-5 py-3 text-start text-xs font-medium whitespace-nowrap text-gray-500 dark:text-gray-400"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Spinner className="mx-auto size-6 text-brand-600 dark:text-brand-400" />
                    <span className="sr-only">Memuat pengguna…</span>
                  </td>
                </tr>
              ) : null}

              {!isLoading && users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Tidak ada akun yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              ) : null}

              {users.map((item) => {
                const isSelf = item.id === currentUser?.id;
                const isBusy = busyId === item.id;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-white/2"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                          {getInitials(item.nama)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                            {item.nama}
                            {isSelf ? (
                              <span className="ms-2 text-xs font-normal text-gray-400">
                                (Anda)
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {item.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        color={item.peran === "admin" ? "primary" : "gray"}
                        size="sm"
                      >
                        {ROLE_LABELS[item.peran]}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        color={item.status === "aktif" ? "success" : "error"}
                        size="sm"
                      >
                        {USER_STATUS_LABELS[item.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {formatWita(item.terakhirMasukPada)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Ubah pengguna"
                          aria-label={`Ubah ${item.nama}`}
                          onClick={() => setEditTarget(item)}
                          disabled={isBusy}
                        >
                          <PencilIcon />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Kirim tautan reset kata sandi"
                          aria-label={`Reset kata sandi ${item.nama}`}
                          onClick={() => void handleResetPassword(item)}
                          disabled={isBusy}
                        >
                          <MailIcon />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={
                            item.status === "aktif"
                              ? "Nonaktifkan akun"
                              : "Aktifkan akun"
                          }
                          aria-label={`${
                            item.status === "aktif"
                              ? "Nonaktifkan"
                              : "Aktifkan"
                          } ${item.nama}`}
                          onClick={() => void handleToggleStatus(item)}
                          disabled={isBusy || (isSelf && item.status === "aktif")}
                        >
                          {item.status === "aktif" ? (
                            <LockIcon />
                          ) : (
                            <CheckCircleIcon />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10"
                          title="Hapus akun"
                          aria-label={`Hapus ${item.nama}`}
                          onClick={() => setDeleteTarget(item)}
                          disabled={isBusy || isSelf}
                        >
                          <TrashBinIcon />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:border-gray-800 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <GroupIcon className="size-4" />
            {users.length} akun ditampilkan
          </span>
          <span>Hanya admin yang dapat mengelola akun.</span>
        </div>
      </Card>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(message) => notify("success", message)}
      />

      <EditUserDialog
        user={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onUpdated={(message) => notify("success", message)}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus akun pengguna?</DialogTitle>
            <DialogDescription>
              Akun {deleteTarget?.email} akan dihapus permanen beserta aksesnya.
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={busyId !== null}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={busyId !== null}
            >
              {busyId !== null ? "Menghapus..." : "Hapus permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
