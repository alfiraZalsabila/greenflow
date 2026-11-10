import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

interface CreateDeviceData {
  kodePerangkat: string;
  nama: string;
  tipe: "pengendali" | "sensor" | "pompa";
  lahanId: string;
}

interface DeviceResponse {
  id: string;
  nama: string;
  tipe: "pengendali" | "sensor" | "pompa";
  lahanId: string;
  status: "aktif" | "nonaktif";
}

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDeviceData) =>
      api.post<DeviceResponse>("/devices", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
