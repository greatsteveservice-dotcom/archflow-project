"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ProjectWithStats, ProjectMemberWithProfile, SupplyStatus } from "../../lib/types";
import { useAuth } from "../../lib/auth";
import {
  useDesignFileCounts,
  useProjectSupplyItems,
  useVisitReports,
  useChatUnreadByType,
  usePendingSignatures,
  useDuePayments,
  useProjectActivity,
  useUpcomingTimeline,
} from "../../lib/hooks";

interface Props {
  project: ProjectWithStats;
  projectId: string;
  members: ProjectMemberWithProfile[];
  toast: (msg: string) => void;
}

const FIXED_STAGES = [
  "Концепция",
  "Документы",
  "Чистовая",
  "Комплектация",
  "Сборка",
  "Сдача",
];

function stageFromProgress(p: number): number {
  if (p < 16) return 0;
  if (p < 31) return 1;
  if (p < 51) return 2;
  if (p < 71) return 3;
  if (p < 91) return 4;
  return 5;
}

function initials(name: string | null | undefined): string {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "··";
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
  const { data: supplyItems } = useProjectSupplyItems(projectId);
  const { data: reports } = useVisitReports(projectId);
  const { count: unreadClient } = useChatUnreadByType(projectId, profile?.id || null, "client");
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
  const supplyTotal = supplyItems?.length || 0;
  const reportsTotal = reports?.length || 0;
  const unreadTotal = unreadClient || 0;

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
  const currentStage = stageFromProgress(project.progress || 0);

  // ─── Supply by status ───────────────────────────────────────
  const supplyByStatus = useMemo(() => {
    const map: Record<SupplyStatus, number> = {
      pending: 0, approved: 0, in_review: 0, ordered: 0, in_production: 0, delivered: 0,
    };
    (supplyItems || []).forEach(s => { map[s.status] = (map[s.status] || 0) + 1; });
    return map;
  }, [supplyItems]);

  const supplyOrdered = supplyByStatus.ordered + supplyByStatus.in_production;
  const supplyPending = supplyByStatus.pending + supplyByStatus.in_review + supplyByStatus.approved;
  const supplyDelivered = supplyByStatus.delivered;
  const supplyTotalCalc = supplyOrdered + supplyPending + supplyDelivered;

  const upcoming = (timeline || []).slice(0, 3);

  // ─── Module tiles ───────────────────────────────────────────
  type Tile = { id: string; index: string; name: string; count: number; label: string; unread?: boolean; href: string };
  const tiles: Tile[] = [
    { id: "design",      index: "01", name: "Дизайн",            count: designTotal,  label: "файлов",  href: `/projects/${projectId}/design` },
    { id: "supply",      index: "02", name: "Комплектация",      count: supplyTotal,  label: "позиций", href: `/projects/${projectId}/supply` },
    { id: "supervision", index: "03", name: "Авторский надзор",  count: reportsTotal, label: "отчётов", href: `/projects/${projectId}/supervision` },
    { id: "chat",        index: "04", name: "Чат",               count: unreadTotal,  label: unreadTotal === 1 ? "новое" : "новых", unread: unreadTotal > 0, href: `/projects/${projectId}/chat` },
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
      <section className="af-cab-stage">
        <div className="af-cab-stage-head">
          <div className="af-cab-stage-kicker">Стадия проекта</div>
          <h1 className="af-cab-stage-name">{FIXED_STAGES[currentStage]}</h1>
          <div className="af-cab-stage-sub">
            Этап <strong>{currentStage + 1} из 6</strong>
            {project.progress != null && <> · <strong>{project.progress} %</strong></>}
          </div>
        </div>
        <div className="af-cab-stage-bar">
          {FIXED_STAGES.map((_, i) => (
            <div key={i} className={`af-cab-stage-seg ${i < currentStage ? "done" : i === currentStage ? "now" : ""}`} />
          ))}
        </div>
        <div className="af-cab-stage-labels">
          {FIXED_STAGES.map((label, i) => (
            <div key={i} className={`af-cab-stage-lab ${i < currentStage ? "done" : i === currentStage ? "now" : ""}`}>{label}</div>
          ))}
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

      {/* ═══ DESIGNER + ACTIVITY ═══ */}
      <section className="af-cab-mid">
        {/* Designer */}
        <div className="af-cab-designer">
          <div className="af-cab-kicker">Ваш дизайнер</div>
          {designerProfile ? (
            <>
              <div className="af-cab-avatar-big">
                {designerProfile.avatar_url ? (
                  <img src={designerProfile.avatar_url} alt="" />
                ) : (
                  <span>{initials(designerProfile.full_name)}</span>
                )}
              </div>
              <div className="af-cab-designer-name">{designerProfile.full_name || "Дизайнер"}</div>
              <div className="af-cab-designer-role">Ведёт ваш проект</div>
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

      {/* ═══ UPCOMING + SUPPLY STATUS ═══ */}
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

        {/* Supply status */}
        {supplyTotalCalc > 0 && (
          <div className="af-cab-supply">
            <div className="af-cab-kicker">Поставки</div>
            <div className="af-cab-supply-hero">
              <span className="af-cab-supply-num">{supplyTotal}</span>
              <span className="af-cab-supply-label">позиций всего</span>
            </div>
            <div className="af-cab-supply-stack">
              {supplyOrdered > 0 && <span className="s1" style={{ width: `${(supplyOrdered / supplyTotalCalc) * 100}%` }} />}
              {supplyPending > 0 && <span className="s2" style={{ width: `${(supplyPending / supplyTotalCalc) * 100}%` }} />}
              {supplyDelivered > 0 && <span className="s3" style={{ width: `${(supplyDelivered / supplyTotalCalc) * 100}%` }} />}
            </div>
            <div className="af-cab-supply-legend">
              <div className="row"><span className="dot s1" /><span className="lab">Заказано</span><span className="num">{supplyOrdered}</span></div>
              <div className="row"><span className="dot s2" /><span className="lab">Ожидает</span><span className="num">{supplyPending}</span></div>
              <div className="row"><span className="dot s3" /><span className="lab">Доставлено</span><span className="num">{supplyDelivered}</span></div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
