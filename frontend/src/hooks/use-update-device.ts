import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

interface UpdateDeviceData {
  nama?: string;
  tipe?: "pengendali" | "sensor" | "pompa";
  lahanId?: string;
}

interface DeviceResponse {
  id: string;
  nama: string;
  tipe: "pengendali" | "sensor" | "pompa";
  lahanId: string;
  status: "aktif" | "nonaktif";
}

export function useUpdateDevice(deviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDeviceData) =>
      api.patch<DeviceResponse>(`/devices/${deviceId}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
