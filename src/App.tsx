import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { LedgerState, RiskLevel, SessionDraft } from "./data/types";
import {
  addAttempt,
  addCase,
  addSession,
  closeCase,
  computeMetrics,
  confirmDowngrade,
  emptySessionDraft,
  evaluateDowngrade,
  openFollowUps,
  reopenCase,
  saveSafetyPlan,
  sessionsOf,
  type AttemptInput,
  type PlanFields,
} from "./domain/ledger";
import { loadDrafts, loadLedger, saveDrafts, saveLedger } from "./storage/localStore";
import { CaseList } from "./ui/CaseList";
import { CaseDetail } from "./ui/CaseDetail";
import { RISK_LABEL } from "./ui/format";

function MetricCard({ label, value, alert, index }: { label: string; value: string; alert?: boolean; index: number }) {
  const bar = ["status-ok", "status-watch", "status-danger", "status-ok"][index];
  return (
    <article className={"metric-card" + (alert ? " alert" : "")}>
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={alert ? "status-danger" : bar} />
    </article>
  );
}

function NewCaseForm({ onCreate }: { onCreate: (input: { alias: string; topic: string; level: RiskLevel }) => string[] }) {
  const [alias, setAlias] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<RiskLevel>("medium");
  const [errors, setErrors] = useState<string[]>([]);

  const submit = () => {
    const errs = onCreate({ alias, topic, level });
    if (errs.length === 0) {
      setAlias("");
      setTopic("");
      setErrors([]);
    } else {
      setErrors(errs);
    }
  };

  return (
    <div className="new-case">
      <h2>新建个案</h2>
      {errors.length > 0 && (
        <div className="error-box">
          {errors.map((e) => (
            <p key={e}>⚠ {e}</p>
          ))}
        </div>
      )}
      <input placeholder="来访者代号，如 C-301" value={alias} onChange={(e) => setAlias(e.target.value)} />
      <input placeholder="咨询主题" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <select value={level} onChange={(e) => setLevel(e.target.value as RiskLevel)}>
        <option value="low">{RISK_LABEL.low}</option>
        <option value="medium">{RISK_LABEL.medium}</option>
        <option value="high">{RISK_LABEL.high}</option>
      </select>
      <button className="primary-action" onClick={submit}>
        建档
      </button>
    </div>
  );
}

function App() {
  const [state, setState] = useState<LedgerState>(() => loadLedger());
  const [drafts, setDrafts] = useState<Record<string, SessionDraft>>(() => loadDrafts());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => saveLedger(state), [state]);
  useEffect(() => saveDrafts(drafts), [drafts]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const selectedCase =
    state.cases.find((c) => c.id === selectedId) ??
    state.cases.find((c) => c.status === "active") ??
    state.cases[0] ??
    null;
  const caseId = selectedCase?.id ?? "";

  const metrics = useMemo(() => computeMetrics(state, now), [state, now]);
  const open = useMemo(() => openFollowUps(state), [state]);
  const caseSessions = useMemo(() => (caseId ? sessionsOf(state, caseId) : []), [state, caseId]);
  const caseAttempts = state.attempts.filter((a) => a.caseId === caseId);
  const casePlans = state.plans.filter((p) => p.caseId === caseId);
  const caseAssessments = state.assessments.filter((a) => a.caseId === caseId);
  const evaluation = useMemo(
    () => (caseId ? evaluateDowngrade(state, caseId) : null),
    [state, caseId],
  );
  const draft = drafts[caseId] ?? emptySessionDraft(caseId);

  const patchDraft = (patch: Partial<SessionDraft>) =>
    setDrafts((d) => ({ ...d, [caseId]: { ...emptySessionDraft(caseId), ...d[caseId], ...patch, caseId } }));

  const submitSession = (): string[] => {
    const result = addSession(state, draft, new Date());
    if (result.errors.length > 0) return result.errors;
    setState(result.state);
    setDrafts((d) => ({ ...d, [caseId]: emptySessionDraft(caseId) }));
    return [];
  };

  const addAttemptFor = (sessionId: string, input: AttemptInput) =>
    setState((s) => addAttempt(s, sessionId, input, new Date()));

  const savePlan = (fields: PlanFields, changeNote: string) =>
    setState((s) => saveSafetyPlan(s, caseId, fields, changeNote, new Date()));

  const confirmRiskDowngrade = (supervisor: string): string[] => {
    const result = confirmDowngrade(state, caseId, supervisor, new Date());
    if (result.errors.length > 0) return result.errors;
    setState(result.state);
    return [];
  };

  const closeSelected = (): string[] => {
    const result = closeCase(state, caseId, new Date());
    if (result.errors.length > 0) return result.errors;
    setState(result.state);
    return [];
  };

  const reopenSelected = () => setState((s) => reopenCase(s, caseId));

  const createCase = (input: { alias: string; topic: string; level: RiskLevel }): string[] => {
    const result = addCase(state, { ...input, counselor: "王咨询师" }, new Date());
    if (result.errors.length > 0) return result.errors;
    setState(result.state);
    setSelectedId(result.caseId);
    return [];
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-12 · 危机跟进台账</p>
          <h1>心理咨询个案记录</h1>
          <p className="subtitle">
            个案、风险会谈、联系尝试与安全计划串联入账：高风险留痕、失败顺延、连续两次低风险并经督导确认方可降级。
          </p>
        </div>
        <div className="stack-card">
          <span>分层实现</span>
          <strong>资料 · 判断 · 本地保存 · 页面</strong>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="活跃个案" value={String(metrics.activeCases)} index={0} />
        <MetricCard label="高风险关注" value={String(metrics.highRiskCases)} index={2} alert={metrics.highRiskCases > 0} />
        <MetricCard label="本周会谈" value={String(metrics.weekSessions)} index={1} />
        <MetricCard
          label="待跟进（逾期）"
          value={`${metrics.openFollowUps}（${metrics.overdueFollowUps}）`}
          index={2}
          alert={metrics.overdueFollowUps > 0}
        />
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>个案台账</h2>
          <CaseList
            cases={state.cases}
            assessments={state.assessments}
            openFollowUps={open}
            selectedId={caseId}
            onSelect={setSelectedId}
          />
          <NewCaseForm onCreate={createCase} />
        </aside>

        <section className="panel detail-panel">
          {selectedCase && evaluation ? (
            <CaseDetail
              key={selectedCase.id}
              caseRecord={selectedCase}
              sessions={caseSessions}
              attempts={caseAttempts}
              plans={casePlans}
              assessments={caseAssessments}
              draft={draft}
              now={now}
              evaluation={evaluation}
              onDraftChange={patchDraft}
              onSubmitSession={submitSession}
              onAddAttempt={addAttemptFor}
              onSavePlan={savePlan}
              onConfirmDowngrade={confirmRiskDowngrade}
              onClose={closeSelected}
              onReopen={reopenSelected}
            />
          ) : (
            <p className="empty-hint">暂无个案，请先建档。</p>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;
