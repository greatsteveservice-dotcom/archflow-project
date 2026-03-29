'use client';
import { useState } from 'react';
import type { Invoice, DocumentCategory } from '../../lib/types';
import DocCategoryList from './DocCategoryList';
import InvoiceList from './InvoiceList';

const SUB_TABS: { id: string; label: string; type: 'doc' | 'invoice'; category?: DocumentCategory }[] = [
  { id: 'design_project', label: 'Дизайн-проект', type: 'doc', category: 'design_project' },
  { id: 'visualizations', label: 'Визуализации', type: 'doc', category: 'visualizations' },
  { id: 'engineering', label: 'Инженерные', type: 'doc', category: 'engineering' },
  { id: 'contract', label: 'Договор', type: 'doc', category: 'contract' },
  { id: 'schedule', label: 'График', type: 'doc', category: 'schedule' },
  { id: 'payments', label: 'Оплаты', type: 'invoice' },
  { id: 'acts', label: 'Акты', type: 'doc', category: 'acts' },
  { id: 'invoices', label: 'Счета', type: 'invoice' },
];

interface DesignTabProps {
  projectId: string;
  invoices: Invoice[];
  toast: (msg: string) => void;
  refetchInvoices: () => void;
  canUploadDocument?: boolean;
  canCreateInvoice?: boolean;
}

export default function DesignTab({ projectId, invoices, toast, refetchInvoices, canUploadDocument = true, canCreateInvoice = true }: DesignTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const currentTab = activeSubTab ? SUB_TABS.find(t => t.id === activeSubTab) : null;

  // Tab-row list (Level 3 → Level 4 navigation)
  if (!currentTab) {
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
        {currentTab.type === 'doc' && currentTab.category && (
          <DocCategoryList
            projectId={projectId}
            category={currentTab.category}
            toast={toast}
            canUpload={canUploadDocument}
          />
        )}
        {currentTab.type === 'invoice' && (
          <InvoiceList
            projectId={projectId}
            invoices={invoices}
            toast={toast}
            refetchInvoices={refetchInvoices}
            canCreateInvoice={canCreateInvoice}
          />
        )}
      </div>
    </div>
  );
}
