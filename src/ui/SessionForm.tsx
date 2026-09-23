import type { ContactChannel, SessionDraft } from "../data/types";
import type { SessionInput } from "../domain/commands";
import { useCaseDraft } from "../state/useCaseDraft";
import { fromLocalInput, nowLocalInput } from "./format";

const CHANNELS: ContactChannel[] = ["电话", "短信", "即时消息", "紧急联系人", "面谈"];

export function createSessionDraft(): SessionDraft {
  return {
    at: nowLocalInput(),
    counselor: "",
    level: "low",
    triggers: "",
    intervention: "",
    nextGoal: "",
    emergencyName: "",
    emergencyRelation: "",
    emergencyPhone: "",
    nextFollowupAt: nowLocalInput(24 * 60),
    firstChannel: "电话",
    firstOutcome: "connected",
    firstNote: "",
    rescheduleAt: nowLocalInput(26 * 60),
  };
}

interface Props {
  caseId: string;
  closed: boolean;
  onSubmit: (input: SessionInput) => boolean;
}

export function SessionForm({ caseId, closed, onSubmit }: Props) {
  const { draft, patch, reset } = useCaseDraft(caseId, "session", createSessionDraft);
  const high = draft.level === "high";
  const failed = draft.firstOutcome === "failed";

  const submit = () => {
    const input: SessionInput = {
      at: fromLocalInput(draft.at),
      counselor: draft.counselor,
      level: draft.level,
      triggers: draft.triggers,
      intervention: draft.intervention,
      nextGoal: draft.nextGoal,
      emergencyContact: high
        ? {
            name: draft.emergencyName,
            relation: draft.emergencyRelation,
            phone: draft.emergencyPhone,
          }
        : undefined,
      nextFollowupAt: high ? fromLocalInput(draft.nextFollowupAt) : undefined,
      firstChannel: high ? draft.firstChannel : undefined,
      firstOutcome: high ? draft.firstOutcome : undefined,
      firstNote: high ? draft.firstNote : undefined,
      rescheduleAt: high && failed ? fromLocalInput(draft.rescheduleAt) : undefined,
    };
    if (onSubmit(input)) reset();
  };

  if (closed) {
    return <p className="hint hint-locked">个案已结案，录入区已锁定（重开需走机构流程）。</p>;
  }

  return (
    <div className="entry-form">
      <div className="field-grid">
        <label>
          <span>会谈时间 *</span>
          <input
            type="datetime-local"
            value={draft.at}
            onChange={(e) => patch({ at: e.target.value })}
          />
        </label>
        <label>
          <span>会谈咨询师 *</span>
          <input
            value={draft.counselor}
            placeholder="如：李咨询师"
            onChange={(e) => patch({ counselor: e.target.value })}
          />
        </label>
      </div>

      <fieldset className="risk-switch">
        <legend>本次风险评估 *</legend>
        <label className="inline-radio">
          <input
            type="radio"
            name={`level-${caseId}`}
            checked={draft.level === "low"}
            onChange={() => patch({ level: "low" })}
          />
          低风险
        </label>
        <label className="inline-radio">
          <input
            type="radio"
            name={`level-${caseId}`}
            checked={draft.level === "high"}
            onChange={() => patch({ level: "high" })}
          />
          高风险
        </label>
      </fieldset>

      <label className="full">
        <span>风险表现 / 触发因素 *</span>
        <textarea
          rows={2}
          value={draft.triggers}
          placeholder="观察到的念头、言语、行为与情境"
          onChange={(e) => patch({ triggers: e.target.value })}
        />
      </label>
      <label className="full">
        <span>本次干预 *</span>
        <textarea
          rows={2}
          value={draft.intervention}
          onChange={(e) => patch({ intervention: e.target.value })}
        />
      </label>
      <label className="full">
        <span>下次目标</span>
        <input
          value={draft.nextGoal}
          onChange={(e) => patch({ nextGoal: e.target.value })}
        />
      </label>

      {high && (
        <div className="high-required">
          <p className="required-banner">
            高风险会谈必须留下：紧急联系人、下次跟进时刻、一次联系结果
          </p>
          <div className="field-grid">
            <label>
              <span>紧急联系人姓名 *</span>
              <input
                value={draft.emergencyName}
                onChange={(e) => patch({ emergencyName: e.target.value })}
              />
            </label>
            <label>
              <span>与来访者关系 *</span>
              <input
                value={draft.emergencyRelation}
                onChange={(e) => patch({ emergencyRelation: e.target.value })}
              />
            </label>
            <label>
              <span>联系电话 *</span>
              <input
                value={draft.emergencyPhone}
                onChange={(e) => patch({ emergencyPhone: e.target.value })}
              />
            </label>
            <label>
              <span>下次跟进时刻 *</span>
              <input
                type="datetime-local"
                value={draft.nextFollowupAt}
                onChange={(e) => patch({ nextFollowupAt: e.target.value })}
              />
            </label>
          </div>

          <fieldset className="risk-switch">
            <legend>首次联系尝试（会谈后立即） *</legend>
            <label className="inline-field">
              <span>方式</span>
              <select
                value={draft.firstChannel}
                onChange={(e) =>
                  patch({ firstChannel: e.target.value as ContactChannel })
                }
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-radio">
              <input
                type="radio"
                name={`outcome-${caseId}`}
                checked={draft.firstOutcome === "connected"}
                onChange={() => patch({ firstOutcome: "connected" })}
              />
              已接通
            </label>
            <label className="inline-radio">
              <input
                type="radio"
                name={`outcome-${caseId}`}
                checked={draft.firstOutcome === "failed"}
                onChange={() => patch({ firstOutcome: "failed" })}
              />
              未接通（保留并顺延）
            </label>
          </fieldset>

          {failed && (
            <label className="full warn-label">
              <span>顺延跟进至（必须晚于原定下次跟进时刻） *</span>
              <input
                type="datetime-local"
                value={draft.rescheduleAt}
                onChange={(e) => patch({ rescheduleAt: e.target.value })}
              />
            </label>
          )}

          <label className="full">
            <span>联系情况说明 *</span>
            <textarea
              rows={2}
              value={draft.firstNote}
              placeholder={failed ? "如：两次拨打未接，已留言" : "如：本人接听，情绪平稳"}
              onChange={(e) => patch({ firstNote: e.target.value })}
            />
          </label>
        </div>
      )}

      <div className="form-actions">
        <button onClick={submit} className="primary-action">
          保存会谈
        </button>
        <button onClick={() => reset()}>清空草稿</button>
        <span className="draft-note">草稿仅保存在本机，且只属于个案 {caseId}</span>
      </div>
    </div>
  );
}
