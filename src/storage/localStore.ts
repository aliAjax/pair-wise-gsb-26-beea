// 本地保存层：只负责台账状态与逐案草稿的读写，不包含业务规则。

import type { LedgerState, SessionDraft } from "../data/types";
import { buildSeed } from "../data/seed";

const LEDGER_KEY = "hxwl12.ledger.v1";
const DRAFTS_KEY = "hxwl12.drafts.v1";

function isLedger(value: unknown): value is LedgerState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.cases) &&
    Array.isArray(v.sessions) &&
    Array.isArray(v.attempts) &&
    Array.isArray(v.plans) &&
    Array.isArray(v.assessments)
  );
}

export function loadLedger(): LedgerState {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return buildSeed(new Date());
    const parsed: unknown = JSON.parse(raw);
    if (isLedger(parsed)) return parsed;
  } catch {
    // 数据损坏时重新播种，避免页面白屏
  }
  return buildSeed(new Date());
}

export function saveLedger(state: LedgerState): void {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时静默降级为本轮会话内状态
  }
}

export function loadDrafts(): Record<string, SessionDraft> {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, SessionDraft>;
  } catch {
    // ignore
  }
  return {};
}

export function saveDrafts(drafts: Record<string, SessionDraft>): void {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // ignore
  }
}
