'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { EditTrainingModal } from '@/components/trainings/edit-training-modal';
import { DeleteTrainingDialog } from '@/components/trainings/delete-training-dialog';
import { AttendanceTracker } from '@/components/trainings/attendance-tracker';
import { fetchTrainingDetail, fetchTrainingAttendance } from '@/lib/supabase/trainings';
import { fetchTeamPlayers } from '@/lib/supabase/teams';
import { isDemoMode } from '@/lib/demo-data';
import { formatDate, formatTime } from '@/lib/utils';
import type { AttendanceStatus } from '@/types/database';
import {
  ArrowLeft,
  Dumbbell,
  Users,
  Pencil,
  Trash2,
  Clock,
  MapPin,
  Calendar,
  FileText,
  Loader2,
} from 'lucide-react';

type Tab = 'overview' | 'attendance';

export default function TrainingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trainingId = params.id as string;
  const { isCoachOrAbove } = useAuthStore();

  const [training, setTraining] = useState<any>(null);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const canManage = isCoachOrAbove();

  // Fetch data
  useEffect(() => {
    if (isDemoMode()) {
      setIsLoading(false);
      return;
    }

    async function load() {
      setIsLoading(true);

      const [trainingRes, attendanceRes] = await Promise.all([
        fetchTrainingDetail(trainingId),
        fetchTrainingAttendance(trainingId),
      ]);

      if (trainingRes.data) {
        setTraining(trainingRes.data);
        // Also fetch the team's players for attendance
        const { data: players } = await fetchTeamPlayers(trainingRes.data.team_id);
        if (players) setTeamPlayers(players);
      }

      if (attendanceRes.data) {
        setAttendanceRecords(attendanceRes.data);
      }

      setIsLoading(false);
    }

    load();
  }, [trainingId]);

  // Build initial attendance map from existing records
  const initialAttendance = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    attendanceRecords.forEach((record: any) => {
      const playerId = record.player?.id || record.player_id;
      if (playerId) {
        map[playerId] = record.status;
      }
    });
    return map;
  }, [attendanceRecords]);

  const refetch = async () => {
    const [trainingRes, attendanceRes] = await Promise.all([
      fetchTrainingDetail(trainingId),
      fetchTrainingAttendance(trainingId),
    ]);
    if (trainingRes.data) setTraining(trainingRes.data);
    if (attendanceRes.data) setAttendanceRecords(attendanceRes.data);
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Übersicht', icon: Dumbbell },
    { key: 'attendance', label: 'Anwesenheit', icon: Users },
  ];

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Not found
  if (!training) {
    return (
      <div className="space-y-4">
        <Link
          href="/trainings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Trainings
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="font-medium text-gray-900">Training nicht gefunden</p>
            <p className="mt-1 text-sm text-gray-500">
              Dieses Training existiert nicht oder wurde gelöscht.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teamName = training.team?.name ?? '–';
  const teamCategory = training.team?.category ?? '';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/trainings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Trainings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {training.focus || 'Training'}
            </h1>
            <Badge variant="default">{teamName}</Badge>
            {teamCategory && (
              <Badge variant="default">{teamCategory}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(training.date)} · {formatTime(training.start_time)}
            {training.end_time && ` – ${formatTime(training.end_time)}`}
          </p>
        </div>

        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(true)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <Card>
          <CardContent className="py-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InfoItem icon={Users} label="Mannschaft" value={`${teamName} (${teamCategory})`} />
              <InfoItem icon={Calendar} label="Datum" value={formatDate(training.date)} />
              <InfoItem
                icon={Clock}
                label="Zeit"
                value={`${formatTime(training.start_time)}${training.end_time ? ` – ${formatTime(training.end_time)}` : ''}`}
              />
              <InfoItem
                icon={MapPin}
                label="Ort"
                value={training.location || 'Nicht angegeben'}
              />
              <InfoItem
                icon={Dumbbell}
                label="Schwerpunkt"
                value={training.focus || 'Nicht angegeben'}
              />
              {training.notes && (
                <div className="sm:col-span-2">
                  <InfoItem icon={FileText} label="Notizen" value={training.notes} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'attendance' && (
        <Card>
          <CardContent className="py-6">
            <AttendanceTracker
              trainingId={trainingId}
              players={teamPlayers}
              initialAttendance={Object.keys(initialAttendance).length > 0 ? initialAttendance : undefined}
              canEdit={canManage}
            />
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <EditTrainingModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        training={training}
        onSuccess={refetch}
      />
      <DeleteTrainingDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        training={{ id: training.id, focus: training.focus }}
        onSuccess={() => router.push('/trainings')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper component
// ---------------------------------------------------------------------------

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50">
        <Icon className="h-4 w-4 text-emerald-600" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
