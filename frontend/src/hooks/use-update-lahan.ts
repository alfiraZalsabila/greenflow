import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

interface UpdateLahanData {
  nama?: string;
  lokasi?: string;
  luasM2?: number;
  ambangKering?: number;
  ambangCukup?: number;
}

interface LahanResponse {
  id: string;
  nama: string;
  lokasi: string;
  luasM2: number;
  status: "aktif" | "nonaktif";
}

export function useUpdateLahan(lahanId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateLahanData) =>
      api.patch<LahanResponse>(`/lahan/${lahanId}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lahan"] });
    },
  });
}
