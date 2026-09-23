import { useState } from "react";
import type {
  ContactChannel,
  Ledger,
  RiskSession,
} from "../data/types";
import type { AttemptInput } from "../domain/commands";
import {
  attemptsFor,
  effectiveFollowupAt,
  followupStatus,
} from "../domain/followup";
import {
  fmtDateTime,
  followupStatusLabel,
  fromLocalInput,
  nowLocalInput,
  relativeFromNow,
  toLocalInput,
} from "./format";

const CHANNELS: ContactChannel[] = ["电话", "短信", "即时消息", "紧急联系人", "面谈"];

interface Props {
  ledger: Ledger;
  caseId: string;
  nowIso: string;
  closed: boolean;
  onAddAttempt: (sessionId: string, input: AttemptInput) => boolean;
}

function AttemptAdder({
  session,
  ledger,
  closed,
  onAddAttempt,
}: {
  session: RiskSession;
  ledger: Ledger;
  closed: boolean;
  onAddAttempt: Props["onAddAttempt"];
}) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(nowLocalInput());
  const [channel, setChannel] = useState<ContactChannel>("电话");
  const [outcome, setOutcome] = useState<"connected" | "failed">("failed");
  const [note, setNote] = useState("");
  const [reschedule, setReschedule] = useState(() => {
    // 默认在当前跟进时刻之后 2 小时，保存时仍会被判断层校验"只能顺延不能提前"
    const base = Date.parse(
      effectiveFollowupAt(session, ledger.attempts) ?? new Date().toISOString()
    );
    return toLocalInput(new Date(base + 2 * 3_600_000).toISOString());
  });

  if (!open) {
    return (
      <button className="link-button" onClick={() => setOpen(true)}>
        + 补记一次联系尝试
      </button>
    );
  }

  const submit = () => {
    const input: AttemptInput = {
      at: fromLocalInput(at),
      channel,
      outcome,
      note,
      rescheduleAt: outcome === "failed" ? fromLocalInput(reschedule) : undefined,
    };
    if (onAddAttempt(session.id, input)) {
      setOpen(false);
      setNote("");
      setAt(nowLocalInput());
      setOutcome("failed");
    }
  };

  return (
    <div className="attempt-adder">
      <div className="attempt-adder-row">
        <label>
          <span>尝试时间</span>
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
        </label>
        <label>
          <span>方式</span>
          <select value={channel} onChange={(e) => setChannel(e.target.value as ContactChannel)}>
            {CHANNELS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="attempt-adder-row">
        <label className="inline-radio">
          <input
            type="radio"
            checked={outcome === "connected"}
            onChange={() => setOutcome("connected")}
          />
          已接通（跟进完成）
        </label>
        <label className="inline-radio">
          <input
            type="radio"
            checked={outcome === "failed"}
            onChange={() => setOutcome("failed")}
          />
          未接通（保留并顺延）
        </label>
      </div>
      {outcome === "failed" && (
        <label className="full">
          <span>下次跟进顺延至 *（必须晚于当前跟进时刻）</span>
          <input
            type="datetime-local"
            value={reschedule}
            onChange={(e) => setReschedule(e.target.value)}
          />
        </label>
      )}
      <label className="full">
        <span>情况说明 *</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="form-actions">
        <button className="primary-action" onClick={submit} disabled={closed}>
          保存尝试
        </button>
        <button onClick={() => setOpen(false)}>取消</button>
      </div>
    </div>
  );
}

export function SessionTimeline({ ledger, caseId, nowIso, closed, onAddAttempt }: Props) {
  const sessions = ledger.sessions
    .filter((s) => s.caseId === caseId)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return (
    <div className="timeline">
      {sessions.length === 0 && <p className="hint">暂无会谈记录。</p>}
      {sessions.map((s) => {
        const attempts = attemptsFor(s, ledger.attempts);
        const status = followupStatus(s, ledger.attempts, nowIso);
        const due = effectiveFollowupAt(s, ledger.attempts);
        const reached = status === "reached";
        return (
          <article
            key={s.id}
            className={`timeline-item ${s.level === "high" ? "is-high" : "is-low"}`}
          >
            <header className="timeline-head">
              <div>
                <span className={`level-tag level-${s.level}`}>
                  {s.level === "high" ? "高风险会谈" : "低风险会谈"}
                </span>
                <span className="timeline-when">{fmtDateTime(s.at)}</span>
                <span className="timeline-by">{s.counselor}</span>
              </div>
              {status && (
                <span className={`followup-tag f-${status}`}>
                  {followupStatusLabel[status]}
                </span>
              )}
            </header>

            <dl className="session-grid">
              <div>
                <dt>风险表现</dt>
                <dd>{s.triggers}</dd>
              </div>
              <div>
                <dt>现场干预</dt>
                <dd>{s.intervention}</dd>
              </div>
              <div>
                <dt>下次目标</dt>
                <dd>{s.nextGoal || "—"}</dd>
              </div>
            </dl>

            {s.level === "high" && s.emergencyContact && (
              <div className="emergency-box">
                <strong>紧急联系人</strong>
                <span>
                  {s.emergencyContact.name}（{s.emergencyContact.relation}）
                  {s.emergencyContact.phone}
                </span>
                <span>
                  下次跟进：{fmtDateTime(due)}（{relativeFromNow(due ?? s.nextFollowupAt!, nowIso)}）
                </span>
              </div>
            )}

            {s.level === "high" && (
              <div className="attempt-list">
                <p className="attempt-title">
                  联系尝试（{attempts.length} 次{reached ? "，已接通" : "，尚未接通"}）
                </p>
                {attempts.length === 0 && (
                  <p className="hint hint-danger">
                    缺少联系尝试——高风险会谈必须留下至少一次联系结果
                  </p>
                )}
                <ol>
                  {attempts.map((a, i) => (
                    <li key={a.id} className={a.outcome === "failed" ? "attempt-failed" : "attempt-ok"}>
                      <span className="attempt-index">{i + 1}</span>
                      <div>
                        <p>
                          <strong>{fmtDateTime(a.at)}</strong> · {a.channel} ·{" "}
                          {a.outcome === "connected" ? (
                            <em className="out-ok">已接通</em>
                          ) : (
                            <em className="out-failed">未接通</em>
                          )}
                          {a.outcome === "failed" && a.nextFollowupAt && (
                            <span className="reschedule">
                              {" "}
                              → 顺延至 {fmtDateTime(a.nextFollowupAt)}
                            </span>
                          )}
                        </p>
                        <p className="attempt-note">{a.note}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                {!closed && !reached && (
                  <AttemptAdder
                    session={s}
                    ledger={ledger}
                    closed={closed}
                    onAddAttempt={onAddAttempt}
                  />
                )}
                {!reached && status === "overdue" && (
                  <p className="hint hint-danger">
                    跟进时刻已过仍未接通：请继续补记尝试并顺延，不能跳过或结案
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
