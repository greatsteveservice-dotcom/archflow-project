"use client";

import { useState } from "react";
import Modal from "./Modal";
import type { ScenarioType } from "../lib/types";
import { createProject } from "../lib/queries";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProjectModal({ open, onClose, onSuccess }: CreateProjectModalProps) {
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [scenarioType, setScenarioType] = useState<ScenarioType>("block");
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
      await createProject({
        title: title.trim(),
        address: address.trim() || undefined,
        scenario_type: scenarioType,
        start_date: startDate || undefined,
      });
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || "Ошибка создания проекта");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setAddress("");
    setScenarioType("block");
    setStartDate("");
    setError("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Новый проект">
      {error && (
        <div className="bg-[#FEF0EC] border border-[#E85D3A]/20 text-[#E85D3A] text-[13px] px-4 py-2.5 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
            Название проекта *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Квартира на Патриарших"
            className="w-full px-3 py-2.5 border border-[#E8E6E1] rounded-lg text-sm outline-none transition-colors focus:border-[#2C5F2D]"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
            Адрес
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Москва, ул. Малая Бронная, 15"
            className="w-full px-3 py-2.5 border border-[#E8E6E1] rounded-lg text-sm outline-none transition-colors focus:border-[#2C5F2D]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
              Тип стройки
            </label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value as ScenarioType)}
              className="w-full px-3 py-2.5 border border-[#E8E6E1] rounded-lg text-sm outline-none transition-colors focus:border-[#2C5F2D] bg-white"
            >
              <option value="block">Блок</option>
              <option value="gkl">ГКЛ</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
              Дата начала
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#E8E6E1] rounded-lg text-sm outline-none transition-colors focus:border-[#2C5F2D]"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 border border-[#E8E6E1] rounded-lg text-sm font-medium text-[#6B6B6B] hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#2C5F2D] text-white rounded-lg text-sm font-medium hover:bg-[#1E4620] transition-colors disabled:opacity-50"
          >
            {saving ? "Создание..." : "Создать проект"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
