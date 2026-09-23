import { useState } from "react";
import type { Ledger } from "../data/types";
import { closureCheck } from "../domain/safety";
import { currentRiskState } from "../domain/risk";
import { fmtDateTime, riskStateLabel } from "./format";

interface Props {
  ledger: Ledger;
  caseId: string;
  onClose: (reason: string, closedBy: string) => boolean;
}

export function ClosePanel({ ledger, caseId, onClose }: Props) {
  const target = ledger.cases.find((c) => c.id === caseId);
  const [reason, setReason] = useState("");
  const [closedBy, setClosedBy] = useState("");
  if (!target) return null;

  if (target.status === "closed" && target.closure) {
    return (
      <div className="closure-box closed">
        <h3>已结案</h3>
        <p>结案时间：{fmtDateTime(target.closure.closedAt)}</p>
        <p>操作人：{target.closure.closedBy}</p>
        <p>结案理由：{target.closure.reason}</p>
      </div>
    );
  }

  const check = closureCheck(ledger, caseId);
  const state = currentRiskState(ledger, caseId);

  return (
    <div className="closure-box">
      <h3>结案（显式操作）</h3>
      <p className="hint">系统不会自动结案；以下条件全部满足后，填写理由方可结案。</p>
      <ul className="check-list">
        <li className={check.blockers.some((b) => b.includes("高风险会谈未取得联系")) ? "no" : "yes"}>
          高风险会谈均已取得联系（失败尝试须持续顺延，不能跳过）
        </li>
        <li className={state === "high" ? "no" : "yes"}>
          已连续两次低风险并经督导确认降级
          {state && <> · 当前：{riskStateLabel[state]}</>}
        </li>
        <li className={check.blockers.some((b) => b.includes("没有任何会谈")) ? "no" : "yes"}>
          至少有一次会谈记录
        </li>
      </ul>
      {check.blockers.length > 0 && (
        <ul className="blocker-list">
          {check.blockers.map((b) => (
            <li key={b} className="blocker">
              {b}
            </li>
          ))}
        </ul>
      )}
      <div className="field-grid">
        <label>
          <span>操作咨询师 *</span>
          <input value={closedBy} onChange={(e) => setClosedBy(e.target.value)} />
        </label>
        <label className="full">
          <span>结案理由 *</span>
          <textarea
            rows={2}
            value={reason}
            placeholder="如：目标达成，风险解除，转社区随访"
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </div>
      <button
        className="danger-action"
        disabled={!check.canClose}
        onClick={() => {
          if (onClose(reason, closedBy)) {
            setReason("");
            setClosedBy("");
          }
        }}
      >
        结案
      </button>
    </div>
  );
}
