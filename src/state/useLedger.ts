import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Ledger } from "../data/types";
import {
  loadLedger,
  resetToSeed,
  saveLedger,
} from "../storage/ledgerStore";
import {
  AttemptInput,
  NewCaseInput,
  SessionInput,
  addAttempt,
  addCase,
  closeCase,
  confirmDowngrade,
  recordSession,
  saveSafetyPlan,
} from "../domain/commands";
import type { SafetyPlanInput } from "../domain/safety";
import { defaultCtx } from "../domain/result";

/**
 * 台账状态：所有写操作都走 domain 命令。
 * 命令失败只提示错误、不改数据；成功后整台账落盘 localStorage。
 */
export function useLedger() {
  const initial = useMemo(loadLedger, []);
  const [ledger, setLedger] = useState<Ledger>(
    initial.ok ? initial.ledger : resetToSeed()
  );
  const [loadError, setLoadError] = useState<string | null>(
    initial.ok ? null : initial.error
  );
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<number | undefined>(undefined);

  const announce = useCallback((message: string) => {
    setError(message);
    window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setError(null), 6000);
  }, []);

  /** 运行命令：成功则提交并落盘，失败则把校验信息返回给调用方 */
  const run = useCallback(
    <T>(fn: (l: Ledger) => { ok: true; value: T } | { ok: false; error: string }) => {
      const result = fn(ledger);
      if (!result.ok) {
        announce(result.error);
        return null;
      }
      return result.value;
    },
    [ledger, announce]
  );

  const commit = useCallback((next: Ledger) => {
    setLedger(next);
    saveLedger(next);
  }, []);

  const createCase = useCallback(
    (input: NewCaseInput): string | null => {
      const out = run((l) => addCase(l, input, defaultCtx));
      if (!out) return null;
      commit(out.ledger);
      return out.caseId;
    },
    [run, commit]
  );

  const createSession = useCallback(
    (caseId: string, input: SessionInput): string | null => {
      const out = run((l) => recordSession(l, caseId, input, defaultCtx));
      if (!out) return null;
      commit(out.ledger);
      return out.sessionId;
    },
    [run, commit]
  );

  const logAttempt = useCallback(
    (sessionId: string, input: AttemptInput): boolean => {
      const next = run((l) => addAttempt(l, sessionId, input, defaultCtx));
      if (!next) return false;
      commit(next);
      return true;
    },
    [run, commit]
  );

  const approveDowngrade = useCallback(
    (caseId: string, supervisor: string, note: string): boolean => {
      const next = run((l) =>
        confirmDowngrade(l, caseId, supervisor, note, defaultCtx)
      );
      if (!next) return false;
      commit(next);
      return true;
    },
    [run, commit]
  );

  const persistSafetyPlan = useCallback(
    (caseId: string, input: SafetyPlanInput): boolean => {
      const next = run((l) => saveSafetyPlan(l, caseId, input, defaultCtx));
      if (!next) return false;
      commit(next);
      return true;
    },
    [run, commit]
  );

  const close = useCallback(
    (caseId: string, reason: string, closedBy: string): boolean => {
      const out = run((l) => closeCase(l, caseId, reason, closedBy, defaultCtx));
      if (!out) return false;
      commit(out.ledger);
      return true;
    },
    [run, commit]
  );

  const reset = useCallback(() => {
    setLoadError(null);
    commit(resetToSeed());
  }, [commit]);

  return {
    ledger,
    error,
    loadError,
    createCase,
    createSession,
    logAttempt,
    approveDowngrade,
    persistSafetyPlan,
    close,
    reset,
    dismissError: () => setError(null),
  };
}

/** 每 30 秒重取当前时间，用于"已到跟进时刻→逾期"的派生显示 */
export function useNowTick(intervalMs = 30_000): string {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(new Date().toISOString()),
      intervalMs
    );
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
