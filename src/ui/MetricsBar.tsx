import type { Ledger } from "../data/types";
import { currentRiskState, unresolvedHighSessions } from "../domain/risk";
import { followupStatus } from "../domain/followup";

interface Props {
  ledger: Ledger;
  nowIso: string;
}

export function MetricsBar({ ledger, nowIso }: Props) {
  const open = ledger.cases.filter((c) => c.status === "open");
  const highCases = open.filter((c) => currentRiskState(ledger, c.id) === "high");

  let overdue = 0;
  let pending = 0;
  for (const c of highCases) {
    for (const s of unresolvedHighSessions(ledger, c.id)) {
      const st = followupStatus(s, ledger.attempts, nowIso);
      if (st === "overdue") overdue += 1;
      else if (st === "pending") pending += 1;
    }
  }

  const awaiting = open.filter((c) => {
    if (currentRiskState(ledger, c.id) !== "high") return false;
    return unresolvedHighSessions(ledger, c.id).length === 0;
  }).length;

  const since = Date.parse(nowIso) - 7 * 24 * 3_600_000;
  const weekSessions = ledger.sessions.filter((s) => Date.parse(s.at) >= since).length;

  const cards = [
    { label: "在档个案", value: open.length, tone: "ok" },
    { label: "高风险关注", value: highCases.length, tone: highCases.length ? "danger" : "ok" },
    { label: "跟进逾期", value: overdue, tone: overdue ? "danger" : "ok" },
    { label: "待跟进 / 待督导确认", value: pending + awaiting, tone: pending || awaiting ? "watch" : "ok" },
    { label: "近 7 日会谈", value: weekSessions, tone: "ok" },
  ];

  return (
    <section className="metrics-grid metrics-5">
      {cards.map((m) => (
        <article key={m.label} className={`metric-card metric-${m.tone}`}>
          <span>{m.label}</span>
          <strong>{m.value}</strong>
          <i className={`status-${m.tone}`} />
        </article>
      ))}
    </section>
  );
}
