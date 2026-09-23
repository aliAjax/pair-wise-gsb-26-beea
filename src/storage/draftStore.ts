// 本地保存层：表单草稿按"个案 ID + 表单"分键。
// 切换个案时读到的是另一套键，从存储层面保证草稿不串台。

import type { CaseDrafts, DraftKey, DraftMap } from "../data/types";

const DRAFT_KEY = "hxwl-12.drafts.v1";

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function readAll(): CaseDrafts {
  const s = storage();
  if (!s) return {};
  try {
    const parsed: unknown = JSON.parse(s.getItem(DRAFT_KEY) ?? "{}");
    if (parsed && typeof parsed === "object") return parsed as CaseDrafts;
  } catch {
    // 草稿损坏不影响台账，直接重来
  }
  return {};
}

function writeAll(drafts: CaseDrafts): void {
  storage()?.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

function caseBucket(caseId: string): DraftMap {
  return readAll()[caseId] ?? {};
}

/** 读取某个个案的某张表单草稿（读不到返回 null） */
export function loadDraft<K extends DraftKey, D = NonNullable<DraftMap[K]>>(
  caseId: string,
  key: K
): D | null {
  const draft = caseBucket(caseId)[key];
  return (draft as D) ?? null;
}

export function saveDraft(caseId: string, key: DraftKey, value: unknown): void {
  const all = readAll();
  all[caseId] = { ...(all[caseId] ?? {}), [key]: value };
  writeAll(all);
}

export function clearDraft(caseId: string, key: DraftKey): void {
  const all = readAll();
  if (!all[caseId]) return;
  delete all[caseId][key];
  writeAll(all);
}
