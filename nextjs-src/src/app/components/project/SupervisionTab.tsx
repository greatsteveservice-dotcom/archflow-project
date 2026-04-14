'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ProjectWithStats, VisitWithStats, ProjectMemberWithProfile } from '../../lib/types';
import PhotoGallery from '../supervision/PhotoGallery';
import CameraView from '../supervision/CameraView';
import SupervisionSettings from '../supervision/SupervisionSettings';

const CalendarView = dynamic(() => import('../supervision/CalendarView'), { loading: () => null, ssr: false });
const ReportsListView = dynamic(() => import('../supervision/ReportsListView'), { loading: () => null, ssr: false });
const ReportDetailView = dynamic(() => import('../supervision/ReportDetailView'), { loading: () => null, ssr: false });
const ContractorTasksView = dynamic(() => import('../supervision/ContractorTasksView'), { loading: () => null, ssr: false });

const SUB_TABS = [
  { id: 'settings', label: 'Настройки надзора' },
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
  canSendReport?: boolean;
  canAcknowledgeReport?: boolean;
  members?: ProjectMemberWithProfile[];
}

export default function SupervisionTab({
  project, projectId, visits, toast,
  refetchVisits, refetchProject, onSelectVisit,
  canCreateVisit = true, canUploadPhoto = true,
  canChangePhotoStatus = true, canManageTasks = true,
  canEditProjectSettings = true, canSendReport = false,
  canAcknowledgeReport = false, members = [],
}: SupervisionTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

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
                <span className="af-tab-name">{tab.label}</span>
                <span className="af-tab-index">{String(idx + 1).padStart(2, '0')}</span>
              </div>
              <span className="af-tab-arrow">→</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <button
        onClick={() => {
          if (selectedReportId) { setSelectedReportId(null); return; }
          setActiveSubTab(null);
        }}
        style={{
          fontFamily: 'var(--af-font-mono)',
          fontSize: 8,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#111',
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
        {activeSubTab === 'settings' && (
          <SupervisionSettings
            projectId={projectId}
            toast={toast}
          />
        )}
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
            onAddPhoto={() => setActiveSubTab('calendar')}
          />
        )}
        {activeSubTab === 'reports' && !selectedReportId && (
          <ReportsListView
            projectId={projectId}
            toast={toast}
            onSelectReport={setSelectedReportId}
          />
        )}
        {activeSubTab === 'reports' && selectedReportId && (
          <ReportDetailView
            reportId={selectedReportId}
            projectId={projectId}
            toast={toast}
            onBack={() => setSelectedReportId(null)}
            members={members}
            canSendReport={canSendReport}
            canAcknowledgeReport={canAcknowledgeReport}
          />
        )}
        {activeSubTab === 'tasks' && (
          <ContractorTasksView
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
