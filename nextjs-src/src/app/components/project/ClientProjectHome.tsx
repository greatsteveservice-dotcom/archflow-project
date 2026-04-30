"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ProjectWithStats, ProjectMemberWithProfile } from "../../lib/types";
import { useAuth } from "../../lib/auth";
import {
  useDesignFileCounts,
  useVisitReports,
  usePendingSignatures,
  useDuePayments,
  useProjectActivity,
  useUpcomingTimeline,
  useProjectStages,
} from "../../lib/hooks";

interface Props {
  project: ProjectWithStats;
  projectId: string;
  members: ProjectMemberWithProfile[];
  toast: (msg: string) => void;
}

const FIXED_STAGES = [
  "Сбор ТЗ, обмеры",
  "Планировочное решение",
  "Концепция",
  "Визуализация",
  "Рабочие чертежи",
  "Ведомость и спецификации",
];

function stageFromProgress(p: number): number {
  if (p < 16) return 0;
  if (p < 31) return 1;
  if (p < 51) return 2;
  if (p < 71) return 3;
  if (p < 91) return 4;
  return 5;
}

function formatStageDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const month = d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
  const year = d.getFullYear();
  const now = new Date();
  return year === now.getFullYear() ? `${day} ${month}` : `${day} ${month} ${year}`;
}

function formatDueDate(iso: string | null): { phrase: string; daysLeft: number } {
  if (!iso) return { phrase: "—", daysLeft: 99 };
  const due = new Date(iso);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - now.getTime()) / 86400000);
  const ddmm = due.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  let phrase = `до ${ddmm}`;
  if (days <= 0) phrase = `сегодня · ${ddmm}`;
  else if (days === 1) phrase = `завтра · ${ddmm}`;
  else if (days <= 7) phrase = `через ${days} дн · ${ddmm}`;
  else phrase = `до ${ddmm}`;
  return { phrase, daysLeft: days };
}

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  supervision: "Авторский надзор",
  design: "Дизайн",
  supply_commission: "Комиссия комплектации",
};

export default function ClientProjectHome({ project, projectId, members, toast }: Props) {
  const router = useRouter();
  const { profile } = useAuth();

  const { data: designCounts } = useDesignFileCounts(projectId);
  const { data: reports } = useVisitReports(projectId);
  const { data: dbStages } = useProjectStages(projectId);
  const { data: signatures } = usePendingSignatures(projectId, profile?.id || null);
  const { data: payments } = useDuePayments(projectId, 30);
  const { data: activity } = useProjectActivity(projectId, 4);
  const { data: timeline } = useUpcomingTimeline(projectId);

  // Designer = owner (always present) or first member with role='designer'
  const designerProfile = useMemo(() => {
    if (project.owner) return project.owner;
    const m = members.find(m => m.profile?.role === "designer");
    return m?.profile || null;
  }, [project.owner, members]);

  const designTotal = designCounts ? Object.values(designCounts).reduce((a, b) => a + b, 0) : 0;
  const reportsTotal = reports?.length || 0;

  // ─── Hero action ────────────────────────────────────────────
  type HeroTask = {
    kind: "sign" | "pay";
    title: string;
    sub: string;
    due: string;
    daysLeft: number;
    onClick: () => void;
    cta: string;
  };

  const tasks: HeroTask[] = useMemo(() => {
    const list: HeroTask[] = [];
    (signatures || []).forEach(s => {
      const { phrase, daysLeft } = formatDueDate(s.sent_at);
      list.push({
        kind: "sign",
        title: s.signer_name ? `Документ для ${s.signer_name}` : "Документ на подпись",
        sub: "Электронная подпись через Подпислон",
        due: phrase,
        daysLeft,
        onClick: () => router.push(`/projects/${projectId}/design`),
        cta: "Подписать →",
      });
    });
    (payments || []).forEach(p => {
      const { phrase, daysLeft } = formatDueDate(p.next_due);
      const amt = new Intl.NumberFormat("ru-RU").format(p.amount) + " ₽";
      list.push({
        kind: "pay",
        title: `${PAYMENT_TYPE_LABEL[p.type] || p.type} · ${amt}`,
        sub: "Оплата по договору",
        due: phrase,
        daysLeft,
        onClick: () => toast("Свяжитесь с дизайнером по оплате"),
        cta: "Связаться →",
      });
    });
    list.sort((a, b) => a.daysLeft - b.daysLeft);
    return list;
  }, [signatures, payments, projectId, router, toast]);

  const heroTask = tasks[0];
  const restTasks = tasks.length - 1;

  // ─── Stage progress ─────────────────────────────────────────
  // Try to derive current stage from real project_stages.status; fall back to
  // a progress-percentage heuristic if the designer hasn't filled them in.
  const stagesByOrder = useMemo(() => {
    const sorted = [...(dbStages || [])].sort((a, b) => a.sort_order - b.sort_order);
    return sorted;
  }, [dbStages]);

  const currentStage = useMemo(() => {
    const inProgress = stagesByOrder.findIndex(s => s.status === "in_progress");
    if (inProgress !== -1) return Math.min(inProgress, FIXED_STAGES.length - 1);
    const lastDone = stagesByOrder
      .map(s => s.status)
      .lastIndexOf("done");
    if (lastDone !== -1) return Math.min(lastDone + 1, FIXED_STAGES.length - 1);
    return stageFromProgress(project.progress || 0);
  }, [stagesByOrder, project.progress]);

  // end_date for stage i = start of stage (i+1).  We trust the DB row at the
  // same sort_order index when it has end_date filled in; otherwise we leave
  // the slot blank.
  const stageEndDates: (string | null)[] = useMemo(() => {
    const arr = FIXED_STAGES.map((_, i) => stagesByOrder[i]?.end_date || null);
    return arr;
  }, [stagesByOrder]);

  const stagePct = Math.round(((currentStage) / (FIXED_STAGES.length - 1)) * 100);

  const upcoming = (timeline || []).slice(0, 3);

  // ─── Module tiles ───────────────────────────────────────────
  // Chat is intentionally excluded — it's reachable from the designer card
  // above and from the bottom tabbar.
  type Tile = { id: string; index: string; name: string; count: number; label: string; unread?: boolean; href: string };
  const tiles: Tile[] = [
    { id: "design",      index: "01", name: "Дизайн",            count: designTotal,  label: "файлов",  href: `/projects/${projectId}/design` },
    { id: "supervision", index: "02", name: "Авторский надзор",  count: reportsTotal, label: "отчётов", href: `/projects/${projectId}/supervision` },
  ];

  return (
    <div className="af-content af-cab-root">
      {/* ═══ HERO ACTION ═══ */}
      {heroTask && (
        <section className="af-cab-hero" onClick={heroTask.onClick}>
          <div className="af-cab-hero-left">
            <div className="af-cab-hero-kicker">
              <span>От вас ждут</span>
              <span className="af-cab-hero-urgency">{heroTask.due}</span>
            </div>
            <h2 className="af-cab-hero-title">{heroTask.title}</h2>
            <div className="af-cab-hero-meta">{heroTask.sub}</div>
          </div>
          <button
            className="af-cab-hero-cta"
            onClick={(e) => { e.stopPropagation(); heroTask.onClick(); }}
          >
            {heroTask.cta}
          </button>
          {restTasks > 0 && (
            <div className="af-cab-hero-more">
              <span>+{restTasks} {restTasks === 1 ? "задача" : "задач"} ниже</span>
              <a>Перейти →</a>
            </div>
          )}
        </section>
      )}

      {/* ═══ STAGE PROGRESS ═══ */}
      <section className="af-cab-stage2">
        <div className="af-cab-stage2-kicker">Этапы проекта</div>
        <h1 className="af-cab-stage2-name">{FIXED_STAGES[currentStage]}</h1>
        <div className="af-cab-stage2-sub">
          Этап <strong>{currentStage + 1}</strong> из {FIXED_STAGES.length} · {stagePct}%
        </div>
        <div className="af-cab-stage2-bar">
          {FIXED_STAGES.map((_, i) => (
            <span
              key={i}
              className={`af-cab-stage2-seg ${i < currentStage ? "done" : i === currentStage ? "now" : ""}`}
            />
          ))}
        </div>
        <ul className="af-cab-stage2-list">
          {FIXED_STAGES.map((label, i) => {
            const done = i < currentStage;
            const now = i === currentStage;
            const endIso = stageEndDates[i];
            return (
              <li
                key={i}
                className={`af-cab-stage2-row ${done ? "done" : now ? "now" : "future"}`}
              >
                <span className="af-cab-stage2-box" aria-hidden="true">
                  {done ? "✓" : ""}
                </span>
                <span className="af-cab-stage2-label">{label}</span>
                <span className="af-cab-stage2-date">{formatStageDate(endIso)}</span>
                <span className="af-cab-stage2-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ═══ DESIGNER + ACTIVITY ═══ */}
      <section className="af-cab-mid">
        {/* Designer */}
        <div className="af-cab-designer af-cab-designer-compact">
          {designerProfile ? (
            <>
              <div className="af-cab-designer-row">
                <span className="af-cab-designer-label">Дизайнер</span>
                <span className="af-cab-designer-name-inline">
                  {(designerProfile.full_name || "Дизайнер").split(" ")[0]}
                </span>
              </div>
              <div className="af-cab-designer-actions">
                <button
                  className="af-cab-btn primary"
                  onClick={() => router.push(`/projects/${projectId}/chat`)}
                >
                  Написать в чат →
                </button>
                {designerProfile.phone && (
                  <a className="af-cab-btn" href={`tel:${designerProfile.phone}`}>
                    {designerProfile.phone}
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="af-cab-designer-empty">Дизайнер не назначен</div>
          )}
        </div>

        {/* Activity */}
        <div className="af-cab-activity">
          <div className="af-cab-kicker">Активность по проекту</div>
          {(activity || []).length === 0 ? (
            <div className="af-cab-empty">Пока нет событий</div>
          ) : (
            <>
              {(activity || []).map(item => (
                <div key={item.id} className="af-cab-act-row">
                  <div className={`af-cab-avatar-sm ${item.who ? "" : "sys"}`}>
                    {item.who ? <span>{item.whoInitials}</span> : <span>·</span>}
                  </div>
                  <div className="af-cab-act-body">
                    <span className="af-cab-act-when">{item.relativeTime}</span>
                    <span className="af-cab-act-text">
                      {item.who && <em>{item.who} </em>}
                      {item.text}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* ═══ MODULE TILES ═══ */}
      <section className="af-tab-list af-tab-list-large">
        {tiles.map(t => (
          <div
            key={t.id}
            className="af-tab-row"
            onClick={() => router.push(t.href)}
          >
            <span className="af-tab-index">{t.index}</span>
            <span className="af-tab-name">{t.name}</span>
            <div className="af-tab-metric">
              <span className="af-tab-metric-value">
                {t.unread && <span className="af-cab-unread-dot" />}
                {t.count}
              </span>
              <span className="af-tab-metric-label">{t.label}</span>
            </div>
            <span className="af-tab-arrow">→</span>
          </div>
        ))}
      </section>

      {/* ═══ UPCOMING ═══ */}
      <section className="af-cab-status">
        {/* Upcoming events */}
        <div className="af-cab-upcoming">
          <div className="af-cab-kicker">Что впереди</div>
          {upcoming.length === 0 ? (
            <div className="af-cab-empty">В ближайшие 14 дней событий нет</div>
          ) : (
            <>
              {upcoming.map(ev => (
                <div key={`${ev.type}-${ev.id}`} className="af-cab-event">
                  <span className="af-cab-event-when">
                    {new Date(ev.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                  </span>
                  <span className="af-cab-event-what">{ev.title}</span>
                </div>
              ))}
              <a
                className="af-cab-link"
                onClick={() => router.push(`/projects/${projectId}/supervision`)}
              >
                Календарь →
              </a>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
