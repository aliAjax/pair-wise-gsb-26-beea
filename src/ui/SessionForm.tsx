import { useState } from "react";
import type { ContactChannel, ContactResult, SessionDraft } from "../data/types";

interface SessionFormProps {
  draft: SessionDraft;
  onChange: (patch: Partial<SessionDraft>) => void;
  /** 提交由判断层校验；返回错误信息，空数组表示已入账 */
  onSubmit: () => string[];
}

const isHigh = (d: SessionDraft) => d.riskLevel === "high";

export function SessionForm({ draft, onChange, onSubmit }: SessionFormProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const submit = () => setErrors(onSubmit());

  return (
    <section className="panel subpanel">
      <div className="subpanel-head">
        <div>
          <p className="kicker">风险会谈</p>
          <h3>记录本次会谈</h3>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="error-box">
          {errors.map((e) => (
            <p key={e}>⚠ {e}</p>
          ))}
        </div>
      )}

      <div className="form-grid">
        <label>
          <span>会谈时间</span>
          <input
            type="datetime-local"
            value={draft.occurredAt}
            onChange={(e) => onChange({ occurredAt: e.target.value })}
          />
        </label>
        <label>
          <span>风险等级</span>
          <select
            value={draft.riskLevel}
            onChange={(e) => onChange({ riskLevel: e.target.value as SessionDraft["riskLevel"] })}
          >
            <option value="low">低风险</option>
            <option value="medium">中风险</option>
            <option value="high">高风险</option>
          </select>
        </label>
        <label className="full-width">
          <span>会谈纪要</span>
          <textarea
            rows={2}
            placeholder="主要困扰、情绪状态、干预要点"
            value={draft.summary}
            onChange={(e) => onChange({ summary: e.target.value })}
          />
        </label>
      </div>

      {isHigh(draft) && (
        <div className="high-block">
          <p className="high-block-title">高风险会谈必填：紧急联系人 · 下次跟进时刻 · 首次联系结果</p>
          <div className="form-grid">
            <label>
              <span>紧急联系人姓名</span>
              <input
                value={draft.emergencyContactName}
                onChange={(e) => onChange({ emergencyContactName: e.target.value })}
                placeholder="如：周女士"
              />
            </label>
            <label>
              <span>关系</span>
              <input
                value={draft.emergencyContactRelation}
                onChange={(e) => onChange({ emergencyContactRelation: e.target.value })}
                placeholder="如：母亲"
              />
            </label>
            <label>
              <span>紧急联系电话</span>
              <input
                value={draft.emergencyContactPhone}
                onChange={(e) => onChange({ emergencyContactPhone: e.target.value })}
                placeholder="如：138****2210"
              />
            </label>
            <label>
              <span>下次跟进时刻</span>
              <input
                type="datetime-local"
                value={draft.nextFollowUpAt}
                onChange={(e) => onChange({ nextFollowUpAt: e.target.value })}
              />
            </label>
            <label>
              <span>首次联系方式</span>
              <select
                value={draft.firstAttemptChannel}
                onChange={(e) => onChange({ firstAttemptChannel: e.target.value as ContactChannel })}
              >
                <option value="phone">电话</option>
                <option value="sms">短信</option>
                <option value="wechat">微信</option>
                <option value="email">邮件</option>
              </select>
            </label>
            <label>
              <span>首次联系结果</span>
              <select
                value={draft.firstAttemptResult}
                onChange={(e) => onChange({ firstAttemptResult: e.target.value as ContactResult | "" })}
              >
                <option value="">请选择联系结果</option>
                <option value="reached">已接通</option>
                <option value="no-answer">无人接听</option>
                <option value="voicemail">已留言</option>
                <option value="refused">对方拒绝</option>
              </select>
            </label>
            <label className="full-width">
              <span>联系备注</span>
              <input
                value={draft.firstAttemptNote}
                onChange={(e) => onChange({ firstAttemptNote: e.target.value })}
                placeholder={
                  draft.firstAttemptResult && draft.firstAttemptResult !== "reached"
                    ? "未接通时跟进时刻将自动顺延 24 小时"
                    : "本次联系情况"
                }
              />
            </label>
          </div>
        </div>
      )}

      <p className="draft-hint">草稿按当前个案自动保存，切换个案不会串台。</p>
      <div className="form-actions">
        <button type="button" className="primary-action" onClick={submit}>
          入账会谈
        </button>
      </div>
    </section>
  );
}
