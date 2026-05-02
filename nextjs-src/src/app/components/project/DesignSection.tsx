'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useDesignFileCounts } from '../../lib/hooks';
import { DESIGN_FOLDERS } from '../../lib/types';
import type { DesignFolder } from '../../lib/types';
import DesignFolderView from './DesignFolderView';
import DesignFileDetail from './DesignFileDetail';
import OnboardingPanel from './OnboardingPanel';

const MoodboardCanvas = dynamic(() => import('../moodboard/MoodboardCanvas'), { loading: () => null, ssr: false });

interface DesignSectionProps {
  projectId: string;
  toast: (msg: string) => void;
  canUpload?: boolean;
  canDelete?: boolean;
  canComment?: boolean;
}

function pluralFilesLabel(n: number): string {
  if (n === 0) return 'пусто';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'файл';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'файла';
  return 'файлов';
}

export default function DesignSection({ projectId, toast, canUpload = true, canDelete = true, canComment = true }: DesignSectionProps) {
  const { data: counts, refetch: refetchCounts } = useDesignFileCounts(projectId);
  const [activeFolder, setActiveFolder] = useState<DesignFolder | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [showMoodboards, setShowMoodboards] = useState(false);

  // Moodboard (canvas workspace inside Design → 07)
  if (showMoodboards) {
    return (
      <div>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #EBEBEB' }}>
          <button
            onClick={() => setShowMoodboards(false)}
            style={{
              fontFamily: 'var(--af-font)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#111', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            ← Дизайн
          </button>
        </div>
        <MoodboardCanvas projectId={projectId} toast={toast} />
      </div>
    );
  }

  // Level 3: File detail
  if (activeFileId && activeFolder) {
    return (
      <DesignFileDetail
        fileId={activeFileId}
        projectId={projectId}
        folder={activeFolder}
        toast={toast}
        canDelete={canDelete}
        canComment={canComment}
        onBack={() => setActiveFileId(null)}
        onDeleted={() => { setActiveFileId(null); refetchCounts(); }}
      />
    );
  }

  // Level 2: Folder file list
  if (activeFolder) {
    return (
      <DesignFolderView
        projectId={projectId}
        folder={activeFolder}
        toast={toast}
        canUpload={canUpload}
        onBack={() => { setActiveFolder(null); refetchCounts(); }}
        onSelectFile={(fileId) => setActiveFileId(fileId)}
      />
    );
  }

  // Level 1: Folder grid (blocks)
  const totalFiles = counts ? Object.values(counts).reduce((s, n) => s + n, 0) : 0;
  const allEmpty = totalFiles === 0;

  return (
    <div className="animate-fade-in">
      {canUpload && (
        <div style={{ padding: '0 16px', marginTop: 16 }}>
          <OnboardingPanel
            projectId={projectId}
            toast={toast}
            forceVisible={allEmpty}
          />
        </div>
      )}
      <div className="af-tab-list">
        {DESIGN_FOLDERS.map((folder) => {
          const count = counts ? counts[folder.id] : 0;
          return (
            <div
              key={folder.id}
              className="af-tab-row"
              onClick={() => setActiveFolder(folder.id)}
            >
              <span className="af-tab-index">{folder.index}</span>
              <span className="af-tab-name">{folder.label}</span>
              <div className="af-tab-metric">
                <span className="af-tab-metric-value">{count}</span>
                <span className="af-tab-metric-label">{pluralFilesLabel(count)}</span>
              </div>
              <span className="af-tab-arrow">→</span>
            </div>
          );
        })}
        {/* Moodboards entry */}
        <div
          className="af-tab-row"
          onClick={() => setShowMoodboards(true)}
        >
          <span className="af-tab-index">07</span>
          <span className="af-tab-name">Мудборды</span>
          <span className="af-tab-arrow">→</span>
        </div>
      </div>
    </div>
  );
}
