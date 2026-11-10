import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useDeleteDevice(deviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete(`/devices/${deviceId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
