import { useCallback, useEffect, useRef, useState } from "react";
import type { DraftKey, DraftMap } from "../data/types";
import { clearDraft, loadDraft, saveDraft } from "../storage/draftStore";

/**
 * 绑定"某一个个案 + 某一张表单"的草稿。
 * caseId 变化时整张表单重置为该个案自己的草稿（或初始值），
 * 草稿按 caseId 分键存储，切换个案绝不串台。
 */
export function useCaseDraft<K extends DraftKey, D extends NonNullable<DraftMap[K]>>(
  caseId: string,
  key: K,
  createInitial: () => D
): {
  draft: D;
  patch: (p: Partial<D>) => void;
  reset: (next?: D) => void;
} {
  const [draft, setDraft] = useState<D>(
    () => loadDraft<K, D>(caseId, key) ?? createInitial()
  );
  // 重置/切换个案后跳过紧接着的一次回写，保证"清空"真的清空
  const skipPersist = useRef(false);

  // 切换个案：重新装载该个案的草稿
  useEffect(() => {
    skipPersist.current = true;
    setDraft(loadDraft<K, D>(caseId, key) ?? createInitial());
    // createInitial 是一次性工厂，不进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, key]);

  // 任何修改都落到该个案自己的键
  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    saveDraft(caseId, key, draft);
  }, [caseId, key, draft]);

  const patch = useCallback((p: Partial<D>) => {
    setDraft((prev) => ({ ...prev, ...p }));
  }, []);

  const reset = useCallback(
    (next?: D) => {
      clearDraft(caseId, key);
      skipPersist.current = true;
      setDraft(next ?? createInitial());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseId, key]
  );

  return { draft, patch, reset };
}
