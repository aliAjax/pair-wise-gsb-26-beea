// 本地保存层：台账 localStorage 持久化
// 数据损坏时不静默吞掉：返回损坏提示，由页面引导恢复示例数据。

import type { Ledger } from "../data/types";
import { createSeedLedger } from "../data/seed";

const STORAGE_KEY = "hxwl-12.ledger.v1";

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export type LoadResult =
  | { ok: true; ledger: Ledger; seeded: boolean }
  | { ok: false; error: string };

function isLedger(value: unknown): value is Ledger {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.cases) &&
    Array.isArray(v.sessions) &&
    Array.isArray(v.attempts) &&
    Array.isArray(v.riskVersions) &&
    Array.isArray(v.safetyPlans)
  );
}

export function loadLedger(): LoadResult {
  const s = storage();
  if (!s) return { ok: true, ledger: createSeedLedger(), seeded: true };
  const raw = s.getItem(STORAGE_KEY);
  if (raw === null) {
    const seed = createSeedLedger();
    s.setItem(STORAGE_KEY, JSON.stringify(seed));
    return { ok: true, ledger: seed, seeded: true };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isLedger(parsed)) throw new Error("结构不完整");
    return { ok: true, ledger: parsed, seeded: false };
  } catch (e) {
    return {
      ok: false,
      error: `本机台账数据无法读取（${(e as Error).message}），可导出备份后恢复为示例数据`,
    };
  }
}

export function saveLedger(ledger: Ledger): void {
  const s = storage();
  s?.setItem(STORAGE_KEY, JSON.stringify(ledger));
}

export function resetToSeed(): Ledger {
  const seed = createSeedLedger();
  storage()?.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

/** 导出为 JSON 文件（台账只存本机，导出是唯一的外带方式） */
export function exportLedger(ledger: Ledger): void {
  const blob = new Blob([JSON.stringify(ledger, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `个案台账-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
