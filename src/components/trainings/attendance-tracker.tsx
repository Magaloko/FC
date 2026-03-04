'use client';

import { useState, useMemo, useEffect } from 'react';
import type { AttendanceStatus } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { upsertAttendance } from '@/lib/supabase/trainings';
import { Save, Check } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerEntry {
  id: string;
  name: string;
  jersey_number: number | null;
  photo_url: string | null;
}

interface AttendanceTrackerProps {
  trainingId: string;
  players: PlayerEntry[];
  initialAttendance?: Record<string, AttendanceStatus>;
  canEdit?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'present', label: 'Anwesend' },
  { value: 'late', label: 'Verspätet' },
  { value: 'injured', label: 'Verletzt' },
  { value: 'absent', label: 'Abwesend' },
];

const STATUS_BADGE_VARIANT: Record<AttendanceStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  present: 'success',
  late: 'warning',
  injured: 'danger',
  absent: 'default',
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Anwesend',
  late: 'Verspätet',
  injured: 'Verletzt',
  absent: 'Abwesend',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AttendanceTracker({ trainingId, players, initialAttendance, canEdit = true }: AttendanceTrackerProps) {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise from prop
  useEffect(() => {
    if (initialAttendance && Object.keys(initialAttendance).length > 0) {
      setAttendance(initialAttendance);
    } else {
      // Default all players to 'present'
      const defaults: Record<string, AttendanceStatus> = {};
      players.forEach((p) => {
        defaults[p.id] = 'present';
      });
      setAttendance(defaults);
    }
  }, [initialAttendance, players]);

  function updateStatus(playerId: string, status: AttendanceStatus) {
    setAttendance((prev) => ({ ...prev, [playerId]: status }));
    setSaveSuccess(false);
  }

  // Summary counts
  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      present: 0,
      late: 0,
      injured: 0,
      absent: 0,
    };
    Object.values(attendance).forEach((status) => {
      counts[status]++;
    });
    return counts;
  }, [attendance]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const records = Object.entries(attendance).map(([player_id, status]) => ({
        player_id,
        status,
      }));

      const { error: dbError } = await upsertAttendance(trainingId, records);
      if (dbError) throw dbError;

      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anwesenheit konnte nicht gespeichert werden');
    } finally {
      setIsSaving(false);
    }
  };

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-gray-500">
          Keine Spieler in dieser Mannschaft. Füge zuerst Spieler hinzu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
          <Check className="h-4 w-4" />
          Anwesenheit erfolgreich gespeichert
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Spieler</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {players.map((player) => {
              const status = attendance[player.id] || 'present';
              return (
                <tr key={player.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={player.photo_url} name={player.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{player.name}</p>
                        {player.jersey_number != null && (
                          <p className="text-xs text-gray-500">#{player.jersey_number}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit ? (
                        <Select
                          options={STATUS_OPTIONS}
                          value={status}
                          onChange={(e) => updateStatus(player.id, e.target.value as AttendanceStatus)}
                          className="w-36"
                        />
                      ) : (
                        <Badge variant={STATUS_BADGE_VARIANT[status]}>
                          {STATUS_LABEL[status]}
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-sm font-medium text-gray-700">Zusammenfassung:</span>
        {(Object.keys(summary) as AttendanceStatus[]).map((status) => (
          <Badge key={status} variant={STATUS_BADGE_VARIANT[status]}>
            {STATUS_LABEL[status]}: {summary[status]}
          </Badge>
        ))}
        <span className="ml-auto text-sm text-gray-500">Gesamt: {players.length}</span>
      </div>

      {/* Save button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Wird gespeichert...' : 'Anwesenheit speichern'}
          </Button>
        </div>
      )}
    </div>
  );
}
