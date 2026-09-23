import { useState } from "react";
import type { Ledger, RiskVersion } from "../data/types";
import { currentRiskState, downgradeReadiness, versionsOf } from "../domain/risk";
import { fmtDateTime, riskStateLabel } from "./format";

interface Props {
  ledger: Ledger;
  caseId: string;
  closed: boolean;
  onConfirm: (supervisor: string, note: string) => boolean;
}

function VersionHistory({ ledger, caseId }: { ledger: Ledger; caseId: string }) {
  const versions = versionsOf(ledger, caseId);
  if (versions.length === 0) {
    return <p className="hint">尚无风险状态版本（高风险会谈或督导降级时生成）。</p>;
  }
  return (
    <ol className="version-list">
      {versions.map((v: RiskVersion) => (
        <li key={v.id}>
          <div className="version-head">
            <span className="version-no">v{v.version}</span>
            <span className={`level-tag ${v.state === "high" ? "level-high" : "level-low"}`}>
              {riskStateLabel[v.state]}
            </span>
            <span className="timeline-when">{fmtDateTime(v.at)}</span>
          </div>
          <p className="version-reason">{v.reason}</p>
          <p className="version-meta">
            记录：{v.changedBy}
            {v.supervisor && (
              <>
                {" "}
                · 督导确认：{v.supervisor}（{fmtDateTime(v.confirmedAt)}）
              </>
            )}
          </p>
          {v.supervisorNote && <p className="version-note">督导意见：{v.supervisorNote}</p>}
        </li>
      ))}
    </ol>
  );
}

export function DowngradePanel({ ledger, caseId, closed, onConfirm }: Props) {
  const state = currentRiskState(ledger, caseId);
  const readiness = downgradeReadiness(ledger, caseId);
  const [supervisor, setSupervisor] = useState("");
  const [note, setNote] = useState("");

  const progress = Math.min(readiness.lows.length, 2);

  return (
    <div className="downgrade-panel">
      <div className="downgrade-rule">
        <p className="hint">
          降级规则：最近一次高风险会谈后，连续两次低风险会谈（中间出现高风险则重新计数），
          且危机跟进全部接通，最后由督导确认——自动生成新版本，旧值保留。
        </p>
        <div className="progress-row">
          {[0, 1].map((i) => (
            <span key={i} className={`progress-dot ${i < progress ? "done" : ""}`}>
              低风险 {i + 1}
            </span>
          ))}
          <span className={`progress-dot ${state === "downgraded" ? "done" : ""}`}>
            督导确认
          </span>
        </div>

        {state === "downgraded" ? (
          <p className="hint hint-ok">已完成降级确认，继续常规会谈。再次出现高风险将重新进入流程。</p>
        ) : state === "high" ? (
          <>
            <ul className="blocker-list">
              {readiness.blockers.map((b) => (
                <li key={b} className="blocker">
                  {b}
                </li>
              ))}
              {readiness.ready && <li className="hint hint-ok">条件满足，等待督导确认。</li>}
            </ul>
            {!closed && (
              <div className="supervisor-form">
                <div className="field-grid">
                  <label>
                    <span>督导姓名 *</span>
                    <input
                      value={supervisor}
                      placeholder="如：王督导"
                      onChange={(e) => setSupervisor(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>督导意见</span>
                    <input
                      value={note}
                      placeholder="确认符合降级条件"
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                </div>
                <button
                  className="primary-action"
                  disabled={!readiness.ready}
                  onClick={() => {
                    if (onConfirm(supervisor, note)) {
                      setSupervisor("");
                      setNote("");
                    }
                  }}
                >
                  督导确认降级（生成新版本）
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="hint">个案当前稳定，无高风险记录，暂不需要降级。</p>
        )}
      </div>

      <details className="history-details">
        <summary>风险版本记录（旧值保留，仅追加）</summary>
        <VersionHistory ledger={ledger} caseId={caseId} />
      </details>
    </div>
  );
}
