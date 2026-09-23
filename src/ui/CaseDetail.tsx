import { useState } from "react";
import type {
  ContactAttempt,
  CaseRecord,
  RiskAssessment,
  RiskSession,
  SafetyPlan,
  SessionDraft,
} from "../data/types";
import type { AttemptInput, DowngradeEval, PlanFields } from "../domain/ledger";
import { followUpHint, fmtDateTime, isOverdue } from "./format";
import { SessionForm } from "./SessionForm";
import { SessionTimeline } from "./SessionTimeline";
import { SafetyPlanPanel } from "./SafetyPlanPanel";
import { DowngradePanel } from "./DowngradePanel";

interface CaseDetailProps {
  caseRecord: CaseRecord;
  sessions: RiskSession[];
  attempts: ContactAttempt[];
  plans: SafetyPlan[];
  assessments: RiskAssessment[];
  draft: SessionDraft;
  now: Date;
  evaluation: DowngradeEval;
  onDraftChange: (patch: Partial<SessionDraft>) => void;
  onSubmitSession: () => string[];
  onAddAttempt: (sessionId: string, input: AttemptInput) => void;
  onSavePlan: (fields: PlanFields, changeNote: string) => void;
  onConfirmDowngrade: (supervisor: string) => string[];
  onClose: () => string[];
  onReopen: () => void;
}

export function CaseDetail({
  caseRecord,
  sessions,
  attempts,
  plans,
  assessments,
  draft,
  now,
  evaluation,
  onDraftChange,
  onSubmitSession,
  onAddAttempt,
  onSavePlan,
  onConfirmDowngrade,
  onClose,
  onReopen,
}: CaseDetailProps) {
  const [closeErrors, setCloseErrors] = useState<string[]>([]);
  const open = sessions.filter((s) => s.followUpStatus === "open");

  const handleClose = () => {
    const errors = onClose();
    setCloseErrors(errors);
  };

  return (
    <div className="case-detail">
      <header className="case-header">
        <div>
          <h2>
            {caseRecord.alias}
            <span className="topic-tag">{caseRecord.topic}</span>
          </h2>
          <p className="case-meta">
            咨询师：{caseRecord.counselor} · 建档 {fmtDateTime(caseRecord.createdAt)}
            {caseRecord.status === "closed" && (
              <span className="closed-tag">已结案（{fmtDateTime(caseRecord.closedAt)}）</span>
            )}
          </p>
        </div>
        {caseRecord.status === "active" ? (
          <button className="close-case" onClick={handleClose}>
            结案
          </button>
        ) : (
          <button onClick={onReopen}>重新激活</button>
        )}
      </header>

      {closeErrors.length > 0 && (
        <div className="error-box close-errors">
          <p className="error-title">不能结案：</p>
          {closeErrors.map((e) => (
            <p key={e}>⚠ {e}</p>
          ))}
        </div>
      )}

      {open.length > 0 && (
        <div className="followup-strip">
          <p className="strip-title">跟进待办（{open.length}）</p>
          <ul>
            {open.map((s) => {
              const overdue = isOverdue(s.nextFollowUpAt, now);
              return (
                <li key={s.id} className={overdue ? "overdue" : ""}>
                  {fmtDateTime(s.occurredAt)} 的高风险会谈：下次跟进 {fmtDateTime(s.nextFollowUpAt)}
                  <em>（{followUpHint(s.nextFollowUpAt, now)}）</em>
                  {overdue && <strong className="overdue-flag">请立即处理</strong>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {caseRecord.status === "active" ? (
        <SessionForm draft={draft} onChange={onDraftChange} onSubmit={onSubmitSession} />
      ) : (
        <div className="panel subpanel closed-banner">个案已结案，仅可查看历史记录。</div>
      )}

      <SessionTimeline sessions={sessions} attempts={attempts} now={now} onAddAttempt={onAddAttempt} />
      <SafetyPlanPanel plans={plans} onSave={onSavePlan} />
      <DowngradePanel assessments={assessments} evaluation={evaluation} onConfirm={onConfirmDowngrade} />
    </div>
  );
}
