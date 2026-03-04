'use client';

import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useClubStore } from '@/stores/club-store';
import { useAuthStore } from '@/stores/auth-store';
import { createTrainingInDb } from '@/lib/supabase/trainings';

interface CreateTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string;
  onSuccess?: () => void;
}

export function CreateTrainingModal({ isOpen, onClose, teamId, onSuccess }: CreateTrainingModalProps) {
  const { teams } = useClubStore();
  const { profile } = useAuthStore();

  const [selectedTeamId, setSelectedTeamId] = useState(teamId || '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [focus, setFocus] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamOptions = [
    { value: '', label: 'Mannschaft wählen' },
    ...teams.map((t) => ({ value: t.id, label: `${t.name} (${t.category})` })),
  ];

  const resetForm = () => {
    setSelectedTeamId(teamId || '');
    setDate('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setFocus('');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !date || !startTime) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: dbError } = await createTrainingInDb({
        team_id: selectedTeamId,
        date,
        start_time: startTime,
        end_time: endTime || null,
        location: location.trim() || null,
        focus: focus.trim() || null,
        notes: notes.trim() || null,
        created_by: profile?.id || null,
      });

      if (dbError) throw dbError;

      handleClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Training konnte nicht erstellt werden');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Training erstellen" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Select
          id="training-team"
          label="Mannschaft *"
          options={teamOptions}
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          required
        />

        <Input
          id="training-date"
          label="Datum *"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="training-start"
            label="Startzeit *"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            id="training-end"
            label="Endzeit"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <Input
          id="training-location"
          label="Ort"
          placeholder="z.B. Hauptplatz A"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <Input
          id="training-focus"
          label="Schwerpunkt"
          placeholder="z.B. Passspiel, Taktik, Kondition"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
        />

        <div className="space-y-1">
          <label htmlFor="training-notes" className="block text-sm font-medium text-gray-700">
            Notizen
          </label>
          <textarea
            id="training-notes"
            rows={3}
            placeholder="Zusätzliche Hinweise zum Training..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedTeamId || !date || !startTime}>
            {isSubmitting ? 'Wird erstellt...' : 'Training erstellen'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
