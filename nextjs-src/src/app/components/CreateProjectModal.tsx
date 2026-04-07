"use client";

import { useState } from "react";
import { createProject } from "../lib/queries";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
}

export default function CreateProjectModal({ open, onClose, onSuccess }: CreateProjectModalProps) {
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Введите название проекта");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const project = await createProject({
        title: title.trim(),
        address: address.trim() || undefined,
        start_date: startDate || undefined,
      });
      handleClose();
      onSuccess(project.id);
    } catch (err: any) {
      setError(err.message || "Ошибка создания проекта");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setAddress("");
    setStartDate("");
    setError("");
    onClose();
  };

  if (!open) return null;

  const mono = "'IBM Plex Mono', monospace";
  const display = "'Playfair Display', serif";

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--af-white)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', overflow: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', flexShrink: 0 }}>
        <button
          onClick={handleClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'var(--af-black)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            padding: 0,
          }}
        >
          ← Назад
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '0 24px 40px', flex: 1 }}>
        <h1 style={{
          fontFamily: display, fontSize: 32, fontWeight: 900,
          color: 'var(--af-black)', marginBottom: 24,
        }}>
          Новый проект
        </h1>

        {error && (
          <div style={{
            border: '0.5px solid var(--af-black)', padding: '10px 14px', marginBottom: 20,
            fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'var(--af-black)',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontFamily: mono, fontSize: 'var(--af-fs-9)',
              color: 'var(--af-black)', textTransform: 'uppercase', letterSpacing: '0.12em',
              marginBottom: 8,
            }}>
              Название проекта *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Квартира на Патриарших"
              className="af-input"
              style={{ height: 48, fontSize: 13 }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontFamily: mono, fontSize: 'var(--af-fs-9)',
              color: 'var(--af-black)', textTransform: 'uppercase', letterSpacing: '0.12em',
              marginBottom: 8,
            }}>
              Адрес
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Москва, ул. Малая Бронная, 15"
              className="af-input"
              style={{ height: 48, fontSize: 13 }}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{
              display: 'block', fontFamily: mono, fontSize: 'var(--af-fs-9)',
              color: 'var(--af-black)', textTransform: 'uppercase', letterSpacing: '0.12em',
              marginBottom: 8,
            }}>
              Дата начала
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="af-input"
              style={{ height: 48, fontSize: 13 }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="af-btn af-btn-full"
            style={{ height: 52, fontSize: 11 }}
          >
            {saving ? "Создание..." : "Создать →"}
          </button>
        </form>
      </div>
    </div>
  );
}
