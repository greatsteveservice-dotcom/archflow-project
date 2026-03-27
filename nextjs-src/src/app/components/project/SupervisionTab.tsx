'use client';
import { useState } from 'react';
import { Icons } from '../Icons';
import type { ProjectWithStats, VisitWithStats, ProjectMemberWithProfile } from '../../lib/types';
import CalendarView from '../supervision/CalendarView';
import PhotoGallery from '../supervision/PhotoGallery';
import ReportsView from '../supervision/ReportsView';
import TasksView from '../supervision/TasksView';
import CameraView from '../supervision/CameraView';

const SUB_TABS = [
  { id: 'calendar', label: 'Календарь', icon: Icons.Calendar },
  { id: 'photos', label: 'Фото', icon: Icons.Camera },
  { id: 'reports', label: 'Отчёты', icon: Icons.File },
  { id: 'tasks', label: 'Задачи', icon: Icons.List },
  { id: 'camera', label: 'Камера', icon: Icons.Camera },
] as const;

type SubTabId = (typeof SUB_TABS)[number]['id'];

interface SupervisionTabProps {
  project: ProjectWithStats;
  projectId: string;
  visits: VisitWithStats[];
  toast: (msg: string) => void;
  refetchVisits: () => void;
  refetchProject: () => void;
  onSelectVisit: (visitId: string) => void;
  canCreateVisit?: boolean;
  canUploadPhoto?: boolean;
  canChangePhotoStatus?: boolean;
  canManageTasks?: boolean;
  canEditProjectSettings?: boolean;
  members?: ProjectMemberWithProfile[];
}

export default function SupervisionTab({
  project, projectId, visits, toast,
  refetchVisits, refetchProject, onSelectVisit,
  canCreateVisit = true, canUploadPhoto = true,
  canChangePhotoStatus = true, canManageTasks = true,
  canEditProjectSettings = true, members = [],
}: SupervisionTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('calendar');

  return (
    <div className="animate-fade-in">
      {/* Pill sub-tabs */}
      <div className="stab mb-5 w-fit">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`stb ${activeSubTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {activeSubTab === 'calendar' && (
          <CalendarView
            projectId={projectId}
            visits={visits}
            toast={toast}
            refetchVisits={() => { refetchVisits(); refetchProject(); }}
            canCreateVisit={canCreateVisit}
          />
        )}
        {activeSubTab === 'photos' && (
          <PhotoGallery
            projectId={projectId}
            toast={toast}
            canChangePhotoStatus={canChangePhotoStatus}
          />
        )}
        {activeSubTab === 'reports' && (
          <ReportsView
            visits={visits}
            onSelectVisit={onSelectVisit}
          />
        )}
        {activeSubTab === 'tasks' && (
          <TasksView
            projectId={projectId}
            toast={toast}
            canManageTasks={canManageTasks}
            members={members}
          />
        )}
        {activeSubTab === 'camera' && (
          <CameraView
            projectId={projectId}
            webcamUrl={project.webcam_url}
            toast={toast}
            canEdit={canEditProjectSettings}
            refetchProject={refetchProject}
          />
        )}
      </div>
    </div>
  );
}
