'use client';

import { useState } from 'react';
import { useDesignFileCounts } from '../../lib/hooks';
import { DESIGN_FOLDERS } from '../../lib/types';
import type { DesignFolder } from '../../lib/types';
import DesignFolderView from './DesignFolderView';
import DesignFileDetail from './DesignFileDetail';

interface DesignSectionProps {
  projectId: string;
  toast: (msg: string) => void;
  canUpload?: boolean;
  canDelete?: boolean;
  canComment?: boolean;
}

function pluralFiles(n: number): string {
  if (n === 0) return 'пусто';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} файл`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} файла`;
  return `${n} файлов`;
}

export default function DesignSection({ projectId, toast, canUpload = true, canDelete = true, canComment = true }: DesignSectionProps) {
  const { data: counts, refetch: refetchCounts } = useDesignFileCounts(projectId);
  const [activeFolder, setActiveFolder] = useState<DesignFolder | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

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
  return (
    <div className="animate-fade-in">
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
              <span style={{
                fontFamily: 'var(--af-font-mono)',
                fontSize: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: '#111',
                marginTop: 6,
              }}>
                {pluralFiles(count)}
              </span>
              <span className="af-tab-arrow">→</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
