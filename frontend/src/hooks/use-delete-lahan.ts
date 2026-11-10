import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useDeleteLahan(lahanId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete(`/lahan/${lahanId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lahan"] });
    },
  });
}
