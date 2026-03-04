import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  // If Supabase is not configured, redirect to login
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect('/login');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
