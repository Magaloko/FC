import type { Profile, Club, Team } from '@/types/database';

// ============================================================================
// Demo Mode - allows exploring the app without Supabase
// ============================================================================

export const DEMO_PROFILE: Profile = {
  id: 'demo-user-001',
  user_id: 'demo-user-001',
  club_id: 'demo-club-001',
  full_name: 'Max Mustermann',
  email: 'demo@fcmanager.app',
  role: 'admin',
  avatar_url: null,
  phone: '+49 170 1234567',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEMO_CLUB: Club = {
  id: 'demo-club-001',
  name: 'FC Musterstadt',
  logo_url: null,
  address: 'Sportplatzweg 1',
  city: 'Musterstadt',
  country: 'Deutschland',
  founded_year: 1920,
  website: 'https://fc-musterstadt.de',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEMO_TEAMS: Team[] = [
  {
    id: 'demo-team-u10',
    club_id: 'demo-club-001',
    name: 'U10 Jugend',
    category: 'U10',
    season: '2025/2026',
    coach_id: null,
    assistant_coach_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-team-u12',
    club_id: 'demo-club-001',
    name: 'U12 Entwicklung',
    category: 'U12',
    season: '2025/2026',
    coach_id: null,
    assistant_coach_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-team-u14',
    club_id: 'demo-club-001',
    name: 'U14 Akademie',
    category: 'U14',
    season: '2025/2026',
    coach_id: null,
    assistant_coach_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-team-u16',
    club_id: 'demo-club-001',
    name: 'U16 Junior',
    category: 'U16',
    season: '2025/2026',
    coach_id: null,
    assistant_coach_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-team-first',
    club_id: 'demo-club-001',
    name: 'Erste Mannschaft',
    category: 'First Team',
    season: '2025/2026',
    coach_id: null,
    assistant_coach_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEMO_COOKIE = 'fc_demo_mode';

export function enableDemoMode() {
  if (typeof window !== 'undefined') {
    document.cookie = `${DEMO_COOKIE}=true;path=/;max-age=86400;SameSite=Lax`;
  }
}

export function disableDemoMode() {
  if (typeof window !== 'undefined') {
    document.cookie = `${DEMO_COOKIE}=;path=/;max-age=0`;
  }
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return document.cookie.includes(`${DEMO_COOKIE}=true`);
}

/** Check demo cookie from a NextRequest (server-side / middleware) */
export function isDemoModeServer(cookieValue: string | undefined): boolean {
  return cookieValue === 'true';
}
