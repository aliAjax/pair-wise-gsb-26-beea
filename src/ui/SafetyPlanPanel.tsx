import { useState } from "react";
import type { Ledger, SafetyPlanDraft } from "../data/types";
import type { SafetyPlanInput } from "../domain/safety";
import { plansOf } from "../domain/safety";
import { useCaseDraft } from "../state/useCaseDraft";
import { fmtDateTime } from "./format";

interface Props {
  ledger: Ledger;
  caseId: string;
  closed: boolean;
  onSave: (input: SafetyPlanInput) => boolean;
}

function emptyDraft(): SafetyPlanDraft {
  return {
    triggers: "",
    copingSteps: "",
    supporters: "",
    safeEnvironment: "",
    professionalHelp: "",
    agreedByClient: false,
    editedBy: "",
    note: "",
  };
}

function draftFromPlan(p: SafetyPlanInput & { note?: string }): SafetyPlanDraft {
  return {
    triggers: p.triggers,
    copingSteps: p.copingSteps,
    supporters: p.supporters,
    safeEnvironment: p.safeEnvironment,
    professionalHelp: p.professionalHelp,
    agreedByClient: p.agreedByClient,
    editedBy: p.editedBy,
    note: p.note ?? "",
  };
}

export function SafetyPlanPanel({ ledger, caseId, closed, onSave }: Props) {
  const plans = plansOf(ledger, caseId);
  const current = plans[0];
  const { draft, patch, reset } = useCaseDraft<"safetyPlan", SafetyPlanDraft>(
    caseId,
    "safetyPlan",
    () => (current ? draftFromPlan(current) : emptyDraft())
  );
  const [showHistory, setShowHistory] = useState(false);

  const save = () => {
    const input = {
      triggers: draft.triggers,
      copingSteps: draft.copingSteps,
      supporters: draft.supporters,
      safeEnvironment: draft.safeEnvironment,
      professionalHelp: draft.professionalHelp,
      agreedByClient: draft.agreedByClient,
      editedBy: draft.editedBy,
      note: draft.note,
    };
    if (onSave(input)) {
      // 保存后表单回填刚保存的版本内容（旧版本在"历史版本"里保留）
      reset(draftFromPlan(input));
    }
  };

  return (
    <div className="safety-panel">
      <div className="section-heading inner">
        <div>
          <p>安全计划{current ? ` · 当前 v${current.version}` : ""}</p>
          <h3>{current ? `v${current.version}（${fmtDateTime(current.createdAt)}）` : "尚未建立"}</h3>
        </div>
        <div className="btn-row">
          {current && (
            <button onClick={() => reset(draftFromPlan(current))}>按当前版本回填</button>
          )}
          <button onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "收起历史" : `历史版本（${plans.length}）`}
          </button>
        </div>
      </div>

      {showHistory && (
        <ol className="version-list">
          {plans.map((p) => (
            <li key={p.id} className={p.id === current?.id ? "is-current" : ""}>
              <div className="version-head">
                <span className="version-no">v{p.version}</span>
                <span className="timeline-when">{fmtDateTime(p.createdAt)}</span>
                <span className="timeline-by">{p.editedBy}</span>
              </div>
              <p>
                <strong>预警信号：</strong>
                {p.triggers}
              </p>
              <p>
                <strong>应对步骤：</strong>
                {p.copingSteps}
              </p>
              <p>
                <strong>支持者：</strong>
                {p.supporters}
              </p>
              <p>
                <strong>环境安全：</strong>
                {p.safeEnvironment}
              </p>
              <p>
                <strong>专业求助：</strong>
                {p.professionalHelp}
              </p>
              {p.note && <p className="version-note">备注：{p.note}</p>}
            </li>
          ))}
        </ol>
      )}

      {closed ? (
        <p className="hint hint-locked">个案已结案，安全计划只读。</p>
      ) : (
        <div className="entry-form">
          <div className="field-grid">
            <label className="full">
              <span>预警信号 *</span>
              <textarea
                rows={2}
                value={draft.triggers}
                onChange={(e) => patch({ triggers: e.target.value })}
              />
            </label>
            <label className="full">
              <span>自我应对步骤 *</span>
              <textarea
                rows={2}
                value={draft.copingSteps}
                onChange={(e) => patch({ copingSteps: e.target.value })}
              />
            </label>
            <label>
              <span>可联系的支持者 *</span>
              <textarea
                rows={2}
                value={draft.supporters}
                onChange={(e) => patch({ supporters: e.target.value })}
              />
            </label>
            <label>
              <span>环境安全措施 *</span>
              <textarea
                rows={2}
                value={draft.safeEnvironment}
                onChange={(e) => patch({ safeEnvironment: e.target.value })}
              />
            </label>
            <label className="full">
              <span>专业求助途径 *</span>
              <input
                value={draft.professionalHelp}
                onChange={(e) => patch({ professionalHelp: e.target.value })}
              />
            </label>
            <label>
              <span>保存人（咨询师） *</span>
              <input
                value={draft.editedBy}
                onChange={(e) => patch({ editedBy: e.target.value })}
              />
            </label>
            <label>
              <span>版本备注</span>
              <input
                value={draft.note}
                placeholder="如：降级前复核更新"
                onChange={(e) => patch({ note: e.target.value })}
              />
            </label>
          </div>
          <label className="inline-radio agree-row">
            <input
              type="checkbox"
              checked={draft.agreedByClient}
              onChange={(e) => patch({ agreedByClient: e.target.checked })}
            />
            来访者已知晓并同意本版安全计划
          </label>
          <div className="form-actions">
            <button className="primary-action" onClick={save}>
              保存为新版本（旧版本保留）
            </button>
            <button onClick={() => reset()}>清空 / 回到草稿初始</button>
          </div>
        </div>
      )}
    </div>
  );
}
