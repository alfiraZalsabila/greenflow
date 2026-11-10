import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

interface CreateLahanData {
  nama: string;
  lokasi: string;
  luasM2: number;
  ambangKering: number;
  ambangCukup: number;
}

interface LahanResponse {
  id: string;
  nama: string;
  lokasi: string;
  luasM2: number;
  status: "aktif" | "nonaktif";
}

export function useCreateLahan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLahanData) => api.post<LahanResponse>("/lahan", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lahan"] });
    },
  });
}
