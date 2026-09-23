import type {
  AttemptOutcome,
  ContactChannel,
  Ledger,
} from "../data/types";
import type { SessionInput } from "../domain/commands";
import type { SafetyPlanInput } from "../domain/safety";
import { currentRiskState, downgradeReadiness } from "../domain/risk";
import { fmtDate } from "./format";
import { SessionForm } from "./SessionForm";
import { SessionTimeline } from "./SessionTimeline";
import { DowngradePanel } from "./DowngradePanel";
import { SafetyPlanPanel } from "./SafetyPlanPanel";
import { ClosePanel } from "./ClosePanel";

interface Props {
  ledger: Ledger;
  caseId: string;
  nowIso: string;
  onCreateSession: (caseId: string, input: SessionInput) => boolean;
  onAddAttempt: (sessionId: string, input: {
    at: string;
    channel: ContactChannel;
    outcome: AttemptOutcome;
    note: string;
    rescheduleAt?: string;
  }) => boolean;
  onConfirmDowngrade: (caseId: string, supervisor: string, note: string) => boolean;
  onSavePlan: (caseId: string, input: SafetyPlanInput) => boolean;
  onClose: (caseId: string, reason: string, closedBy: string) => boolean;
}

export function CaseDetail({
  ledger,
  caseId,
  nowIso,
  onCreateSession,
  onAddAttempt,
  onConfirmDowngrade,
  onSavePlan,
  onClose,
}: Props) {
  const target = ledger.cases.find((c) => c.id === caseId);
  if (!target) {
    return (
      <section className="panel detail-empty">
        <h2>从左侧选择一个个案</h2>
        <p className="hint">高风险、跟进逾期的个案会排在最前。</p>
      </section>
    );
  }

  const state = currentRiskState(ledger, caseId);
  const readiness = downgradeReadiness(ledger, caseId);
  const closed = target.status === "closed";

  return (
    <div className="detail-stack">
      <section className="panel case-header">
        <div>
          <p className="eyebrow">
            {caseId} · 建档于 {fmtDate(target.openedAt)}
            {closed && <span className="badge badge-closed">已结案</span>}
          </p>
          <h2>{target.alias}</h2>
          <p className="subtitle">
            {target.theme} · {target.mainConcern || "—"}
          </p>
          <p className="case-emotion">情绪状态：{target.emotion || "—"}</p>
        </div>
        <div className={`state-card ${state === "high" ? "state-high" : state === "downgraded" ? "state-down" : "state-stable"}`}>
          <span>风险状态</span>
          <strong>{state === "high" ? "高风险" : state === "downgraded" ? "已降级" : "稳定"}</strong>
          {state === "high" && readiness.lows.length > 0 && (
            <em>已完成 {readiness.lows.length}/2 次低风险</em>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>风险会谈</p>
            <h2>新增会谈记录</h2>
          </div>
        </div>
        <SessionForm
          caseId={caseId}
          closed={closed}
          onSubmit={(input) => onCreateSession(caseId, input)}
        />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>危机跟进台账</p>
            <h2>会谈与联系尝试</h2>
          </div>
        </div>
        <SessionTimeline
          ledger={ledger}
          caseId={caseId}
          nowIso={nowIso}
          closed={closed}
          onAddAttempt={onAddAttempt}
        />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>风险降级</p>
            <h2>连续两次低风险 + 督导确认</h2>
          </div>
        </div>
        <DowngradePanel
          ledger={ledger}
          caseId={caseId}
          closed={closed}
          onConfirm={(supervisor, note) => onConfirmDowngrade(caseId, supervisor, note)}
        />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>安全计划</p>
            <h2>保存即生成新版本</h2>
          </div>
        </div>
        <SafetyPlanPanel
          ledger={ledger}
          caseId={caseId}
          closed={closed}
          onSave={(input) => onSavePlan(caseId, input)}
        />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>结案</p>
            <h2>不能悄悄结案</h2>
          </div>
        </div>
        <ClosePanel
          ledger={ledger}
          caseId={caseId}
          onClose={(reason, closedBy) => onClose(caseId, reason, closedBy)}
        />
      </section>
    </div>
  );
}
