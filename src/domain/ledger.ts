// 判断层：台账的全部业务规则。纯函数，输入状态输出新状态，便于核对与测试。

import type {
  ContactAttempt,
  ContactChannel,
  ContactResult,
  LedgerState,
  RiskAssessment,
  RiskLevel,
  RiskSession,
  SafetyPlan,
  SessionDraft,
} from "../data/types";

/** 联系失败后，跟进时刻顺延 24 小时 */
export const FOLLOW_UP_DEFER_MS = 24 * 3600_000;

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function emptySessionDraft(caseId: string): SessionDraft {
  return {
    caseId,
    occurredAt: "",
    riskLevel: "medium",
    summary: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    nextFollowUpAt: "",
    firstAttemptChannel: "phone",
    firstAttemptResult: "",
    firstAttemptNote: "",
  };
}

/* ---------- 查询 ---------- */

export function sessionsOf(state: LedgerState, caseId: string): RiskSession[] {
  return state.sessions
    .filter((s) => s.caseId === caseId)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export function attemptsOf(state: LedgerState, sessionId: string): ContactAttempt[] {
  return state.attempts
    .filter((a) => a.sessionId === sessionId)
    .sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt));
}

export function currentAssessment(state: LedgerState, caseId: string): RiskAssessment | undefined {
  return state.assessments
    .filter((a) => a.caseId === caseId)
    .sort((a, b) => b.version - a.version)[0];
}

export function currentPlan(state: LedgerState, caseId: string): SafetyPlan | undefined {
  return state.plans
    .filter((p) => p.caseId === caseId)
    .sort((a, b) => b.version - a.version)[0];
}

/** 尚未接通的高风险跟进；联系失败只顺延、不关闭 */
export function openFollowUps(state: LedgerState, caseId?: string): RiskSession[] {
  return state.sessions.filter(
    (s) =>
      s.followUpStatus === "open" &&
      (caseId === undefined || s.caseId === caseId),
  );
}

export function isFailedResult(result: ContactResult): boolean {
  return result !== "reached";
}

function deferFollowUp(attemptedAtIso: string): string {
  return new Date(new Date(attemptedAtIso).getTime() + FOLLOW_UP_DEFER_MS).toISOString();
}

/* ---------- 高风险会谈 ---------- */

/** 高风险会谈必须留下：紧急联系人、下次跟进时刻、至少一次联系结果 */
export function validateSessionDraft(draft: SessionDraft): string[] {
  const errors: string[] = [];
  if (!draft.occurredAt) errors.push("请填写会谈时间");
  if (!draft.summary.trim()) errors.push("请填写会谈纪要");
  if (draft.riskLevel === "high") {
    if (!draft.emergencyContactName.trim()) errors.push("高风险会谈必须留下紧急联系人姓名");
    if (!draft.emergencyContactPhone.trim()) errors.push("高风险会谈必须留下紧急联系电话");
    if (!draft.nextFollowUpAt) errors.push("高风险会谈必须约定下次跟进时刻");
    if (!draft.firstAttemptResult) errors.push("高风险会谈必须记录至少一次联系结果");
  }
  return errors;
}

export function addSession(
  state: LedgerState,
  draft: SessionDraft,
  now: Date,
): { state: LedgerState; errors: string[] } {
  const errors = validateSessionDraft(draft);
  if (errors.length > 0) return { state, errors };

  const sessionId = uid("ss");
  const isHigh = draft.riskLevel === "high";
  const session: RiskSession = {
    id: sessionId,
    caseId: draft.caseId,
    occurredAt: new Date(draft.occurredAt).toISOString(),
    riskLevel: draft.riskLevel,
    summary: draft.summary.trim(),
    followUpStatus: isHigh && draft.firstAttemptResult === "reached" ? "reached" : isHigh ? "open" : "none",
    createdAt: now.toISOString(),
  };
  if (isHigh) {
    session.emergencyContact = {
      name: draft.emergencyContactName.trim(),
      phone: draft.emergencyContactPhone.trim(),
      relation: draft.emergencyContactRelation.trim() || "未注明",
    };
    session.nextFollowUpAt = new Date(draft.nextFollowUpAt).toISOString();
  }

  const assessments = [...state.assessments];
  if (isHigh) {
    const firstAttempt: ContactAttempt = {
      id: uid("att"),
      caseId: draft.caseId,
      sessionId,
      attemptedAt: now.toISOString(),
      channel: draft.firstAttemptChannel,
      result: draft.firstAttemptResult as ContactResult,
      note: draft.firstAttemptNote.trim() || "首次联系",
    };
    // 首次联系失败：保留尝试并顺延跟进时刻，跟进保持开放
    if (isFailedResult(firstAttempt.result)) {
      session.nextFollowUpAt = deferFollowUp(firstAttempt.attemptedAt);
    }
    state = { ...state, attempts: [...state.attempts, firstAttempt] };

    const prev = currentAssessment(state, draft.caseId);
    // 高风险会谈触发升级：新增评估版本，旧版本原样保留
    if (!prev || prev.level !== "high") {
      assessments.push({
        id: uid("ra"),
        caseId: draft.caseId,
        version: (prev?.version ?? 0) + 1,
        level: "high",
        kind: "escalation",
        basisSessionIds: [sessionId],
        createdAt: now.toISOString(),
      });
    }
  }

  return {
    state: {
      ...state,
      sessions: [...state.sessions, session],
      assessments,
    },
    errors: [],
  };
}

/* ---------- 追加联系尝试：失败保留并顺延，接通才关闭跟进 ---------- */

export interface AttemptInput {
  channel: ContactChannel;
  result: ContactResult;
  note: string;
}

export function addAttempt(
  state: LedgerState,
  sessionId: string,
  input: AttemptInput,
  now: Date,
): LedgerState {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return state;

  const attempt: ContactAttempt = {
    id: uid("att"),
    caseId: session.caseId,
    sessionId,
    attemptedAt: now.toISOString(),
    channel: input.channel,
    result: input.result,
    note: input.note.trim() || "未备注",
  };

  const sessions = state.sessions.map((s) => {
    if (s.id !== sessionId) return s;
    if (input.result === "reached") {
      return { ...s, followUpStatus: "reached" as const };
    }
    // 失败：跟进时刻从本次尝试顺延，绝不悄悄关闭
    return { ...s, followUpStatus: "open" as const, nextFollowUpAt: deferFollowUp(attempt.attemptedAt) };
  });

  return { ...state, attempts: [...state.attempts, attempt], sessions };
}

/* ---------- 风险降级：连续两次低风险会谈 + 督导确认 ---------- */

export interface DowngradeEval {
  eligible: boolean;
  reasons: string[];
  basisSessionIds: string[];
}

export function evaluateDowngrade(state: LedgerState, caseId: string): DowngradeEval {
  const reasons: string[] = [];
  const prev = currentAssessment(state, caseId);
  if (!prev) {
    return { eligible: false, reasons: ["缺少初始风险评估"], basisSessionIds: [] };
  }
  if (prev.level === "low") reasons.push("当前已是低风险，无需降级");

  const recent = sessionsOf(state, caseId).slice(-2);
  if (recent.length < 2) {
    reasons.push("至少需要两次会谈记录");
  } else if (!recent.every((s) => s.riskLevel === "low")) {
    reasons.push("最近两次会谈必须连续为低风险");
  }
  if (openFollowUps(state, caseId).length > 0) {
    reasons.push("存在尚未接通的高风险跟进");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    basisSessionIds: recent.length === 2 ? recent.map((s) => s.id) : [],
  };
}

export function confirmDowngrade(
  state: LedgerState,
  caseId: string,
  supervisor: string,
  now: Date,
): { state: LedgerState; errors: string[] } {
  const evalResult = evaluateDowngrade(state, caseId);
  const errors = [...evalResult.reasons];
  if (!supervisor.trim()) errors.push("降级必须由督导确认，请填写督导姓名");
  if (errors.length > 0) return { state, errors };

  const prev = currentAssessment(state, caseId)!;
  // 生成新版本，旧值（prev）保留在 assessments 中不动
  const next: RiskAssessment = {
    id: uid("ra"),
    caseId,
    version: prev.version + 1,
    level: "low",
    kind: "downgrade",
    supervisor: supervisor.trim(),
    basisSessionIds: evalResult.basisSessionIds,
    createdAt: now.toISOString(),
  };
  return { state: { ...state, assessments: [...state.assessments, next] }, errors: [] };
}

/* ---------- 安全计划：每次修改生成新版本，旧版本保留 ---------- */

export interface PlanFields {
  warningSigns: string;
  copingStrategies: string;
  supportContacts: string;
  professionalResources: string;
}

export function saveSafetyPlan(
  state: LedgerState,
  caseId: string,
  fields: PlanFields,
  changeNote: string,
  now: Date,
): LedgerState {
  const prev = currentPlan(state, caseId);
  const plan: SafetyPlan = {
    id: uid("sp"),
    caseId,
    version: (prev?.version ?? 0) + 1,
    ...fields,
    changeNote: changeNote.trim() || "未注明变更说明",
    createdAt: now.toISOString(),
    supersedes: prev?.id,
  };
  return { ...state, plans: [...state.plans, plan] };
}

/* ---------- 结案拦截：有未接通跟进时不能结案 ---------- */

export function closeBlockers(state: LedgerState, caseId: string): string[] {
  const open = openFollowUps(state, caseId);
  if (open.length === 0) return [];
  return open.map(
    (s) =>
      `高风险会谈（${formatDateShort(s.occurredAt)}）仍有未接通的跟进，下次跟进 ${formatDateShort(
        s.nextFollowUpAt!,
      )}，不能结案`,
  );
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function closeCase(
  state: LedgerState,
  caseId: string,
  now: Date,
): { state: LedgerState; errors: string[] } {
  const blockers = closeBlockers(state, caseId);
  if (blockers.length > 0) return { state, errors: blockers };
  return {
    state: {
      ...state,
      cases: state.cases.map((c) =>
        c.id === caseId ? { ...c, status: "closed", closedAt: now.toISOString() } : c,
      ),
    },
    errors: [],
  };
}

export function reopenCase(state: LedgerState, caseId: string): LedgerState {
  return {
    ...state,
    cases: state.cases.map((c) =>
      c.id === caseId ? { ...c, status: "active", closedAt: undefined } : c,
    ),
  };
}

/* ---------- 新建个案 ---------- */

export function addCase(
  state: LedgerState,
  input: { alias: string; topic: string; counselor: string; level: RiskLevel },
  now: Date,
): { state: LedgerState; caseId: string; errors: string[] } {
  const errors: string[] = [];
  if (!input.alias.trim()) errors.push("请填写来访者代号");
  if (!input.topic.trim()) errors.push("请填写咨询主题");
  if (errors.length > 0) return { state, caseId: "", errors };

  const caseId = uid("case");
  const next: LedgerState = {
    ...state,
    cases: [
      ...state.cases,
      {
        id: caseId,
        alias: input.alias.trim(),
        topic: input.topic.trim(),
        counselor: input.counselor.trim() || "未分配",
        status: "active",
        createdAt: now.toISOString(),
      },
    ],
    assessments: [
      ...state.assessments,
      {
        id: uid("ra"),
        caseId,
        version: 1,
        level: input.level,
        kind: "initial",
        basisSessionIds: [],
        createdAt: now.toISOString(),
      },
    ],
  };
  return { state: next, caseId, errors: [] };
}

/* ---------- 指标 ---------- */

export function computeMetrics(state: LedgerState, now: Date) {
  const activeCases = state.cases.filter((c) => c.status === "active");
  const highRiskCases = activeCases.filter((c) => currentAssessment(state, c.id)?.level === "high");
  const weekAgo = now.getTime() - 7 * 24 * 3600_000;
  const weekSessions = state.sessions.filter((s) => new Date(s.occurredAt).getTime() >= weekAgo);
  const open = openFollowUps(state);
  const overdue = open.filter((s) => new Date(s.nextFollowUpAt!).getTime() <= now.getTime());
  return {
    activeCases: activeCases.length,
    highRiskCases: highRiskCases.length,
    weekSessions: weekSessions.length,
    openFollowUps: open.length,
    overdueFollowUps: overdue.length,
  };
}
