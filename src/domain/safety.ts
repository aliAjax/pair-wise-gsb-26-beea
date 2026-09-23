// 判断层：安全计划版本与结案闸门
// - 安全计划每次保存生成新版本，历史版本保留
// - 不能"悄悄结案"：高风险跟进未接通 / 仍处高风险 / 缺少结案说明 都会被拦下

import type { Ledger, SafetyPlan } from "../data/types";
import { currentRiskState, sessionsOf, unresolvedHighSessions } from "./risk";
import { isBlank } from "./result";

export function plansOf(ledger: Ledger, caseId: string): SafetyPlan[] {
  return ledger.safetyPlans
    .filter((p) => p.caseId === caseId)
    .sort((a, b) => b.version - a.version);
}

export interface SafetyPlanInput {
  triggers: string;
  copingSteps: string;
  supporters: string;
  safeEnvironment: string;
  professionalHelp: string;
  agreedByClient: boolean;
  editedBy: string;
  note?: string;
}

export function validateSafetyPlan(input: SafetyPlanInput): string | undefined {
  const fields: Array<[string, string]> = [
    ["预警信号", input.triggers],
    ["自我应对步骤", input.copingSteps],
    ["可联系的支持者", input.supporters],
    ["环境安全措施", input.safeEnvironment],
    ["专业求助途径", input.professionalHelp],
  ];
  for (const [label, value] of fields) {
    if (isBlank(value)) return `请填写安全计划的「${label}」`;
  }
  if (isBlank(input.editedBy)) return "请填写保存人（咨询师）";
  if (!input.agreedByClient) return "需来访者本人确认同意安全计划后才能保存";
  return undefined;
}

export interface ClosureCheck {
  canClose: boolean;
  blockers: string[];
}

export function closureCheck(ledger: Ledger, caseId: string): ClosureCheck {
  const blockers: string[] = [];
  const c = ledger.cases.find((x) => x.id === caseId);
  if (!c) return { canClose: false, blockers: ["个案不存在"] };
  if (c.status === "closed") blockers.push("该个案已结案");

  const unresolved = unresolvedHighSessions(ledger, caseId);
  if (unresolved.length > 0) {
    blockers.push(
      `还有 ${unresolved.length} 次高风险会谈未取得联系，不能结案（先完成跟进或持续顺延）`
    );
  }
  if (currentRiskState(ledger, caseId) === "high") {
    blockers.push("当前仍为高风险：须连续两次低风险并经督导确认降级后才能结案");
  }
  if (sessionsOf(ledger, caseId).length === 0) {
    blockers.push("还没有任何会谈记录，不能结案");
  }
  return { canClose: blockers.length === 0, blockers };
}
