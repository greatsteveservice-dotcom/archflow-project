'use client';
import { useState } from 'react';
import { Icons } from '../Icons';
import type { Invoice, DocumentCategory } from '../../lib/types';
import DocCategoryList from './DocCategoryList';
import InvoiceList from './InvoiceList';

const SUB_TABS: { id: string; label: string; icon: React.FC<{ className?: string }>; type: 'doc' | 'invoice'; category?: DocumentCategory }[] = [
  { id: 'design_project', label: 'Дизайн-проект', icon: Icons.File, type: 'doc', category: 'design_project' },
  { id: 'visualizations', label: 'Визуализации', icon: Icons.Camera, type: 'doc', category: 'visualizations' },
  { id: 'engineering', label: 'Инженерные', icon: Icons.Settings, type: 'doc', category: 'engineering' },
  { id: 'contract', label: 'Договор', icon: Icons.File, type: 'doc', category: 'contract' },
  { id: 'schedule', label: 'График', icon: Icons.Calendar, type: 'doc', category: 'schedule' },
  { id: 'payments', label: 'Оплаты', icon: Icons.Receipt, type: 'invoice' },
  { id: 'acts', label: 'Акты', icon: Icons.File, type: 'doc', category: 'acts' },
  { id: 'invoices', label: 'Счета', icon: Icons.Receipt, type: 'invoice' },
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
  const [activeSubTab, setActiveSubTab] = useState(SUB_TABS[0].id);
  const currentTab = SUB_TABS.find(t => t.id === activeSubTab) || SUB_TABS[0];

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
