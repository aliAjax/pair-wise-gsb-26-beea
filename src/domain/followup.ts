// 判断层：危机跟进的派生规则
// - 高风险会谈必须留下首次联系结果（录入时强制）
// - 联系失败：保留每次尝试，并把"下次跟进时刻"顺延
// - 只有出现一次"已接通"尝试，跟进才算完成；否则到期即逾期，不能悄悄结案

import type { ContactAttempt, FollowupStatus, RiskSession } from "../data/types";
import { isValidIso } from "./result";

/** 该会谈目前记录到的全部尝试（含会谈时录入的首次尝试，按 ID 去重） */
export function attemptsFor(
  session: RiskSession,
  allAttempts: ContactAttempt[]
): ContactAttempt[] {
  const byId = new Map<string, ContactAttempt>();
  if (session.firstAttempt) byId.set(session.firstAttempt.id, session.firstAttempt);
  for (const a of allAttempts) {
    if (a.sessionId === session.id) byId.set(a.id, a);
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function hasReached(session: RiskSession, allAttempts: ContactAttempt[]): boolean {
  return attemptsFor(session, allAttempts).some((a) => a.outcome === "connected");
}

/**
 * 当前生效的"下次跟进时刻"：
 * 取会谈原定时与所有失败尝试顺延时刻中最晚的一个。
 */
export function effectiveFollowupAt(
  session: RiskSession,
  allAttempts: ContactAttempt[]
): string | undefined {
  if (!session.nextFollowupAt) return undefined;
  let latest = session.nextFollowupAt;
  for (const a of attemptsFor(session, allAttempts)) {
    if (a.outcome === "failed" && a.nextFollowupAt) {
      if (Date.parse(a.nextFollowupAt) > Date.parse(latest)) latest = a.nextFollowupAt;
    }
  }
  return latest;
}

export function followupStatus(
  session: RiskSession,
  allAttempts: ContactAttempt[],
  nowIso: string
): FollowupStatus | undefined {
  if (session.level !== "high" || !session.nextFollowupAt) return undefined;
  if (hasReached(session, allAttempts)) return "reached";
  const due = effectiveFollowupAt(session, allAttempts);
  if (due && Date.parse(nowIso) >= Date.parse(due)) return "overdue";
  return "pending";
}

/** 失败顺延只能向后，不能把跟进时刻悄悄提前 */
export function validateReschedule(
  session: RiskSession,
  allAttempts: ContactAttempt[],
  nextFollowupAt: string
): string | undefined {
  if (!isValidIso(nextFollowupAt)) return "请填写有效的顺延跟进时间";
  const current = effectiveFollowupAt(session, allAttempts) ?? session.nextFollowupAt;
  if (current && Date.parse(nextFollowupAt) <= Date.parse(current)) {
    return "顺延时间必须晚于当前的下次跟进时刻";
  }
  return undefined;
}
