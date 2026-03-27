'use client';
import { useState } from 'react';
import type { ProjectWithStats, VisitWithStats, ProjectMemberWithProfile } from '../../lib/types';
import CalendarView from '../supervision/CalendarView';
import PhotoGallery from '../supervision/PhotoGallery';
import ReportsView from '../supervision/ReportsView';
import TasksView from '../supervision/TasksView';
import CameraView from '../supervision/CameraView';

const SUB_TABS = [
  { id: 'calendar', label: 'Календарь' },
  { id: 'photos', label: 'Фото' },
  { id: 'reports', label: 'Отчёты' },
  { id: 'tasks', label: 'Задачи' },
  { id: 'camera', label: 'Камера' },
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
  const [activeSubTab, setActiveSubTab] = useState<SubTabId | null>(null);

  // Tab-row list (Level 3 → Level 4 navigation)
  if (activeSubTab === null) {
    return (
      <div className="animate-fade-in">
        <div className="af-tab-list">
          {SUB_TABS.map((tab, idx) => (
            <div
              key={tab.id}
              className="af-tab-row"
              onClick={() => setActiveSubTab(tab.id)}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 15,
                  fontWeight: 400,
                  color: '#111',
                  letterSpacing: '-0.01em',
                }}>{tab.label}</span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 7,
                  letterSpacing: '0.1em',
                  color: '#CCC',
                }}>{String(idx + 1).padStart(2, '0')}</span>
              </div>
              <span style={{ fontSize: 10, color: '#CCC' }}>→</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentTab = SUB_TABS.find(t => t.id === activeSubTab);

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <button
        onClick={() => setActiveSubTab(null)}
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 8,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#AAA',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginBottom: 16,
        }}
      >
        ← Назад
      </button>

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
