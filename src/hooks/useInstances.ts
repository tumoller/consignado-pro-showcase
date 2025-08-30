import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useInstances(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ['instances', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('user_instances')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}
