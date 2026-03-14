"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ProjectCard from "../components/ProjectCard";
import { PROJECTS } from "../lib/data";

export default function ProjectsPage() {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const filtered = filter === "all" ? PROJECTS : PROJECTS.filter((p) => p.status === filter);

  const tabs = [
    { id: "all" as const, label: "Все" },
    { id: "active" as const, label: "Активные" },
    { id: "completed" as const, label: "Завершённые" },
  ];

  return (
    <div className="flex min-h-screen bg-zhan-bg">
      <Sidebar />
      <div className="flex-1 overflow-y-auto main-scroll">
        <div className="px-8 py-5 flex items-center justify-between border-b border-zhan-border bg-zhan-surface sticky top-0 z-10">
          <h1 className="text-xl font-semibold">Проекты</h1>
        </div>

        <div className="p-8 animate-fade-in">
          {/* Filter tabs */}
          <div className="flex gap-1 bg-zhan-border-light rounded-lg p-[3px] w-fit mb-5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 text-[13px] font-medium rounded-md transition-all
                  ${filter === tab.id
                    ? "bg-zhan-surface text-zhan-text shadow-sm"
                    : "text-zhan-text-muted hover:text-zhan-text-secondary"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
