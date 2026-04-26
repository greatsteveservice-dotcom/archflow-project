'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group, Arrow, Image as KImage, Transformer } from 'react-konva';
import Konva from 'konva';
import CanvasToolbar from './CanvasToolbar';
import CanvasSidebar from './CanvasSidebar';
import CanvasMinimap from './CanvasMinimap';
import {
  fetchMoodboards, createMoodboard,
  fetchMoodboardItems, fetchMoodboardSections,
  createMoodboardItem, updateMoodboardItem, deleteMoodboardItem,
  createMoodboardSection, updateMoodboardSection, deleteMoodboardSection,
  updateMoodboard,
} from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import type { Moodboard, MoodboardItem, MoodboardSection, CanvasTool } from '../../lib/types';
import { imgUrl } from '../../lib/imgUrl';

/* ═══ Sub-components ═══ */

function useCanvasImage(url: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) { setImg(null); return; }
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);
    image.src = url;
    return () => { image.onload = null; image.onerror = null; };
  }, [url]);
  return img;
}

interface NodeProps {
  isSelected: boolean;
  onSelect: (id: string, e: any) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  tool: CanvasTool;
}

function ImageNode({ item, isSelected, onSelect, onDragEnd, tool }: NodeProps & { item: MoodboardItem }) {
  const w = item.canvas_w || 200, h = item.canvas_h || 200;
  // Request transform 2× canvas size for retina; clamp to 1200px max.
  const tw = Math.min(1200, Math.ceil(w * 2));
  const img = useCanvasImage(imgUrl(item.image_url, { width: tw, quality: 80 }));
  return (
    <Group
      id={item.id} x={item.canvas_x || 0} y={item.canvas_y || 0}
      draggable={tool === 'select'}
      onClick={(e) => { e.cancelBubble = true; onSelect(item.id, e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(item.id, e); }}
      onDragEnd={(e) => onDragEnd(item.id, e.target.x(), e.target.y())}
    >
      <Rect width={w} height={h} fill="#FFF" stroke={isSelected ? '#111' : '#EBEBEB'} strokeWidth={isSelected ? 2 : 0.5} />
      {img && <KImage image={img} width={w} height={h} />}
      {!img && <Text text="..." x={w / 2 - 8} y={h / 2 - 6} fontSize={12} fill="#999" />}
      {item.title && (
        <Text text={item.title} y={h + 4} fontSize={10} fontFamily="Vollkorn SC" fill="#111" width={w} />
      )}
    </Group>
  );
}

function TextNoteNode({ item, isSelected, onSelect, onDragEnd, tool }: NodeProps & { item: MoodboardItem }) {
  const w = item.canvas_w || 160, h = item.canvas_h || 80;
  return (
    <Group
      id={item.id} x={item.canvas_x || 0} y={item.canvas_y || 0}
      draggable={tool === 'select'}
      onClick={(e) => { e.cancelBubble = true; onSelect(item.id, e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(item.id, e); }}
      onDragEnd={(e) => onDragEnd(item.id, e.target.x(), e.target.y())}
    >
      <Rect width={w} height={h} fill={item.bg_color || '#F6F6F4'} stroke={isSelected ? '#111' : '#EBEBEB'} strokeWidth={isSelected ? 2 : 0.5} />
      <Text text={item.text_content || ''} x={8} y={8} width={w - 16} fontSize={12} fontFamily="Vollkorn SC" fill={item.text_color || '#111'} wrap="word" />
    </Group>
  );
}

function ColorSwatchNode({ item, isSelected, onSelect, onDragEnd, tool }: NodeProps & { item: MoodboardItem }) {
  const s = item.canvas_w || 60;
  return (
    <Group
      id={item.id} x={item.canvas_x || 0} y={item.canvas_y || 0}
      draggable={tool === 'select'}
      onClick={(e) => { e.cancelBubble = true; onSelect(item.id, e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(item.id, e); }}
      onDragEnd={(e) => onDragEnd(item.id, e.target.x(), e.target.y())}
    >
      <Rect width={s} height={s} fill={item.color_hex || '#ccc'} stroke={isSelected ? '#111' : '#EBEBEB'} strokeWidth={isSelected ? 2 : 0.5} />
      {item.color_name && <Text text={item.color_name} y={s + 4} fontSize={9} fontFamily="Vollkorn SC" fill="#111" width={s} align="center" />}
    </Group>
  );
}

function CatalogNode({ item, isSelected, onSelect, onDragEnd, tool }: NodeProps & { item: MoodboardItem }) {
  const w = item.canvas_w || 220, h = item.canvas_h || 200;
  const tw = Math.min(1200, Math.ceil(w * 2));
  const img = useCanvasImage(imgUrl(item.image_url, { width: tw, quality: 80 }));
  const imgH = h - 44; // leave space for label
  return (
    <Group
      id={item.id} x={item.canvas_x || 0} y={item.canvas_y || 0}
      draggable={tool === 'select'}
      onClick={(e) => { e.cancelBubble = true; onSelect(item.id, e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(item.id, e); }}
      onDragEnd={(e) => onDragEnd(item.id, e.target.x(), e.target.y())}
    >
      {/* Card background */}
      <Rect width={w} height={h} fill="#FFF" stroke={isSelected ? '#111' : '#EBEBEB'} strokeWidth={isSelected ? 2 : 0.5} />
      {/* Image area */}
      <Rect width={w} height={imgH} fill="#F6F6F4" />
      {img && <KImage image={img} width={w} height={imgH} />}
      {/* КАТАЛОГ badge */}
      <Rect x={0} y={0} width={64} height={16} fill="#111" />
      <Text text="КАТАЛОГ" x={0} y={3} width={64} align="center" fontSize={8} fontFamily="Vollkorn SC" fontStyle="bold" fill="#FFF" letterSpacing={0.5} />
      {/* Product name */}
      <Text text={item.title || 'Товар'} x={8} y={imgH + 6} width={w - 16} fontSize={11} fontFamily="Vollkorn SC" fontStyle="bold" fill="#111" ellipsis={true} wrap="none" />
      {/* Price */}
      <Text text={item.text_content || ''} x={8} y={imgH + 24} width={w - 16} fontSize={10} fontFamily="Vollkorn SC" fill="#999" />
    </Group>
  );
}

function SectionNode({
  section, isSelected, onSelect, tool,
  onDragStart, onDragMove, onDragEnd,
}: {
  section: MoodboardSection;
  isSelected: boolean;
  onSelect: (id: string, e: any) => void;
  tool: CanvasTool;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}) {
  return (
    <Group
      id={section.id} x={section.canvas_x} y={section.canvas_y}
      draggable={tool === 'select'}
      onClick={(e) => { e.cancelBubble = true; onSelect(section.id, e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(section.id, e); }}
      onDragStart={() => onDragStart(section.id)}
      onDragMove={(e) => onDragMove(section.id, e.target.x(), e.target.y())}
      onDragEnd={(e) => onDragEnd(section.id, e.target.x(), e.target.y())}
    >
      <Rect
        width={section.canvas_w} height={section.canvas_h}
        fill="rgba(246,246,244,0.5)" stroke={isSelected ? '#111' : '#EBEBEB'}
        strokeWidth={isSelected ? 2 : 1} dash={isSelected ? undefined : [6, 3]}
      />
      <Rect width={section.canvas_w} height={28} fill="#EBEBEB" />
      <Text
        text={(section.title || 'Секция') + (section.area_label ? ` ${section.area_label}` : '')}
        x={8} y={7} fontSize={12} fontFamily="Vollkorn SC" fontStyle="bold" fill="#111"
        width={section.canvas_w - 16}
      />
    </Group>
  );
}

/* ═══ Helper: point inside rect ═══ */
function pointInSection(x: number, y: number, s: MoodboardSection): boolean {
  return x >= s.canvas_x && x <= s.canvas_x + s.canvas_w &&
         y >= s.canvas_y && y <= s.canvas_y + s.canvas_h;
}

/* ═══ Main Canvas ═══ */

interface Props {
  projectId: string;
  toast: (msg: string) => void;
}

export default function MoodboardCanvas({ projectId, toast }: Props) {
  // Board state
  const [board, setBoard] = useState<Moodboard | null>(null);
  const [loading, setLoading] = useState(true);

  // Canvas state
  const [tool, setTool] = useState<CanvasTool>('select');
  const [sections, setSections] = useState<MoodboardSection[]>([]);
  const [items, setItems] = useState<MoodboardItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'item' | 'section' | null>(null);

  // Stage
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Drawing state (for section/arrow creation)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // Mobile sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    // Auto-open sidebar on mobile when something gets selected
    if (selectedId && typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(true);
    }
  }, [selectedId]);

  // Section drag tracking (to move children)
  const sectionDragRef = useRef<{ id: string; startX: number; startY: number; childSnapshots: { id: string; x: number; y: number }[] } | null>(null);

  // Track pending self-updates to avoid echo on realtime
  const selfOpsRef = useRef<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ═══ AUTO-RESIZE ═══
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setStageSize({ width, height });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Measure actual topbar height (logo + progress + breadcrumb) and expose as CSS var
  // so .af-canvas-workspace height calc accounts for real chrome, not hardcoded 56px.
  useEffect(() => {
    const measure = () => {
      const topbar = document.querySelector('.af-topbar-wrapper') as HTMLElement | null;
      const h = topbar?.getBoundingClientRect().height;
      if (h && h > 0) {
        document.documentElement.style.setProperty('--af-topbar-h', `${Math.ceil(h)}px`);
      }
    };
    measure();
    const t = setTimeout(measure, 50);
    const ro = new ResizeObserver(measure);
    const topbar = document.querySelector('.af-topbar-wrapper');
    if (topbar) ro.observe(topbar);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // ═══ TRANSFORMER ═══
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr || !stageRef.current) return;
    if (!selectedId) { tr.nodes([]); tr.getLayer()?.batchDraw(); return; }
    const node = stageRef.current.findOne('#' + selectedId);
    if (node) { tr.nodes([node]); tr.getLayer()?.batchDraw(); }
    else { tr.nodes([]); tr.getLayer()?.batchDraw(); }
  }, [selectedId]);

  // ═══ LOAD DATA ═══
  useEffect(() => { loadBoard(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadBoard() {
    setLoading(true);
    try {
      let boards = await fetchMoodboards(projectId);
      let b = boards[0];
      if (!b) {
        b = await createMoodboard({ project_id: projectId, title: 'Концепция' }) as any;
      }
      setBoard(b);
      const [itemsData, sectionsData] = await Promise.all([
        fetchMoodboardItems(b.id),
        fetchMoodboardSections(b.id),
      ]);
      setItems(itemsData);
      setSections(sectionsData);
    } catch (e: any) {
      toast(e.message || 'Ошибка загрузки');
    }
    setLoading(false);
  }

  // ═══ REALTIME SYNC ═══
  useEffect(() => {
    if (!board) return;
    const channel = supabase.channel(`moodboard:${board.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moodboard_items', filter: `moodboard_id=eq.${board.id}` }, (payload: any) => {
        const row = (payload.new || payload.old) as MoodboardItem;
        if (row?.id && selfOpsRef.current.has(row.id)) { selfOpsRef.current.delete(row.id); return; }
        if (payload.eventType === 'INSERT') {
          setItems(prev => prev.some(i => i.id === row.id) ? prev : [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => i.id === row.id ? { ...i, ...payload.new } : i));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== row.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moodboard_sections', filter: `moodboard_id=eq.${board.id}` }, (payload: any) => {
        const row = (payload.new || payload.old) as MoodboardSection;
        if (row?.id && selfOpsRef.current.has(row.id)) { selfOpsRef.current.delete(row.id); return; }
        if (payload.eventType === 'INSERT') {
          setSections(prev => prev.some(s => s.id === row.id) ? prev : [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setSections(prev => prev.map(s => s.id === row.id ? { ...s, ...payload.new } : s));
        } else if (payload.eventType === 'DELETE') {
          setSections(prev => prev.filter(s => s.id !== row.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [board]);

  // ═══ ZOOM / PAN ═══
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition()!;
    const mp = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const factor = e.evt.deltaY < 0 ? 1.08 : 1 / 1.08;
    const ns = Math.max(0.05, Math.min(5, oldScale * factor));
    const np = { x: pointer.x - mp.x * ns, y: pointer.y - mp.y * ns };
    stage.scale({ x: ns, y: ns }); stage.position(np);
    setZoom(ns); setStagePos(np);
  }, []);

  const handleStageDragEnd = useCallback(() => {
    const stage = stageRef.current; if (!stage) return;
    setStagePos({ x: stage.x(), y: stage.y() });
  }, []);

  function worldFromPointer(): { x: number; y: number } | null {
    const stage = stageRef.current; if (!stage) return null;
    const pointer = stage.getPointerPosition(); if (!pointer) return null;
    const scale = stage.scaleX();
    return { x: (pointer.x - stage.x()) / scale, y: (pointer.y - stage.y()) / scale };
  }

  // ═══ STAGE CLICK ═══
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return;
    const w = worldFromPointer(); if (!w) return;
    if (tool === 'select') { setSelectedId(null); setSelectedType(null); }
    else if (tool === 'text') { addTextNote(w.x, w.y); }
    else if (tool === 'image') {
      fileInputRef.current?.setAttribute('data-x', String(w.x));
      fileInputRef.current?.setAttribute('data-y', String(w.y));
      fileInputRef.current?.click();
    }
  }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ DRAWING (section/arrow) ═══
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool !== 'section' && tool !== 'arrow') return;
    if (e.target !== stageRef.current) return;
    const w = worldFromPointer(); if (!w) return;
    setDrawStart(w); setDrawCurrent(w);
  }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStageMouseMove = useCallback(() => {
    if (!drawStart) return;
    const w = worldFromPointer(); if (w) setDrawCurrent(w);
  }, [drawStart]);

  const handleStageMouseUp = useCallback(async () => {
    if (!drawStart || !drawCurrent) return;
    const x = Math.min(drawStart.x, drawCurrent.x), y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x), h = Math.abs(drawCurrent.y - drawStart.y);
    if (tool === 'section' && w > 20 && h > 20 && board) await addSection(x, y, w, h);
    else if (tool === 'arrow' && (w > 10 || h > 10) && board) await addArrow(drawStart.x, drawStart.y, drawCurrent.x - drawStart.x, drawCurrent.y - drawStart.y);
    setDrawStart(null); setDrawCurrent(null);
  }, [drawStart, drawCurrent, tool, board]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ SELECTION ═══
  const handleSelectItem = useCallback((id: string) => { setSelectedId(id); setSelectedType('item'); }, []);
  const handleSelectSection = useCallback((id: string) => { setSelectedId(id); setSelectedType('section'); }, []);

  // ═══ ITEM DRAG END — auto-assign section_id ═══
  const handleItemDragEnd = useCallback(async (id: string, x: number, y: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    // Find section containing item center
    const w = item.canvas_w || 200, h = item.canvas_h || 200;
    const cx = x + w / 2, cy = y + h / 2;
    const inside = sections.find(s => pointInSection(cx, cy, s));
    const newSectionId = inside?.id || null;
    const updates: Partial<MoodboardItem> = { canvas_x: x, canvas_y: y };
    if (newSectionId !== item.section_id) updates.section_id = newSectionId;
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } as MoodboardItem : i));
    selfOpsRef.current.add(id);
    try { await updateMoodboardItem(id, updates as any); } catch (_) { /* silent */ }
  }, [items, sections]);

  // ═══ SECTION DRAG — move children ═══
  const handleSectionDragStart = useCallback((id: string) => {
    const section = sections.find(s => s.id === id); if (!section) return;
    const children = items
      .filter(i => i.section_id === id || pointInSection((i.canvas_x || 0) + (i.canvas_w || 200) / 2, (i.canvas_y || 0) + (i.canvas_h || 200) / 2, section))
      .map(i => ({ id: i.id, x: i.canvas_x || 0, y: i.canvas_y || 0 }));
    sectionDragRef.current = { id, startX: section.canvas_x, startY: section.canvas_y, childSnapshots: children };
  }, [sections, items]);

  const handleSectionDragMove = useCallback((id: string, x: number, y: number) => {
    const drag = sectionDragRef.current; if (!drag || drag.id !== id) return;
    const dx = x - drag.startX, dy = y - drag.startY;
    const stage = stageRef.current; if (!stage) return;
    // Visually move each child via Konva node
    for (const c of drag.childSnapshots) {
      const node = stage.findOne('#' + c.id);
      if (node) node.position({ x: c.x + dx, y: c.y + dy });
    }
  }, []);

  const handleSectionDragEnd = useCallback(async (id: string, x: number, y: number) => {
    const drag = sectionDragRef.current;
    const dx = drag ? x - drag.startX : 0, dy = drag ? y - drag.startY : 0;
    const childSnapshots = drag?.childSnapshots || [];
    sectionDragRef.current = null;

    // Update section state + persist
    setSections(prev => prev.map(s => s.id === id ? { ...s, canvas_x: x, canvas_y: y } : s));
    selfOpsRef.current.add(id);
    updateMoodboardSection(id, { canvas_x: x, canvas_y: y }).catch(() => {});

    // Update child items
    if (childSnapshots.length && (dx !== 0 || dy !== 0)) {
      const newPositions = new Map(childSnapshots.map(c => [c.id, { x: c.x + dx, y: c.y + dy }]));
      setItems(prev => prev.map(i => {
        const np = newPositions.get(i.id);
        if (!np) return i;
        return { ...i, canvas_x: np.x, canvas_y: np.y, section_id: i.section_id || id };
      }));
      // Persist in parallel
      childSnapshots.forEach(c => {
        const np = newPositions.get(c.id)!;
        selfOpsRef.current.add(c.id);
        updateMoodboardItem(c.id, { canvas_x: np.x, canvas_y: np.y, section_id: id }).catch(() => {});
      });
    }
  }, []);

  // ═══ TRANSFORM END (resize) ═══
  const handleTransformEnd = useCallback(async (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const id = node.id();
    const scaleX = node.scaleX(), scaleY = node.scaleY();
    node.scaleX(1); node.scaleY(1);
    const newW = Math.max(40, node.width() * scaleX);
    const newH = Math.max(40, node.height() * scaleY);
    const newX = node.x(), newY = node.y();
    if (selectedType === 'section') {
      setSections(prev => prev.map(s => s.id === id ? { ...s, canvas_x: newX, canvas_y: newY, canvas_w: newW, canvas_h: newH } : s));
      selfOpsRef.current.add(id);
      try { await updateMoodboardSection(id, { canvas_x: newX, canvas_y: newY, canvas_w: newW, canvas_h: newH }); } catch (_) { /* silent */ }
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, canvas_x: newX, canvas_y: newY, canvas_w: newW, canvas_h: newH } : i));
      selfOpsRef.current.add(id);
      try { await updateMoodboardItem(id, { canvas_x: newX, canvas_y: newY, canvas_w: newW, canvas_h: newH }); } catch (_) { /* silent */ }
    }
  }, [selectedType]);

  // ═══ ADD ELEMENTS ═══
  async function addTextNote(x: number, y: number) {
    if (!board) return;
    try {
      const item = await createMoodboardItem({
        moodboard_id: board.id, type: 'text_note',
        text_content: 'Заметка', canvas_x: x, canvas_y: y, canvas_w: 160, canvas_h: 80,
      });
      selfOpsRef.current.add(item.id);
      setItems(prev => [...prev, item]);
      setSelectedId(item.id); setSelectedType('item'); setTool('select');
    } catch (e: any) { toast(e.message || 'Ошибка'); }
  }

  async function addSection(x: number, y: number, w: number, h: number) {
    if (!board) return;
    try {
      const section = await createMoodboardSection({
        moodboard_id: board.id, title: 'Новая секция',
        canvas_x: x, canvas_y: y, canvas_w: w, canvas_h: h,
      });
      selfOpsRef.current.add(section.id);
      setSections(prev => [...prev, section]);
      setSelectedId(section.id); setSelectedType('section'); setTool('select');
    } catch (e: any) { toast(e.message || 'Ошибка'); }
  }

  async function addArrow(x: number, y: number, dx: number, dy: number) {
    if (!board) return;
    try {
      const item = await createMoodboardItem({
        moodboard_id: board.id, type: 'arrow',
        canvas_x: x, canvas_y: y, canvas_w: dx, canvas_h: dy,
      });
      selfOpsRef.current.add(item.id);
      setItems(prev => [...prev, item]);
      setTool('select');
    } catch (e: any) { toast(e.message || 'Ошибка'); }
  }

  // ═══ CATALOG ITEM (from sidebar) ═══
  const handleAddCatalogItem = useCallback(async (supplyItem: { id: string; name: string; budget: number; supplier: string | null }) => {
    if (!board) return;
    const stage = stageRef.current;
    // Place at center of current viewport
    const cx = stage ? (stageSize.width / 2 - stage.x()) / stage.scaleX() : 200;
    const cy = stage ? (stageSize.height / 2 - stage.y()) / stage.scaleY() : 200;
    const price = supplyItem.budget ? `${supplyItem.budget.toLocaleString('ru-RU')} ₽` : '';
    try {
      const item = await createMoodboardItem({
        moodboard_id: board.id, type: 'catalog',
        title: supplyItem.name,
        text_content: price,
        supply_item_id: supplyItem.id,
        canvas_x: cx - 110, canvas_y: cy - 100,
        canvas_w: 220, canvas_h: 200,
      });
      selfOpsRef.current.add(item.id);
      setItems(prev => [...prev, item]);
      setSelectedId(item.id); setSelectedType('item'); setTool('select');
    } catch (e: any) { toast(e.message || 'Ошибка'); }
  }, [board, stageSize, toast]);

  // ═══ FILE UPLOAD ═══
  async function handleFileUpload(files: FileList, x?: number, y?: number) {
    if (!board) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${board.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('moodboard-images').upload(path, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('moodboard-images').getPublicUrl(path);
        const item = await createMoodboardItem({
          moodboard_id: board.id, type: 'image',
          image_url: publicUrl, file_path: path,
          title: file.name.replace(/\.[^.]+$/, ''),
          canvas_x: x ?? 100 + Math.random() * 200,
          canvas_y: y ?? 100 + Math.random() * 200,
          canvas_w: 240, canvas_h: 180,
        });
        selfOpsRef.current.add(item.id);
        setItems(prev => [...prev, item]);
      } catch (e: any) { toast(e.message || 'Ошибка загрузки'); }
    }
    setTool('select');
  }

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return;
    const x = parseFloat(fileInputRef.current?.getAttribute('data-x') || '200');
    const y = parseFloat(fileInputRef.current?.getAttribute('data-y') || '200');
    handleFileUpload(files, x, y);
    e.target.value = '';
  }, [board]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files?.length || !stageRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const stage = stageRef.current, scale = stage.scaleX();
    const worldX = (e.clientX - rect.left - stage.x()) / scale;
    const worldY = (e.clientY - rect.top - stage.y()) / scale;
    handleFileUpload(files, worldX, worldY);
  }, [board]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files; if (files?.length) handleFileUpload(files);
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [board]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ DELETE ═══
  async function deleteSelected() {
    if (!selectedId) return;
    try {
      if (selectedType === 'item') {
        const item = items.find(i => i.id === selectedId);
        selfOpsRef.current.add(selectedId);
        await deleteMoodboardItem(selectedId, item?.file_path || undefined);
        setItems(prev => prev.filter(i => i.id !== selectedId));
      } else if (selectedType === 'section') {
        selfOpsRef.current.add(selectedId);
        await deleteMoodboardSection(selectedId);
        setSections(prev => prev.filter(s => s.id !== selectedId));
      }
      setSelectedId(null); setSelectedType(null);
    } catch (e: any) { toast(e.message || 'Ошибка удаления'); }
  }

  // ═══ KEYBOARD ═══
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'v': setTool('select'); break;
        case 'i': setTool('image'); break;
        case 't': setTool('text'); break;
        case 'r': setTool('section'); break;
        case 'a': setTool('arrow'); break;
        case 'c': setTool('catalog'); break;
        case 'delete': case 'backspace': if (selectedId) { e.preventDefault(); deleteSelected(); } break;
        case 'escape':
          setSelectedId(null); setSelectedType(null); setTool('select');
          setDrawStart(null); setDrawCurrent(null);
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedId, selectedType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ ZOOM CONTROLS ═══
  const zoomTo = useCallback((newZoom: number) => {
    const stage = stageRef.current; if (!stage) return;
    const center = { x: stageSize.width / 2, y: stageSize.height / 2 };
    const mp = { x: (center.x - stage.x()) / zoom, y: (center.y - stage.y()) / zoom };
    stage.scale({ x: newZoom, y: newZoom });
    stage.position({ x: center.x - mp.x * newZoom, y: center.y - mp.y * newZoom });
    setZoom(newZoom); setStagePos(stage.position());
  }, [zoom, stageSize]);

  const handleZoomIn = useCallback(() => zoomTo(Math.min(5, zoom * 1.2)), [zoom, zoomTo]);
  const handleZoomOut = useCallback(() => zoomTo(Math.max(0.05, zoom / 1.2)), [zoom, zoomTo]);

  const getBoundingBox = useCallback(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of sections) {
      minX = Math.min(minX, s.canvas_x); minY = Math.min(minY, s.canvas_y);
      maxX = Math.max(maxX, s.canvas_x + s.canvas_w); maxY = Math.max(maxY, s.canvas_y + s.canvas_h);
    }
    for (const i of items) {
      const x = i.canvas_x || 0, y = i.canvas_y || 0;
      const w = i.canvas_w || 200, h = i.canvas_h || 200;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
    }
    if (!isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
  }, [sections, items]);

  const handleFitView = useCallback(() => {
    const stage = stageRef.current; if (!stage) return;
    const bb = getBoundingBox(); if (!bb) { zoomTo(1); return; }
    const pad = 60;
    const cw = bb.maxX - bb.minX + pad * 2, ch = bb.maxY - bb.minY + pad * 2;
    const newZoom = Math.min(stageSize.width / cw, stageSize.height / ch, 2);
    const newPos = {
      x: stageSize.width / 2 - (bb.minX + (bb.maxX - bb.minX) / 2) * newZoom,
      y: stageSize.height / 2 - (bb.minY + (bb.maxY - bb.minY) / 2) * newZoom,
    };
    stage.scale({ x: newZoom, y: newZoom });
    stage.position(newPos);
    setZoom(newZoom); setStagePos(newPos);
  }, [getBoundingBox, stageSize, zoomTo]);

  // ═══ PNG EXPORT ═══
  const handleExportPng = useCallback(() => {
    const stage = stageRef.current; if (!stage || !board) return;
    const bb = getBoundingBox();
    if (!bb) { toast('Нет контента'); return; }
    const pad = 40;
    // Save current state
    const oldScale = stage.scaleX(), oldPos = { x: stage.x(), y: stage.y() };
    const exportScale = 1.5; // for retina-ish quality
    // Temporarily reset to capture raw bbox
    stage.scale({ x: exportScale, y: exportScale });
    stage.position({ x: -bb.minX * exportScale + pad, y: -bb.minY * exportScale + pad });
    const w = (bb.maxX - bb.minX) * exportScale + pad * 2;
    const h = (bb.maxY - bb.minY) * exportScale + pad * 2;
    const dataUrl = stage.toDataURL({ pixelRatio: 1, width: w, height: h, mimeType: 'image/png' });
    // Restore
    stage.scale({ x: oldScale, y: oldScale });
    stage.position(oldPos);

    // Download
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `moodboard-${board.title.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast('PNG сохранён');
  }, [board, getBoundingBox, toast]);

  // ═══ PUBLIC LINK ═══
  const handleShareBoard = useCallback(async () => {
    if (!board) return;
    try {
      let token = board.public_token;
      if (!board.is_public || !token) {
        token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        await updateMoodboard(board.id, { is_public: true, public_token: token });
        setBoard({ ...board, is_public: true, public_token: token });
      }
      const url = `${window.location.origin}/board/${token}`;
      await navigator.clipboard.writeText(url);
      toast('Ссылка скопирована');
    } catch (e: any) { toast(e.message || 'Ошибка'); }
  }, [board, toast]);

  // ═══ DOT GRID ═══
  const gridStyle = useMemo(() => {
    const size = 20 * zoom;
    const dotR = Math.max(0.5, zoom * 0.8);
    return {
      backgroundImage: `radial-gradient(circle, #EBEBEB ${dotR}px, transparent ${dotR}px)`,
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: `${stagePos.x % size}px ${stagePos.y % size}px`,
    };
  }, [zoom, stagePos]);

  const cursor = useMemo(() => {
    if (tool === 'section' || tool === 'arrow') return 'crosshair';
    if (tool === 'text') return 'text';
    if (tool === 'image') return 'copy';
    return 'default';
  }, [tool]);

  // ═══ SIDEBAR CALLBACKS ═══
  const handleUpdateSection = useCallback(async (id: string, updates: Partial<MoodboardSection>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    selfOpsRef.current.add(id);
    try { await updateMoodboardSection(id, updates as any); } catch (_) { /* silent */ }
  }, []);

  const handleDeleteSection = useCallback(async (id: string) => {
    try {
      selfOpsRef.current.add(id);
      await deleteMoodboardSection(id);
      setSections(prev => prev.filter(s => s.id !== id));
      if (selectedId === id) { setSelectedId(null); setSelectedType(null); }
    } catch (e: any) { toast(e.message || 'Ошибка'); }
  }, [selectedId, toast]);

  const handleUpdateItem = useCallback(async (id: string, updates: Partial<MoodboardItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    selfOpsRef.current.add(id);
    try { await updateMoodboardItem(id, updates as any); } catch (_) { /* silent */ }
  }, []);

  const handleBoardTitleChange = useCallback(async (title: string) => {
    if (!board) return;
    setBoard(prev => prev ? { ...prev, title } : prev);
    try { await updateMoodboard(board.id, { title }); } catch (_) { /* silent */ }
  }, [board]);

  const handleMinimapNavigate = useCallback((worldX: number, worldY: number) => {
    const stage = stageRef.current; if (!stage) return;
    const newPos = { x: stageSize.width / 2 - worldX * zoom, y: stageSize.height / 2 - worldY * zoom };
    stage.position(newPos);
    setStagePos(newPos);
  }, [stageSize, zoom]);

  if (loading) {
    return (
      <div className="af-canvas-workspace" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--af-font)', fontSize: 11, color: '#999' }}>Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="af-canvas-workspace">
      <CanvasToolbar
        tool={tool}
        onToolChange={(t) => { setTool(t); if (t === 'catalog') setSidebarOpen(true); }}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onExportPng={handleExportPng}
        onShare={handleShareBoard}
        isPublic={!!board?.is_public}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        sidebarOpen={sidebarOpen}
      />

      <div
        ref={containerRef}
        className="af-canvas-container"
        style={{ ...gridStyle, cursor }}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onDragEnd={handleStageDragEnd}
          draggable={tool === 'select'}
        >
          <Layer>
            {sections.map(s => (
              <SectionNode
                key={s.id} section={s}
                isSelected={selectedId === s.id}
                onSelect={handleSelectSection}
                onDragStart={handleSectionDragStart}
                onDragMove={handleSectionDragMove}
                onDragEnd={handleSectionDragEnd}
                tool={tool}
              />
            ))}

            {items.filter(i => i.type !== 'arrow').map(item => {
              const np: NodeProps = {
                isSelected: selectedId === item.id,
                onSelect: handleSelectItem,
                onDragEnd: handleItemDragEnd,
                tool,
              };
              if (item.type === 'image') return <ImageNode key={item.id} item={item} {...np} />;
              if (item.type === 'text_note') return <TextNoteNode key={item.id} item={item} {...np} />;
              if (item.type === 'color_swatch') return <ColorSwatchNode key={item.id} item={item} {...np} />;
              if (item.type === 'catalog') return <CatalogNode key={item.id} item={item} {...np} />;
              return null;
            })}

            {items.filter(i => i.type === 'arrow').map(item => (
              <Arrow
                key={item.id} id={item.id}
                points={[
                  item.canvas_x || 0, item.canvas_y || 0,
                  (item.canvas_x || 0) + (item.canvas_w || 100),
                  (item.canvas_y || 0) + (item.canvas_h || 0),
                ]}
                stroke={selectedId === item.id ? '#111' : '#999'}
                strokeWidth={selectedId === item.id ? 2 : 1.5}
                fill={selectedId === item.id ? '#111' : '#999'}
                pointerLength={8} pointerWidth={6} hitStrokeWidth={12}
                onClick={(e) => { e.cancelBubble = true; handleSelectItem(item.id); }}
              />
            ))}

            {drawStart && drawCurrent && tool === 'section' && (
              <Rect
                x={Math.min(drawStart.x, drawCurrent.x)}
                y={Math.min(drawStart.y, drawCurrent.y)}
                width={Math.abs(drawCurrent.x - drawStart.x)}
                height={Math.abs(drawCurrent.y - drawStart.y)}
                fill="rgba(246,246,244,0.3)" stroke="#EBEBEB" strokeWidth={1} dash={[4, 4]}
              />
            )}
            {drawStart && drawCurrent && tool === 'arrow' && (
              <Arrow
                points={[drawStart.x, drawStart.y, drawCurrent.x, drawCurrent.y]}
                stroke="#111" strokeWidth={1.5} fill="#111" pointerLength={8} pointerWidth={6} dash={[4, 4]}
              />
            )}

            <Transformer
              ref={transformerRef}
              borderStroke="#111" borderStrokeWidth={1}
              anchorStroke="#111" anchorFill="#FFFFFF" anchorSize={8}
              rotateEnabled={false}
              onTransformEnd={handleTransformEnd}
            />
          </Layer>
        </Stage>

        {/* Minimap overlay */}
        <CanvasMinimap
          sections={sections}
          items={items}
          stageSize={stageSize}
          stagePos={stagePos}
          zoom={zoom}
          onNavigate={handleMinimapNavigate}
        />
      </div>

      <CanvasSidebar
        projectId={projectId}
        tool={tool}
        sections={sections}
        items={items}
        selectedId={selectedId}
        selectedType={selectedType}
        onSelectSection={(id) => { setSelectedId(id); setSelectedType('section'); }}
        onUpdateSection={handleUpdateSection}
        onDeleteSection={handleDeleteSection}
        onUpdateItem={handleUpdateItem}
        onAddCatalogItem={handleAddCatalogItem}
        boardTitle={board?.title || ''}
        onBoardTitleChange={handleBoardTitleChange}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <input
        ref={fileInputRef} type="file" accept="image/*" multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
    </div>
  );
}
