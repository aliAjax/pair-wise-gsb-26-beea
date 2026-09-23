// 判断层：台账变更命令（纯函数，输入旧台账返回新台账或错误）
// 任何写入都必须经过这里的校验与派生逻辑，UI 与存储层不自行改数据。

import type {
  ContactAttempt,
  ContactChannel,
  CounselingCase,
  EmergencyContact,
  Ledger,
  RiskLevel,
  RiskSession,
  RiskVersion,
  SafetyPlan,
  AttemptOutcome,
} from "../data/types";
import {
  RuntimeCtx,
  Result,
  fail,
  isBlank,
  isValidIso,
  ok,
} from "./result";
import {
  currentRiskState,
  downgradeReadiness,
  getCase,
  latestVersionNumber,
  sessionsOf,
} from "./risk";
import { hasReached, validateReschedule } from "./followup";
import {
  ClosureCheck,
  SafetyPlanInput,
  closureCheck,
  plansOf,
  validateSafetyPlan,
} from "./safety";

// ---------------------------------------------------------------------------
// 新建个案
// ---------------------------------------------------------------------------

export interface NewCaseInput {
  alias: string;
  theme: string;
  mainConcern: string;
  emotion: string;
}

export function nextCaseId(ledger: Ledger): string {
  const max = ledger.cases.reduce((acc, c) => {
    const n = Number(c.id.replace(/^C-/, ""));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `C-${String(max + 1).padStart(3, "0")}`;
}

export function addCase(
  ledger: Ledger,
  input: NewCaseInput,
  ctx: RuntimeCtx
): Result<{ ledger: Ledger; caseId: string }> {
  if (isBlank(input.alias)) return fail("请填写来访者代号");
  if (isBlank(input.theme)) return fail("请填写咨询主题");
  const caseId = nextCaseId(ledger);
  const newCase: CounselingCase = {
    id: caseId,
    alias: input.alias.trim(),
    theme: input.theme.trim(),
    mainConcern: input.mainConcern.trim(),
    emotion: input.emotion.trim(),
    openedAt: ctx.now(),
    status: "open",
  };
  return ok({ ledger: { ...ledger, cases: [...ledger.cases, newCase] }, caseId });
}

// ---------------------------------------------------------------------------
// 记录风险会谈（高风险必须留下紧急联系人、下次跟进时刻、一次联系结果）
// ---------------------------------------------------------------------------

export interface SessionInput {
  at: string;
  counselor: string;
  level: RiskLevel;
  triggers: string;
  intervention: string;
  nextGoal: string;
  emergencyContact?: EmergencyContact;
  nextFollowupAt?: string;
  firstChannel?: ContactChannel;
  firstOutcome?: AttemptOutcome;
  firstNote?: string;
  /** 首次尝试失败时：顺延到何时 */
  rescheduleAt?: string;
}

function validateHighRiskSession(input: SessionInput): string | undefined {
  if (isBlank(input.emergencyContact?.name)) return "高风险会谈必须留下紧急联系人姓名";
  if (isBlank(input.emergencyContact?.relation)) return "请填写紧急联系人与来访者的关系";
  if (isBlank(input.emergencyContact?.phone)) return "请填写紧急联系人电话";
  if (!isValidIso(input.nextFollowupAt)) return "高风险会谈必须约定下次跟进时刻";
  if (Date.parse(input.nextFollowupAt!) <= Date.parse(input.at)) {
    return "下次跟进时刻必须晚于本次会谈时间";
  }
  if (!input.firstChannel) return "必须留下一次联系尝试（联系方式）";
  if (!input.firstOutcome) return "必须留下这次联系尝试的结果（接通/失败）";
  if (input.firstOutcome === "failed" && !isValidIso(input.rescheduleAt)) {
    return "首次联系失败时必须保留尝试并填写顺延跟进时间";
  }
  if (
    input.firstOutcome === "failed" &&
    Date.parse(input.rescheduleAt!) <= Date.parse(input.nextFollowupAt!)
  ) {
    return "顺延跟进时间必须晚于原定下次跟进时刻";
  }
  return undefined;
}

export function recordSession(
  ledger: Ledger,
  caseId: string,
  input: SessionInput,
  ctx: RuntimeCtx
): Result<{ ledger: Ledger; sessionId: string }> {
  const target = getCase(ledger, caseId);
  if (!target) return fail("个案不存在");
  if (target.status === "closed") return fail("个案已结案，不能新增会谈（请先按机构流程重开）");
  if (!isValidIso(input.at)) return fail("请选择会谈时间");
  if (isBlank(input.counselor)) return fail("请填写会谈咨询师");
  if (isBlank(input.triggers)) return fail("请填写风险表现/触发因素");
  if (isBlank(input.intervention)) return fail("请填写本次干预");
  if (input.level === "high") {
    const err = validateHighRiskSession(input);
    if (err) return fail(err);
  }

  const sessionId = ctx.id("s");
  const createdAt = ctx.now();

  let firstAttempt: ContactAttempt | undefined;
  if (input.level === "high") {
    firstAttempt = {
      id: ctx.id("a"),
      sessionId,
      // 首次尝试在会谈之后、下次跟进之前完成（无独立输入时取保存时刻）
      at: createdAt,
      channel: input.firstChannel!,
      outcome: input.firstOutcome!,
      note: input.firstNote?.trim() || (input.firstOutcome === "connected" ? "已接通" : "未接通"),
      nextFollowupAt:
        input.firstOutcome === "failed" ? input.rescheduleAt : undefined,
    };
  }

  const session: RiskSession = {
    id: sessionId,
    caseId,
    at: input.at,
    counselor: input.counselor.trim(),
    level: input.level,
    triggers: input.triggers.trim(),
    intervention: input.intervention.trim(),
    nextGoal: input.nextGoal.trim(),
    emergencyContact: input.level === "high" ? input.emergencyContact : undefined,
    nextFollowupAt: input.level === "high" ? input.nextFollowupAt : undefined,
    firstAttempt,
    createdAt,
  };

  let newVersions = ledger.riskVersions;
  if (input.level === "high" && currentRiskState(ledger, caseId) !== "high") {
    newVersions = [
      ...newVersions,
      {
        id: ctx.id("rv"),
        caseId,
        version: latestVersionNumber(ledger, caseId) + 1,
        state: "high",
        sourceSessionId: sessionId,
        reason: `高风险会谈：${input.triggers.trim().slice(0, 60)}`,
        changedBy: input.counselor.trim(),
        at: input.at,
      } satisfies RiskVersion,
    ];
  }
  // 低风险会谈不改变风险版本——降级只能由督导确认（confirmDowngrade）

  return ok({
    ledger: {
      ...ledger,
      sessions: [...ledger.sessions, session],
      attempts: firstAttempt ? [...ledger.attempts, firstAttempt] : ledger.attempts,
      riskVersions: newVersions,
    },
    sessionId,
  });
}

// ---------------------------------------------------------------------------
// 补记联系尝试：失败保留每次并顺延；接通即完成危机跟进
// ---------------------------------------------------------------------------

export interface AttemptInput {
  at: string;
  channel: ContactChannel;
  outcome: AttemptOutcome;
  note: string;
  /** 失败时必填：顺延到何时 */
  rescheduleAt?: string;
}

export function addAttempt(
  ledger: Ledger,
  sessionId: string,
  input: AttemptInput,
  ctx: RuntimeCtx
): Result<Ledger> {
  const session = ledger.sessions.find((s) => s.id === sessionId);
  if (!session) return fail("会谈不存在");
  const target = getCase(ledger, session.caseId);
  if (target?.status === "closed") return fail("个案已结案，不能补记联系尝试");
  if (session.level !== "high") return fail("只有高风险会谈需要危机跟进记录");
  if (!isValidIso(input.at)) return fail("请选择尝试时间");
  if (!input.channel) return fail("请选择联系方式");
  if (Date.parse(input.at) < Date.parse(session.at)) {
    return fail("尝试时间不能早于会谈时间");
  }
  if (hasReached(session, ledger.attempts)) {
    return fail("该会谈已取得联系，跟进已完成，无需继续补记");
  }
  if (input.outcome === "failed") {
    const err = validateReschedule(session, ledger.attempts, input.rescheduleAt ?? "");
    if (err) return fail(err);
  }
  if (isBlank(input.note)) return fail("请填写本次尝试的情况说明");

  const attempt: ContactAttempt = {
    id: ctx.id("a"),
    sessionId,
    at: input.at,
    channel: input.channel,
    outcome: input.outcome,
    note: input.note.trim(),
    nextFollowupAt: input.outcome === "failed" ? input.rescheduleAt : undefined,
  };
  return ok({ ...ledger, attempts: [...ledger.attempts, attempt] });
}

// ---------------------------------------------------------------------------
// 督导确认降级：连续两次低风险之后，督导确认生成新版本
// ---------------------------------------------------------------------------

export function confirmDowngrade(
  ledger: Ledger,
  caseId: string,
  supervisor: string,
  supervisorNote: string,
  ctx: RuntimeCtx
): Result<Ledger> {
  const target = getCase(ledger, caseId);
  if (!target) return fail("个案不存在");
  if (target.status === "closed") return fail("个案已结案");
  if (isBlank(supervisor)) return fail("请填写督导姓名（降级必须由督导确认）");

  const readiness = downgradeReadiness(ledger, caseId);
  if (!readiness.ready) return fail(readiness.blockers[0]);

  const secondLow = readiness.lows[1];
  const version: RiskVersion = {
    id: ctx.id("rv"),
    caseId,
    version: latestVersionNumber(ledger, caseId) + 1,
    state: "downgraded",
    sourceSessionId: secondLow.id,
    reason: `连续两次低风险会谈（${readiness.lows
      .map((s) => s.at.slice(0, 10))
      .join("、")}），督导确认降级`,
    changedBy: secondLow.counselor,
    at: secondLow.at,
    supervisor: supervisor.trim(),
    supervisorNote: supervisorNote.trim() || "督导确认符合降级条件",
    confirmedAt: ctx.now(),
  };
  return ok({ ...ledger, riskVersions: [...ledger.riskVersions, version] });
}

// ---------------------------------------------------------------------------
// 安全计划：保存即新版本
// ---------------------------------------------------------------------------

export function saveSafetyPlan(
  ledger: Ledger,
  caseId: string,
  input: SafetyPlanInput,
  ctx: RuntimeCtx
): Result<Ledger> {
  const target = getCase(ledger, caseId);
  if (!target) return fail("个案不存在");
  if (target.status === "closed") return fail("个案已结案，不能修改安全计划");
  const err = validateSafetyPlan(input);
  if (err) return fail(err);

  const versionNumber = (plansOf(ledger, caseId)[0]?.version ?? 0) + 1;
  const plan: SafetyPlan = {
    id: ctx.id("sp"),
    caseId,
    version: versionNumber,
    triggers: input.triggers.trim(),
    copingSteps: input.copingSteps.trim(),
    supporters: input.supporters.trim(),
    safeEnvironment: input.safeEnvironment.trim(),
    professionalHelp: input.professionalHelp.trim(),
    agreedByClient: input.agreedByClient,
    editedBy: input.editedBy.trim(),
    createdAt: ctx.now(),
    note: input.note?.trim() || undefined,
  };
  return ok({ ...ledger, safetyPlans: [...ledger.safetyPlans, plan] });
}

// ---------------------------------------------------------------------------
// 结案：显式操作，闸门校验
// ---------------------------------------------------------------------------

export function closeCase(
  ledger: Ledger,
  caseId: string,
  reason: string,
  closedBy: string,
  ctx: RuntimeCtx
): Result<{ ledger: Ledger; check: ClosureCheck }> {
  const check = closureCheck(ledger, caseId);
  if (!check.canClose) return fail(check.blockers[0]);
  if (isBlank(reason)) return fail("请填写结案理由（不允许无说明结案）");
  if (isBlank(closedBy)) return fail("请填写操作咨询师");

  const cases = ledger.cases.map((c) =>
    c.id === caseId
      ? {
          ...c,
          status: "closed" as const,
          closure: {
            reason: reason.trim(),
            closedAt: ctx.now(),
            closedBy: closedBy.trim(),
          },
        }
      : c
  );
  return ok({ ledger: { ...ledger, cases }, check });
}

/** 供页面展示的只读检查（不做变更） */
export { closureCheck, sessionsOf };
