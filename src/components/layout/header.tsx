'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useClubStore } from '@/stores/club-store';
import { useUIStore } from '@/stores/ui-store';
import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { isDemoMode, disableDemoMode } from '@/lib/demo-data';

export function Header() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { currentClub } = useClubStore();
  const { sidebarOpen } = useUIStore();

  const handleLogout = async () => {
    if (isDemoMode()) {
      disableDemoMode();
    } else {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur-sm transition-all duration-300',
        sidebarOpen ? 'left-64' : 'left-20'
      )}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={useUIStore.getState().toggleSidebar}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        {currentClub && (
          <h2 className="text-sm font-medium text-gray-500">{currentClub.name}</h2>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <Search className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
