// src/contexts/WorkspaceContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';


interface WorkspaceContextType {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  isLoading: boolean; // 2. Adicionamos um estado de loading
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const { user, loading: profileLoading } = useAuth(); // 3. Usamos o hook para obter o usuário
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 4. Esta é a lógica que faltava!
  useEffect(() => {
    const fetchUserWorkspace = async () => {
      // Se não há usuário, não há o que fazer.
      if (!user) {
        setActiveWorkspaceId(null);
        setIsLoading(false);
        return;
      }

      console.log("WorkspaceContext: Usuário encontrado, buscando workspace...");
      setIsLoading(true);
      try {
        // Buscamos na tabela 'workspaces' pelo ID do usuário
        const { data, error } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          console.log("WorkspaceContext: Workspace ID encontrado:", data.id);
          setActiveWorkspaceId(data.id); // Colocamos o "arquivo" na gaveta!
        } else {
          console.log("WorkspaceContext: Nenhum workspace encontrado para este usuário.");
          setActiveWorkspaceId(null);
        }
      } catch (error) {
        console.error("Erro ao buscar workspace:", error);
        setActiveWorkspaceId(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Só executamos a busca QUANDO o hook useProfile terminar de carregar
    if (!profileLoading) {
      fetchUserWorkspace();
    }
  }, [user, profileLoading]); // Roda sempre que o usuário ou o status de loading do perfil mudar

  const value = { activeWorkspaceId, setActiveWorkspaceId, isLoading };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}