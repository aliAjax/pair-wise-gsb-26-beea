import { useMemo, useState } from "react";
import type { Ledger } from "../data/types";
import { currentRiskState, trailingLowSessions, unresolvedHighSessions } from "../domain/risk";
import { followupStatus } from "../domain/followup";
import type { NewCaseInput } from "../domain/commands";
import { fmtDate } from "./format";

interface Props {
  ledger: Ledger;
  nowIso: string;
  selectedId: string | null;
  onSelect: (caseId: string) => void;
  onCreate: (input: NewCaseInput) => string | null;
}

export function CaseList({ ledger, nowIso, selectedId, onSelect, onCreate }: Props) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ alias: "", theme: "", mainConcern: "", emotion: "" });

  const rows = useMemo(() => {
    return ledger.cases
      .map((c) => {
        const state = currentRiskState(ledger, c.id);
        const sessions = ledger.sessions
          .filter((s) => s.caseId === c.id)
          .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
        const overdue = sessions.some(
          (s) => followupStatus(s, ledger.attempts, nowIso) === "overdue"
        );
        const pendingConfirm =
          state === "high" &&
          trailingLowSessions(ledger, c.id).length >= 2 &&
          unresolvedHighSessions(ledger, c.id).length === 0;
        return { c, state, lastAt: sessions[0]?.at, overdue, pendingConfirm };
      })
      .sort((a, b) => {
        // 逾期最优先，然后高风险，然后在档，最后按最近会谈
        const score = (r: typeof a) =>
          (r.overdue ? 0 : 1) * 10 + (r.state === "high" ? 0 : 2) + (r.c.status === "closed" ? 4 : 0);
        const s = score(a) - score(b);
        if (s !== 0) return s;
        return Date.parse(b.lastAt ?? b.c.openedAt) - Date.parse(a.lastAt ?? a.c.openedAt);
      });
  }, [ledger, nowIso]);

  const submit = () => {
    const id = onCreate(form);
    if (id) {
      setForm({ alias: "", theme: "", mainConcern: "", emotion: "" });
      setAdding(false);
      onSelect(id);
    }
  };

  return (
    <aside className="panel narrow case-list">
      <div className="section-heading">
        <div>
          <p>个案台账</p>
          <h2>在档个案 {ledger.cases.length}</h2>
        </div>
        <button className="primary-action" onClick={() => setAdding((v) => !v)}>
          {adding ? "取消" : "新个案"}
        </button>
      </div>

      {adding && (
        <div className="new-case-form">
          <input
            placeholder="来访者代号（脱敏）"
            value={form.alias}
            onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
          />
          <input
            placeholder="咨询主题"
            value={form.theme}
            onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
          />
          <input
            placeholder="主要困扰（可选）"
            value={form.mainConcern}
            onChange={(e) => setForm((f) => ({ ...f, mainConcern: e.target.value }))}
          />
          <input
            placeholder="情绪状态（可选）"
            value={form.emotion}
            onChange={(e) => setForm((f) => ({ ...f, emotion: e.target.value }))}
          />
          <button className="primary-action" onClick={submit}>
            建档
          </button>
        </div>
      )}

      <div className="case-items">
        {rows.map(({ c, state, lastAt, overdue, pendingConfirm }) => (
          <button
            key={c.id}
            className={`case-item ${selectedId === c.id ? "active" : ""}`}
            onClick={() => onSelect(c.id)}
          >
            <div className="case-item-head">
              <strong>{c.id}</strong>
              {c.status === "closed" ? (
                <span className="badge badge-closed">已结案</span>
              ) : overdue ? (
                <span className="badge badge-overdue">跟进逾期</span>
              ) : state === "high" ? (
                <span className="badge badge-high">高风险</span>
              ) : state === "downgraded" ? (
                <span className="badge badge-downgraded">已降级</span>
              ) : (
                <span className="badge badge-stable">稳定</span>
              )}
            </div>
            <p className="case-item-sub">
              {c.alias} · {c.theme}
            </p>
            <p className="case-item-meta">
              {pendingConfirm && <span className="flag-confirm">待督导确认 · </span>}
              最近会谈 {fmtDate(lastAt)}
            </p>
          </button>
        ))}
      </div>
    </aside>
  );
}
