import { useState } from "react";
import type { RiskAssessment } from "../data/types";
import type { DowngradeEval } from "../domain/ledger";
import { RISK_CLASS, RISK_LABEL, fmtDateTime } from "./format";

interface DowngradePanelProps {
  assessments: RiskAssessment[]; // 当前个案全部评估版本
  evaluation: DowngradeEval;
  onConfirm: (supervisor: string) => string[];
}

const KIND_LABEL: Record<RiskAssessment["kind"], string> = {
  initial: "初始评估",
  escalation: "高风险会谈触发升级",
  downgrade: "督导确认降级",
};

export function DowngradePanel({ assessments, evaluation, onConfirm }: DowngradePanelProps) {
  const ordered = [...assessments].sort((a, b) => b.version - a.version);
  const current = ordered[0];
  const [supervisor, setSupervisor] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const confirm = () => {
    const errs = onConfirm(supervisor);
    setErrors(errs);
    if (errs.length === 0) setSupervisor("");
  };

  return (
    <section className="panel subpanel">
      <div className="subpanel-head">
        <div>
          <p className="kicker">风险等级</p>
          <h3>
            当前评估{current && <span className="version-chip">v{current.version}</span>}
            {current && <i className={"risk-badge " + RISK_CLASS[current.level]}>{RISK_LABEL[current.level]}</i>}
          </h3>
        </div>
      </div>

      <div className="downgrade-rule">
        <p className="rule-title">降级条件：连续两次低风险会谈 + 督导确认</p>
        {evaluation.eligible ? (
          <p className="rule-ok">✓ 最近两次会谈均为低风险，且无待接通跟进，可以申请降级。</p>
        ) : (
          <ul className="rule-list">
            {evaluation.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}

        <div className="supervisor-row">
          <input
            placeholder="督导姓名（必填）"
            value={supervisor}
            onChange={(e) => setSupervisor(e.target.value)}
          />
          <button
            className="primary-action"
            disabled={!evaluation.eligible}
            onClick={confirm}
            title={evaluation.eligible ? "" : "不满足降级条件"}
          >
            督导确认降级为低风险
          </button>
        </div>

        {errors.length > 0 && (
          <div className="error-box">
            {errors.map((e) => (
              <p key={e}>⚠ {e}</p>
            ))}
          </div>
        )}
      </div>

      <div className="version-history">
        <p className="history-title">评估版本（降级生成新版本，旧值保留）</p>
        <ul className="assessment-list">
          {ordered.map((a) => (
            <li key={a.id} className={a.id === current?.id ? "is-current" : ""}>
              <i className={"risk-badge " + RISK_CLASS[a.level]}>{RISK_LABEL[a.level]}</i>
              <span>v{a.version}</span>
              <span>{KIND_LABEL[a.kind]}</span>
              {a.supervisor && <span className="supervisor-tag">督导：{a.supervisor}</span>}
              <span className="assessment-time">{fmtDateTime(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
