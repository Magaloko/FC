'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { deleteTrainingInDb } from '@/lib/supabase/trainings';

interface DeleteTrainingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  training: { id: string; focus: string | null } | null;
  onSuccess?: () => void;
}

export function DeleteTrainingDialog({ isOpen, onClose, training, onSuccess }: DeleteTrainingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!training) return;
    setIsLoading(true);

    try {
      const { error } = await deleteTrainingInDb(training.id);
      if (error) throw error;

      onClose();
      onSuccess?.();
    } catch (err) {
      console.error('Failed to delete training:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const label = training?.focus || 'Dieses Training';

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Training löschen"
      message={`Das Training „${label}" und alle zugehörigen Anwesenheitsdaten werden unwiderruflich gelöscht.`}
      confirmLabel="Training löschen"
      isLoading={isLoading}
    />
  );
}
