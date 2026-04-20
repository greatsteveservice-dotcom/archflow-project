'use client';

import { useMemo, useCallback } from 'react';
import type { MoodboardItem, MoodboardSection } from '../../lib/types';

const MINIMAP_W = 160;
const MINIMAP_H = 120;

interface Props {
  sections: MoodboardSection[];
  items: MoodboardItem[];
  stageSize: { width: number; height: number };
  stagePos: { x: number; y: number };
  zoom: number;
  onNavigate: (worldX: number, worldY: number) => void;
}

export default function CanvasMinimap({ sections, items, stageSize, stagePos, zoom, onNavigate }: Props) {
  // Compute world bounding box (include viewport)
  const bb = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of sections) {
      minX = Math.min(minX, s.canvas_x); minY = Math.min(minY, s.canvas_y);
      maxX = Math.max(maxX, s.canvas_x + s.canvas_w); maxY = Math.max(maxY, s.canvas_y + s.canvas_h);
    }
    for (const i of items) {
      const x = i.canvas_x || 0, y = i.canvas_y || 0, w = i.canvas_w || 200, h = i.canvas_h || 200;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
    }
    // Include viewport
    const vx = -stagePos.x / zoom, vy = -stagePos.y / zoom;
    const vw = stageSize.width / zoom, vh = stageSize.height / zoom;
    minX = Math.min(minX, vx); minY = Math.min(minY, vy);
    maxX = Math.max(maxX, vx + vw); maxY = Math.max(maxY, vy + vh);
    if (!isFinite(minX)) return null;
    const pad = 60;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }, [sections, items, stageSize, stagePos, zoom]);

  if (!bb || (sections.length === 0 && items.length === 0)) return null;

  const worldW = bb.maxX - bb.minX;
  const worldH = bb.maxY - bb.minY;
  const scale = Math.min(MINIMAP_W / worldW, MINIMAP_H / worldH);
  const drawW = worldW * scale;
  const drawH = worldH * scale;

  // Viewport rectangle in minimap coords
  const vpX = (-stagePos.x / zoom - bb.minX) * scale;
  const vpY = (-stagePos.y / zoom - bb.minY) * scale;
  const vpW = (stageSize.width / zoom) * scale;
  const vpH = (stageSize.height / zoom) * scale;

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const worldX = bb.minX + localX / scale;
    const worldY = bb.minY + localY / scale;
    onNavigate(worldX, worldY);
  }, [bb, scale, onNavigate]);

  return (
    <div
      className="af-canvas-minimap"
      onClick={handleClick}
      style={{ width: drawW + 8, height: drawH + 8 }}
    >
      <div style={{ position: 'relative', width: drawW, height: drawH, margin: 4 }}>
        {/* Sections */}
        {sections.map(s => (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              left: (s.canvas_x - bb.minX) * scale,
              top: (s.canvas_y - bb.minY) * scale,
              width: s.canvas_w * scale,
              height: s.canvas_h * scale,
              background: 'rgba(246,246,244,0.6)',
              border: '0.5px dashed #AAA',
            }}
          />
        ))}
        {/* Items */}
        {items.filter(i => i.type !== 'arrow').map(i => (
          <div
            key={i.id}
            style={{
              position: 'absolute',
              left: ((i.canvas_x || 0) - bb.minX) * scale,
              top: ((i.canvas_y || 0) - bb.minY) * scale,
              width: Math.max(2, (i.canvas_w || 200) * scale),
              height: Math.max(2, (i.canvas_h || 200) * scale),
              background: i.type === 'color_swatch' ? (i.color_hex || '#999') : '#111',
              opacity: 0.7,
            }}
          />
        ))}
        {/* Viewport */}
        <div
          style={{
            position: 'absolute',
            left: vpX, top: vpY, width: vpW, height: vpH,
            border: '1px solid #111',
            background: 'rgba(17,17,17,0.05)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
