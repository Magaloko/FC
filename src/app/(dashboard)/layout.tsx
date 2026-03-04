'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useClubStore } from '@/stores/club-store';
import { AppShell } from '@/components/layout/app-shell';
import { Loader2 } from 'lucide-react';
import { isDemoMode, DEMO_PROFILE, DEMO_CLUB, DEMO_TEAMS } from '@/lib/demo-data';

function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setProfile, setLoading: setAuthLoading } = useAuthStore();
  const { setCurrentClub, setTeams } = useClubStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // --- Demo Mode: skip Supabase, load mock data ---
      if (isDemoMode()) {
        setProfile(DEMO_PROFILE);
        setCurrentClub(DEMO_CLUB);
        setTeams(DEMO_TEAMS);
        setAuthLoading(false);
        setIsReady(true);
        return;
      }

      const supabase = createClient();

      // Check authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/login');
        return;
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Failed to fetch profile:', profileError);
        router.push('/login');
        return;
      }

      setProfile(profile);

      // If user belongs to a club, fetch club and teams
      if (profile.club_id) {
        const [clubResult, teamsResult] = await Promise.all([
          supabase
            .from('clubs')
            .select('*')
            .eq('id', profile.club_id)
            .single(),
          supabase
            .from('teams')
            .select('*')
            .eq('club_id', profile.club_id)
            .order('category', { ascending: true }),
        ]);

        if (clubResult.data) {
          setCurrentClub(clubResult.data);
        }

        if (teamsResult.data) {
          setTeams(teamsResult.data);
        }
      }

      setAuthLoading(false);
      setIsReady(true);
    };

    init();
  }, [router, setProfile, setAuthLoading, setCurrentClub, setTeams]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
