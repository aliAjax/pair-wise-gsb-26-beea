import { useState } from "react";
import type { ContactAttempt, ContactChannel, ContactResult, RiskSession } from "../data/types";
import {
  CHANNEL_LABEL,
  RESULT_CLASS,
  RESULT_LABEL,
  RISK_CLASS,
  RISK_LABEL,
  followUpHint,
  fmtDateTime,
  isOverdue,
} from "./format";
import type { AttemptInput } from "../domain/ledger";

interface SessionTimelineProps {
  sessions: RiskSession[]; // 按时间正序
  attempts: ContactAttempt[];
  now: Date;
  onAddAttempt: (sessionId: string, input: AttemptInput) => void;
}

function AttemptRow({ attempt }: { attempt: ContactAttempt }) {
  const failed = attempt.result !== "reached";
  return (
    <li className={"attempt-row " + RESULT_CLASS[attempt.result]}>
      <div className="attempt-line">
        <i className={"result-dot " + RESULT_CLASS[attempt.result]} />
        <span className="attempt-time">{fmtDateTime(attempt.attemptedAt)}</span>
        <span className="attempt-channel">{CHANNEL_LABEL[attempt.channel]}</span>
        <span className={"result-tag " + RESULT_CLASS[attempt.result]}>{RESULT_LABEL[attempt.result]}</span>
      </div>
      <p className="attempt-note">{attempt.note}</p>
      {failed && <p className="attempt-defer">本次联系未接通，下次跟进时刻顺延 24 小时（尝试记录保留）</p>}
    </li>
  );
}

function AddAttempt({
  sessionId,
  onAddAttempt,
}: {
  sessionId: string;
  onAddAttempt: (sessionId: string, input: AttemptInput) => void;
}) {
  const [channel, setChannel] = useState<ContactChannel>("phone");
  const [result, setResult] = useState<ContactResult>("no-answer");
  const [note, setNote] = useState("");

  const submit = () => {
    onAddAttempt(sessionId, { channel, result, note });
    setNote("");
  };

  return (
    <div className="add-attempt">
      <select value={channel} onChange={(e) => setChannel(e.target.value as ContactChannel)}>
        <option value="phone">电话</option>
        <option value="sms">短信</option>
        <option value="wechat">微信</option>
        <option value="email">邮件</option>
      </select>
      <select value={result} onChange={(e) => setResult(e.target.value as ContactResult)}>
        <option value="reached">已接通</option>
        <option value="no-answer">无人接听</option>
        <option value="voicemail">已留言</option>
        <option value="refused">对方拒绝</option>
      </select>
      <input placeholder="联系备注（失败将顺延）" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button" onClick={submit}>
        记录尝试
      </button>
    </div>
  );
}

export function SessionTimeline({ sessions, attempts, now, onAddAttempt }: SessionTimelineProps) {
  const ordered = [...sessions].reverse();

  return (
    <section className="panel subpanel">
      <div className="subpanel-head">
        <div>
          <p className="kicker">会谈时间线</p>
          <h3>会谈、紧急联系与跟进</h3>
        </div>
      </div>

      {ordered.length === 0 && <p className="empty-hint">暂无会谈记录。</p>}

      <div className="timeline">
        {ordered.map((s) => {
          const list = attempts
            .filter((a) => a.sessionId === s.id)
            .sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt));
          const overdue = s.followUpStatus === "open" && isOverdue(s.nextFollowUpAt, now);
          return (
            <article key={s.id} className={"session-card risk-border-" + RISK_CLASS[s.riskLevel]}>
              <div className="session-head">
                <div>
                  <strong>{fmtDateTime(s.occurredAt)}</strong>
                  <i className={"risk-badge " + RISK_CLASS[s.riskLevel]}>{RISK_LABEL[s.riskLevel]}</i>
                </div>
                {s.followUpStatus !== "none" && (
                  <span className={"follow-state " + (s.followUpStatus === "reached" ? "state-reached" : "state-open")}>
                    {s.followUpStatus === "reached" ? "已接通" : overdue ? "跟进逾期" : "待跟进"}
                  </span>
                )}
              </div>
              <p className="session-summary">{s.summary}</p>

              {s.emergencyContact && (
                <p className="session-contact">
                  紧急联系人：{s.emergencyContact.name}（{s.emergencyContact.relation}）
                  {s.emergencyContact.phone}
                </p>
              )}

              {s.followUpStatus !== "none" && (
                <p className={"session-followup" + (overdue ? " overdue" : "")}>
                  下次跟进：{fmtDateTime(s.nextFollowUpAt)}
                  <em>（{followUpHint(s.nextFollowUpAt, now)}）</em>
                </p>
              )}

              {list.length > 0 && (
                <ul className="attempt-list">
                  {list.map((a) => (
                    <AttemptRow key={a.id} attempt={a} />
                  ))}
                </ul>
              )}

              {s.followUpStatus === "open" && <AddAttempt sessionId={s.id} onAddAttempt={onAddAttempt} />}
            </article>
          );
        })}
      </div>
    </section>
  );
}
