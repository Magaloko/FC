import { createClient } from './client';
import type { AttendanceStatus } from '@/types/database';

/**
 * Fetch all trainings for a club (via team join), including attendance records for counts.
 */
export async function fetchTrainings(clubId: string) {
  const supabase = createClient();
  return supabase
    .from('trainings')
    .select(
      `*,
      team:teams!inner(id, name, club_id, category),
      training_attendance(id, status)`
    )
    .eq('team.club_id', clubId)
    .order('date', { ascending: false });
}

/**
 * Fetch a single training by ID with team info.
 */
export async function fetchTrainingDetail(trainingId: string) {
  const supabase = createClient();
  return supabase
    .from('trainings')
    .select('*, team:teams(id, name, category)')
    .eq('id', trainingId)
    .single();
}

/**
 * Fetch attendance records for a training, with player info.
 */
export async function fetchTrainingAttendance(trainingId: string) {
  const supabase = createClient();
  return supabase
    .from('training_attendance')
    .select('*, player:players(id, name, jersey_number, photo_url)')
    .eq('training_id', trainingId)
    .order('created_at', { ascending: true });
}

/**
 * Insert a new training session.
 */
export async function createTrainingInDb(data: {
  team_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  focus: string | null;
  notes: string | null;
  created_by: string | null;
}) {
  const supabase = createClient();
  return supabase.from('trainings').insert(data).select().single();
}

/**
 * Update an existing training session.
 */
export async function updateTrainingInDb(
  trainingId: string,
  data: {
    team_id?: string;
    date?: string;
    start_time?: string;
    end_time?: string | null;
    location?: string | null;
    focus?: string | null;
    notes?: string | null;
  }
) {
  const supabase = createClient();
  return supabase.from('trainings').update(data).eq('id', trainingId).select().single();
}

/**
 * Delete a training session by ID (cascade deletes attendance).
 */
export async function deleteTrainingInDb(trainingId: string) {
  const supabase = createClient();
  return supabase.from('trainings').delete().eq('id', trainingId);
}

/**
 * Batch upsert attendance records for a training.
 * Uses the UNIQUE constraint on (training_id, player_id).
 */
export async function upsertAttendance(
  trainingId: string,
  records: { player_id: string; status: AttendanceStatus; notes?: string | null }[]
) {
  const supabase = createClient();
  const rows = records.map((r) => ({
    training_id: trainingId,
    player_id: r.player_id,
    status: r.status,
    notes: r.notes ?? null,
  }));
  return supabase
    .from('training_attendance')
    .upsert(rows, { onConflict: 'training_id,player_id' })
    .select();
}
