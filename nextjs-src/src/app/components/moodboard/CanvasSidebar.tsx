'use client';

import { useState, useEffect } from 'react';
import { searchProjectSupplyItems } from '../../lib/queries';
import type { MoodboardItem, MoodboardSection, CanvasTool } from '../../lib/types';
import { preview } from '../../lib/imgUrl';

interface SupplySearchItem {
  id: string;
  name: string;
  budget: number;
  category: string | null;
  supplier: string | null;
}

interface Props {
  projectId: string;
  tool: CanvasTool;
  sections: MoodboardSection[];
  items: MoodboardItem[];
  selectedId: string | null;
  selectedType: 'item' | 'section' | null;
  onSelectSection: (id: string) => void;
  onUpdateSection: (id: string, updates: Partial<MoodboardSection>) => void;
  onDeleteSection: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<MoodboardItem>) => void;
  onAddCatalogItem: (item: SupplySearchItem) => void;
  boardTitle: string;
  onBoardTitleChange: (title: string) => void;
  open?: boolean;
  onClose?: () => void;
}

function formatRub(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

export default function CanvasSidebar({
  projectId, tool, sections, items, selectedId, selectedType,
  onSelectSection, onUpdateSection, onDeleteSection,
  onUpdateItem, onAddCatalogItem, boardTitle, onBoardTitleChange,
  open, onClose,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(boardTitle);

  // Catalog search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SupplySearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  const selectedSection = selectedType === 'section' ? sections.find(s => s.id === selectedId) : null;
  const selectedItem = selectedType === 'item' ? items.find(i => i.id === selectedId) : null;

  const imageCount = items.filter(i => i.type === 'image').length;
  const catalogItems = items.filter(i => i.type === 'catalog');
  const textCount = items.filter(i => i.type === 'text_note').length;

  // Budget: sum prices of catalog items (parse from text_content)
  const totalBudget = catalogItems.reduce((sum, i) => {
    const num = parseFloat((i.text_content || '').replace(/[^\d,.]/g, '').replace(',', '.'));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  // Debounced supply search when catalog tool active
  useEffect(() => {
    if (tool !== 'catalog') return;
    setSearching(true);
    const t = setTimeout(() => {
      searchProjectSupplyItems(projectId, searchQuery)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 200);
    return () => clearTimeout(t);
  }, [tool, searchQuery, projectId]);

  return (
    <div className={`af-canvas-sidebar${open ? ' open' : ''}`}>
      {onClose && (
        <button className="af-canvas-sidebar-close" onClick={onClose} aria-label="Закрыть">×</button>
      )}
      {/* Board title */}
      <div className="af-canvas-sidebar-header">
        {editingTitle ? (
          <input
            className="af-input"
            style={{ fontSize: 'var(--af-fs-12)', fontWeight: 700, height: 28, padding: '0 6px' }}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => { onBoardTitleChange(titleDraft); setEditingTitle(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { onBoardTitleChange(titleDraft); setEditingTitle(false); }
              if (e.key === 'Escape') { setTitleDraft(boardTitle); setEditingTitle(false); }
            }}
            autoFocus
          />
        ) : (
          <div
            className="af-canvas-sidebar-title"
            onClick={() => { setTitleDraft(boardTitle); setEditingTitle(true); }}
          >
            {boardTitle || 'Без названия'}
          </div>
        )}
      </div>

      {/* Stats + Budget */}
      <div className="af-canvas-sidebar-stats">
        {sections.length} секций &middot; {imageCount} изобр. &middot; {textCount} заметок
        {catalogItems.length > 0 && (
          <div style={{ marginTop: 4, color: '#111', fontWeight: 600 }}>
            {catalogItems.length} {catalogItems.length === 1 ? 'товар' : 'товаров'} &middot; {formatRub(totalBudget)}
          </div>
        )}
      </div>

      {/* CATALOG SEARCH (when C tool active) */}
      {tool === 'catalog' && (
        <div className="af-canvas-sidebar-panel">
          <div className="af-canvas-sidebar-panel-title">Каталог</div>
          <input
            className="af-input"
            placeholder="Поиск по товарам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 8 }}
            autoFocus
          />
          {searching && <div style={{ fontSize: 9, color: '#999' }}>Поиск...</div>}
          {!searching && searchResults.length === 0 && (
            <div style={{ fontSize: 9, color: '#999' }}>Добавьте товары в Комплектации →</div>
          )}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {searchResults.map(r => (
              <div
                key={r.id}
                className="af-canvas-catalog-row"
                onClick={() => onAddCatalogItem(r)}
              >
                <div className="af-canvas-catalog-name">{r.name}</div>
                {r.category && <div className="af-canvas-catalog-meta">{r.category}</div>}
                <div className="af-canvas-catalog-price">{r.budget ? formatRub(r.budget) : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SELECTED SECTION */}
      {selectedSection && (
        <div className="af-canvas-sidebar-panel">
          <div className="af-canvas-sidebar-panel-title">Секция</div>
          <label className="af-input-label">Название</label>
          <input
            className="af-input"
            value={selectedSection.title}
            onChange={(e) => onUpdateSection(selectedSection.id, { title: e.target.value })}
            style={{ marginBottom: 6 }}
          />
          <label className="af-input-label">Площадь</label>
          <input
            className="af-input"
            value={selectedSection.area_label || ''}
            onChange={(e) => onUpdateSection(selectedSection.id, { area_label: e.target.value || null })}
            placeholder="напр. 38 м2"
            style={{ marginBottom: 6 }}
          />
          <button className="af-btn af-btn-outline" style={{ width: '100%', marginTop: 4 }} onClick={() => onDeleteSection(selectedSection.id)}>
            Удалить секцию
          </button>
        </div>
      )}

      {/* SELECTED ITEM */}
      {selectedItem && selectedItem.type === 'text_note' && (
        <div className="af-canvas-sidebar-panel">
          <div className="af-canvas-sidebar-panel-title">Заметка</div>
          <textarea
            className="af-input"
            value={selectedItem.text_content || ''}
            onChange={(e) => onUpdateItem(selectedItem.id, { text_content: e.target.value })}
            rows={3}
            style={{ resize: 'vertical', marginBottom: 6 }}
          />
        </div>
      )}

      {selectedItem && selectedItem.type === 'image' && (
        <div className="af-canvas-sidebar-panel">
          <div className="af-canvas-sidebar-panel-title">Изображение</div>
          <label className="af-input-label">Название</label>
          <input
            className="af-input"
            value={selectedItem.title || ''}
            onChange={(e) => onUpdateItem(selectedItem.id, { title: e.target.value })}
            style={{ marginBottom: 6 }}
          />
          {selectedItem.image_url && (
            <img src={preview(selectedItem.image_url)} alt="" style={{ width: '100%', height: 'auto', border: '0.5px solid #EBEBEB', marginTop: 4 }} />
          )}
        </div>
      )}

      {selectedItem && selectedItem.type === 'catalog' && (
        <div className="af-canvas-sidebar-panel">
          <div className="af-canvas-sidebar-panel-title">Товар из каталога</div>
          <label className="af-input-label">Название</label>
          <input
            className="af-input"
            value={selectedItem.title || ''}
            onChange={(e) => onUpdateItem(selectedItem.id, { title: e.target.value })}
            style={{ marginBottom: 6 }}
          />
          <label className="af-input-label">Цена</label>
          <input
            className="af-input"
            value={selectedItem.text_content || ''}
            onChange={(e) => onUpdateItem(selectedItem.id, { text_content: e.target.value })}
            placeholder="45 000 ₽"
            style={{ marginBottom: 6 }}
          />
        </div>
      )}

      {/* SECTION LIST (when nothing selected) */}
      {!selectedId && tool !== 'catalog' && sections.length > 0 && (
        <div className="af-canvas-sidebar-panel">
          <div className="af-canvas-sidebar-panel-title">Секции</div>
          {sections.map(s => {
            const inSection = items.filter(i => i.section_id === s.id);
            const sectionBudget = inSection
              .filter(i => i.type === 'catalog')
              .reduce((sum, i) => {
                const num = parseFloat((i.text_content || '').replace(/[^\d,.]/g, '').replace(',', '.'));
                return sum + (isNaN(num) ? 0 : num);
              }, 0);
            return (
              <div key={s.id} className="af-canvas-sidebar-section-row" onClick={() => onSelectSection(s.id)}>
                <div style={{ flex: 1 }}>
                  <div className="af-canvas-sidebar-section-name">
                    {s.title}{s.area_label ? ` ${s.area_label}` : ''}
                  </div>
                  {sectionBudget > 0 && (
                    <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>{formatRub(sectionBudget)}</div>
                  )}
                </div>
                <span className="af-canvas-sidebar-section-count">{inSection.length}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
