
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface Profile {
  billing_status: string;
  current_period_ends_at: string;
}

export const useProfile = (user: User | null) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('billing_status, current_period_ends_at')
            .eq('id', user.id)
            .single();

          if (error) {
            throw error;
          }

          setProfile(data);
        } catch (err: any) {
          setError(err.message);
          console.error("Error fetching profile:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    }
  }, [user]);

  return { profile, loading, error };
};
