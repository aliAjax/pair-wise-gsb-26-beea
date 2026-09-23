// 判断层：风险状态与降级规则
// 风险降级要同时满足：连续两次低风险会谈 + 督导确认。
// 每次状态变化生成新版本（RiskVersion），旧值保留不改写。

import type {
  CounselingCase,
  Ledger,
  RiskSession,
  RiskState,
  RiskVersion,
} from "../data/types";
import { hasReached } from "./followup";

export function sessionsOf(ledger: Ledger, caseId: string): RiskSession[] {
  return ledger.sessions
    .filter((s) => s.caseId === caseId)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function versionsOf(ledger: Ledger, caseId: string): RiskVersion[] {
  return ledger.riskVersions
    .filter((v) => v.caseId === caseId)
    .sort((a, b) => a.version - b.version);
}

/** 当前风险状态：从未评过风险的个案视为稳定（无版本） */
export function currentRiskState(ledger: Ledger, caseId: string): RiskState | undefined {
  return versionsOf(ledger, caseId).at(-1)?.state;
}

export function lastHighSessionIndex(sessions: RiskSession[]): number {
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].level === "high") return i;
  }
  return -1;
}

/**
 * 最近一次高风险会谈之后、连续收尾的低风险会谈。
 * 中间一旦再出现高风险，连续计数从新高风险之后重新计算。
 */
export function trailingLowSessions(ledger: Ledger, caseId: string): RiskSession[] {
  const sessions = sessionsOf(ledger, caseId);
  const idx = lastHighSessionIndex(sessions);
  if (idx === -1) return [];
  const tail: RiskSession[] = [];
  for (let i = idx + 1; i < sessions.length; i++) {
    if (sessions[i].level !== "low") break;
    tail.push(sessions[i]);
  }
  return tail;
}

/** 仍未接通的高风险会谈（危机跟进未完成） */
export function unresolvedHighSessions(
  ledger: Ledger,
  caseId: string
): RiskSession[] {
  return sessionsOf(ledger, caseId).filter(
    (s) => s.level === "high" && !hasReached(s, ledger.attempts)
  );
}

export interface DowngradeReadiness {
  state: RiskState | undefined;
  lows: RiskSession[];
  connected: boolean;
  ready: boolean;
  blockers: string[];
}

export function downgradeReadiness(
  ledger: Ledger,
  caseId: string
): DowngradeReadiness {
  const state = currentRiskState(ledger, caseId);
  const lows = trailingLowSessions(ledger, caseId);
  const unresolved = unresolvedHighSessions(ledger, caseId);
  const blockers: string[] = [];

  if (state !== "high") blockers.push("当前不在高风险状态，无需降级确认");
  if (state === "high" && lows.length === 0) {
    blockers.push("最近一次高风险会谈后还没有低风险会谈");
  }
  if (state === "high" && lows.length === 1) {
    blockers.push("仅完成 1 次低风险会谈，还需连续 2 次低风险（期间不得出现高风险）");
  }
  if (unresolved.length > 0) {
    blockers.push("仍有高风险会谈未取得联系，须先完成危机跟进");
  }

  return {
    state,
    lows,
    connected: unresolved.length === 0,
    ready: blockers.length === 0,
    blockers,
  };
}

export function latestVersionNumber(ledger: Ledger, caseId: string): number {
  return versionsOf(ledger, caseId).at(-1)?.version ?? 0;
}

export function getCase(ledger: Ledger, caseId: string): CounselingCase | undefined {
  return ledger.cases.find((c) => c.id === caseId);
}
