'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Arrow, Image as KImage } from 'react-konva';
import Konva from 'konva';
import type { Moodboard, MoodboardItem, MoodboardSection } from '../../lib/types';

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

interface Props {
  board: Moodboard;
  items: MoodboardItem[];
  sections: MoodboardSection[];
  token: string;
}

function ReactionBadge({ reaction }: { reaction: string | null }) {
  if (!reaction) return null;
  const label = reaction === 'like' ? '+' : reaction === 'dislike' ? '−' : '?';
  return (
    <>
      <Rect x={0} y={0} width={20} height={20} fill="#111" />
      <Text text={label} x={0} y={3} width={20} align="center" fontSize={13} fontFamily="Vollkorn SC" fontStyle="bold" fill="#FFF" />
    </>
  );
}

function PublicImageNode({ item, onSelect, isSelected }: { item: MoodboardItem; onSelect: (id: string) => void; isSelected: boolean }) {
  const img = useCanvasImage(item.image_url);
  const w = item.canvas_w || 200, h = item.canvas_h || 200;
  return (
    <Group x={item.canvas_x || 0} y={item.canvas_y || 0} onClick={(e) => { e.cancelBubble = true; onSelect(item.id); }} onTap={(e) => { e.cancelBubble = true; onSelect(item.id); }}>
      <Rect width={w} height={h} fill="#FFF" stroke={isSelected ? '#111' : '#EBEBEB'} strokeWidth={isSelected ? 2 : 0.5} />
      {img && <KImage image={img} width={w} height={h} />}
      {item.title && <Text text={item.title} y={h + 4} fontSize={10} fontFamily="Vollkorn SC" fill="#111" width={w} />}
      <ReactionBadge reaction={item.client_reaction} />
    </Group>
  );
}

function PublicTextNode({ item, onSelect, isSelected }: { item: MoodboardItem; onSelect: (id: string) => void; isSelected: boolean }) {
  const w = item.canvas_w || 160, h = item.canvas_h || 80;
  return (
    <Group x={item.canvas_x || 0} y={item.canvas_y || 0} onClick={(e) => { e.cancelBubble = true; onSelect(item.id); }} onTap={(e) => { e.cancelBubble = true; onSelect(item.id); }}>
      <Rect width={w} height={h} fill={item.bg_color || '#F6F6F4'} stroke={isSelected ? '#111' : '#EBEBEB'} strokeWidth={isSelected ? 2 : 0.5} />
      <Text text={item.text_content || ''} x={8} y={8} width={w - 16} fontSize={12} fontFamily="Vollkorn SC" fill={item.text_color || '#111'} wrap="word" />
    </Group>
  );
}

function PublicColorNode({ item, onSelect, isSelected }: { item: MoodboardItem; onSelect: (id: string) => void; isSelected: boolean }) {
  const s = item.canvas_w || 60;
  return (
    <Group x={item.canvas_x || 0} y={item.canvas_y || 0} onClick={(e) => { e.cancelBubble = true; onSelect(item.id); }} onTap={(e) => { e.cancelBubble = true; onSelect(item.id); }}>
      <Rect width={s} height={s} fill={item.color_hex || '#ccc'} stroke={isSelected ? '#111' : '#EBEBEB'} strokeWidth={isSelected ? 2 : 0.5} />
      {item.color_name && <Text text={item.color_name} y={s + 4} fontSize={9} fontFamily="Vollkorn SC" fill="#111" width={s} align="center" />}
    </Group>
  );
}

function PublicCatalogNode({ item, onSelect, isSelected }: { item: MoodboardItem; onSelect: (id: string) => void; isSelected: boolean }) {
  const img = useCanvasImage(item.image_url);
  const w = item.canvas_w || 220, h = item.canvas_h || 200, imgH = h - 44;
  return (
    <Group x={item.canvas_x || 0} y={item.canvas_y || 0} onClick={(e) => { e.cancelBubble = true; onSelect(item.id); }} onTap={(e) => { e.cancelBubble = true; onSelect(item.id); }}>
      <Rect width={w} height={h} fill="#FFF" stroke={isSelected ? '#111' : '#EBEBEB'} strokeWidth={isSelected ? 2 : 0.5} />
      <Rect width={w} height={imgH} fill="#F6F6F4" />
      {img && <KImage image={img} width={w} height={imgH} />}
      <Rect x={0} y={0} width={64} height={16} fill="#111" />
      <Text text="КАТАЛОГ" x={0} y={3} width={64} align="center" fontSize={8} fontFamily="Vollkorn SC" fontStyle="bold" fill="#FFF" letterSpacing={0.5} />
      <Text text={item.title || 'Товар'} x={8} y={imgH + 6} width={w - 16} fontSize={11} fontFamily="Vollkorn SC" fontStyle="bold" fill="#111" ellipsis={true} wrap="none" />
      <Text text={item.text_content || ''} x={8} y={imgH + 24} width={w - 16} fontSize={10} fontFamily="Vollkorn SC" fill="#999" />
      <ReactionBadge reaction={item.client_reaction} />
    </Group>
  );
}

function PublicSectionNode({ section }: { section: MoodboardSection }) {
  return (
    <Group x={section.canvas_x} y={section.canvas_y}>
      <Rect width={section.canvas_w} height={section.canvas_h} fill="rgba(246,246,244,0.5)" stroke="#EBEBEB" strokeWidth={1} dash={[6, 3]} />
      <Rect width={section.canvas_w} height={28} fill="#EBEBEB" />
      <Text
        text={(section.title || 'Секция') + (section.area_label ? ` ${section.area_label}` : '')}
        x={8} y={7} fontSize={12} fontFamily="Vollkorn SC" fontStyle="bold" fill="#111" width={section.canvas_w - 16}
      />
    </Group>
  );
}

export default function BoardPublicView({ board, items: initialItems, sections, token }: Props) {
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const c = containerRef.current; if (!c) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setStageSize({ width, height });
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!stageRef.current || (!sections.length && !items.length)) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of sections) {
      minX = Math.min(minX, s.canvas_x); minY = Math.min(minY, s.canvas_y);
      maxX = Math.max(maxX, s.canvas_x + s.canvas_w); maxY = Math.max(maxY, s.canvas_y + s.canvas_h);
    }
    for (const i of items) {
      const x = i.canvas_x || 0, y = i.canvas_y || 0, w = i.canvas_w || 200, h = i.canvas_h || 200;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
    }
    if (!isFinite(minX)) return;
    const pad = 40;
    const cw = maxX - minX + pad * 2, ch = maxY - minY + pad * 2;
    const s = Math.min(stageSize.width / cw, stageSize.height / ch, 2);
    const pos = { x: stageSize.width / 2 - (minX + (maxX - minX) / 2) * s, y: stageSize.height / 2 - (minY + (maxY - minY) / 2) * s };
    stageRef.current.scale({ x: s, y: s });
    stageRef.current.position(pos);
    setZoom(s);
    setStagePos(pos);
  }, [stageSize, sections.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current; if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition()!;
    const mp = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const factor = e.evt.deltaY < 0 ? 1.08 : 1 / 1.08;
    const ns = Math.max(0.05, Math.min(5, oldScale * factor));
    const np = { x: pointer.x - mp.x * ns, y: pointer.y - mp.y * ns };
    stage.scale({ x: ns, y: ns });
    stage.position(np);
    setZoom(ns);
    setStagePos(np);
  }, []);

  const handleStageDragEnd = useCallback(() => {
    const stage = stageRef.current;
    if (stage) setStagePos({ x: stage.x(), y: stage.y() });
  }, []);

  const gridStyle = useMemo(() => {
    const size = 20 * zoom;
    const dotR = Math.max(0.5, zoom * 0.8);
    return {
      backgroundImage: `radial-gradient(circle, #EBEBEB ${dotR}px, transparent ${dotR}px)`,
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: `${stagePos.x % size}px ${stagePos.y % size}px`,
    };
  }, [zoom, stagePos]);

  const selectedItem = selectedId ? items.find(i => i.id === selectedId) : null;
  const canReact = !!(selectedItem && (selectedItem.type === 'image' || selectedItem.type === 'catalog'));

  const handleReact = useCallback(async (reaction: 'like' | 'dislike' | 'maybe' | null) => {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    setItems(prev => prev.map(i => i.id === selectedId ? { ...i, client_reaction: reaction } : i));
    try {
      const res = await fetch('/api/moodboard/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedId, reaction, token }),
      });
      if (!res.ok) throw new Error('Failed');
    } catch (e) {
      setItems(initialItems);
    }
    setSubmitting(false);
  }, [selectedId, token, submitting, initialItems]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F6F6F4' }}>
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderBottom: '0.5px solid #EBEBEB', background: '#FFF',
        fontFamily: "'Vollkorn SC', serif",
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{board.title}</div>
        <div style={{ fontSize: 9, color: '#999' }}>{Math.round(zoom * 100)}% &middot; Archflow</div>
      </div>

      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'grab', ...gridStyle }}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width} height={stageSize.height}
          onWheel={handleWheel}
          onDragEnd={handleStageDragEnd}
          onClick={(e) => { if (e.target === stageRef.current) setSelectedId(null); }}
          draggable
        >
          <Layer>
            {sections.map(s => <PublicSectionNode key={s.id} section={s} />)}
            {items.filter(i => i.type !== 'arrow').map(item => {
              const p = { onSelect: setSelectedId, isSelected: selectedId === item.id };
              if (item.type === 'image') return <PublicImageNode key={item.id} item={item} {...p} />;
              if (item.type === 'text_note') return <PublicTextNode key={item.id} item={item} {...p} />;
              if (item.type === 'color_swatch') return <PublicColorNode key={item.id} item={item} {...p} />;
              if (item.type === 'catalog') return <PublicCatalogNode key={item.id} item={item} {...p} />;
              return null;
            })}
            {items.filter(i => i.type === 'arrow').map(item => (
              <Arrow
                key={item.id}
                points={[item.canvas_x || 0, item.canvas_y || 0, (item.canvas_x || 0) + (item.canvas_w || 100), (item.canvas_y || 0) + (item.canvas_h || 0)]}
                stroke="#999" strokeWidth={1.5} fill="#999" pointerLength={8} pointerWidth={6}
              />
            ))}
          </Layer>
        </Stage>

        {canReact && (
          <div style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#FFF',
            border: '0.5px solid #EBEBEB',
            padding: 6,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            fontFamily: "'Vollkorn SC', serif",
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            zIndex: 10,
          }}>
            <div style={{ fontSize: 9, color: '#999', padding: '0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Реакция:
            </div>
            <button
              className={`af-board-reaction-btn${selectedItem?.client_reaction === 'like' ? ' active' : ''}`}
              onClick={() => handleReact(selectedItem?.client_reaction === 'like' ? null : 'like')}
              title="Нравится"
              disabled={submitting}
            >+</button>
            <button
              className={`af-board-reaction-btn${selectedItem?.client_reaction === 'maybe' ? ' active' : ''}`}
              onClick={() => handleReact(selectedItem?.client_reaction === 'maybe' ? null : 'maybe')}
              title="Возможно"
              disabled={submitting}
            >?</button>
            <button
              className={`af-board-reaction-btn${selectedItem?.client_reaction === 'dislike' ? ' active' : ''}`}
              onClick={() => handleReact(selectedItem?.client_reaction === 'dislike' ? null : 'dislike')}
              title="Не нравится"
              disabled={submitting}
            >−</button>
          </div>
        )}

        {!selectedItem && items.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 16, left: 16,
            fontFamily: "'Vollkorn SC', serif", fontSize: 9, color: '#999',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Кликните на референс, чтобы оставить реакцию
          </div>
        )}
      </div>
    </div>
  );
}
