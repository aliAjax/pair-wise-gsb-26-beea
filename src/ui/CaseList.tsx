import type { CaseRecord, RiskAssessment, RiskSession } from "../data/types";
import { RISK_CLASS, RISK_LABEL } from "./format";

interface CaseListProps {
  cases: CaseRecord[];
  assessments: RiskAssessment[];
  openFollowUps: RiskSession[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function latestLevel(assessments: RiskAssessment[], caseId: string) {
  return assessments
    .filter((a) => a.caseId === caseId)
    .sort((a, b) => b.version - a.version)[0];
}

export function CaseList({ cases, assessments, openFollowUps, selectedId, onSelect }: CaseListProps) {
  return (
    <div className="case-list">
      {cases.map((c) => {
        const current = latestLevel(assessments, c.id);
        const pending = openFollowUps.filter((s) => s.caseId === c.id).length;
        return (
          <button
            key={c.id}
            type="button"
            className={"case-item" + (c.id === selectedId ? " active" : "") + (c.status === "closed" ? " closed" : "")}
            onClick={() => onSelect(c.id)}
          >
            <span className="case-item-main">
              <strong>{c.alias}</strong>
              <em>{c.topic}</em>
              {c.status === "closed" && <small>已结案</small>}
            </span>
            <span className="case-item-side">
              {current && <i className={"risk-badge " + RISK_CLASS[current.level]}>{RISK_LABEL[current.level]}</i>}
              {pending > 0 && <i className="pending-pip" title="未接通跟进">{pending}</i>}
            </span>
          </button>
        );
      })}
      <p className="list-hint">高风险会谈会在此亮起跟进圆点，失败尝试不会被清除。</p>
    </div>
  );
}
