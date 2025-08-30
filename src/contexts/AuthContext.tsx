// src/contexts/AuthContext.tsx (VERSÃO FINAL E CORRETA)

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface Profile {
  billing_status: string;
  current_period_ends_at: string;
}

interface AuthContextType {
  session: boolean;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. FUNÇÃO PRINCIPAL: Busca o usuário e o perfil. É a nossa única fonte da verdade.
    const checkUserAndProfile = async (sessionUser: User | null) => {
      setUser(sessionUser);
      setError(null);

      if (sessionUser) {
        try {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('billing_status, current_period_ends_at')
            .eq('id', sessionUser.id)
            .single();
          if (profileError) throw profileError;
          setProfile(data);
        } catch (err: any) {
          setError(err.message);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      // O loading SÓ termina depois que todo o processo é concluído.
      setLoading(false);
    };

    // 2. BUSCA INICIAL: Verificamos a sessão uma vez no carregamento.
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("AuthProvider: Sessão inicial verificada.");
      checkUserAndProfile(session?.user || null);
    });

    // 3. LISTENER PARA MUDANÇAS: O listener agora SÓ serve para detectar logins/logouts
    //    que acontecem DEPOIS do carregamento inicial.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("AuthProvider: Estado de autenticação MUDOU.");
        checkUserAndProfile(session?.user || null);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []); // O array vazio garante que esta configuração rode apenas uma vez.

  const value = { session: !!user, user, profile, loading, error };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};