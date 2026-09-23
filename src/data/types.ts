// 资料层：个案台账的领域类型定义（只描述数据，不含判断逻辑）

export type RiskLevel = "high" | "low";

/** 风险状态：高风险关注中 / 已由督导确认降级 */
export type RiskState = "high" | "downgraded";

export type ContactChannel = "电话" | "短信" | "即时消息" | "紧急联系人" | "面谈";
export type AttemptOutcome = "connected" | "failed";
export type FollowupStatus = "reached" | "pending" | "overdue";

export type CaseStatus = "open" | "closed";

/** 紧急联系人 */
export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

/** 联系尝试：失败也要逐条保留，成功尝试是解除危机跟进的唯一依据 */
export interface ContactAttempt {
  id: string;
  sessionId: string;
  at: string; // ISO 时间
  channel: ContactChannel;
  outcome: AttemptOutcome;
  note: string;
  /** outcome = failed 时记录：下次跟进时刻顺延到何时 */
  nextFollowupAt?: string;
}

/**
 * 风险会谈。会谈本身只追加、不改写；
 * 风险等级的状态变迁另存为 riskVersions（新版本保留旧值）。
 */
export interface RiskSession {
  id: string;
  caseId: string;
  at: string; // 会谈时间 ISO
  counselor: string;
  level: RiskLevel;
  triggers: string; // 风险表现/触发因素
  intervention: string; // 现场干预
  nextGoal: string;
  /** 高风险会谈必填：紧急联系人 */
  emergencyContact?: EmergencyContact;
  /** 高风险会谈必填：下次跟进时刻 */
  nextFollowupAt?: string;
  /** 高风险会谈必填：首次联系尝试（至少留下一次联系结果） */
  firstAttempt?: ContactAttempt;
  createdAt: string;
}

/** 风险版本：任何风险状态变化都生成新版本，旧值保留可审计 */
export interface RiskVersion {
  id: string;
  caseId: string;
  version: number;
  state: RiskState;
  /** 触发该版本的会谈；降级确认时取第二次低风险会谈 */
  sourceSessionId: string;
  reason: string;
  changedBy: string; // 会谈咨询师 或 督导
  at: string;
  /** 仅降级版本有：督导确认信息 */
  supervisor?: string;
  supervisorNote?: string;
  confirmedAt?: string;
}

/** 安全计划条目：保存即生成新版本，历史版本只追加不改写 */
export interface SafetyPlan {
  id: string;
  caseId: string;
  version: number;
  triggers: string; // 预警信号
  copingSteps: string; // 自我应对步骤
  supporters: string; // 可联系的支持者
  safeEnvironment: string; // 环境安全措施
  professionalHelp: string; // 专业求助途径
  agreedByClient: boolean;
  editedBy: string;
  createdAt: string;
  note?: string;
}

export interface CaseClosure {
  reason: string;
  closedAt: string;
  closedBy: string;
}

export interface CounselingCase {
  id: string; // 个案编号，如 C-042
  alias: string; // 来访者代号（脱敏）
  theme: string; // 咨询主题
  mainConcern: string;
  emotion: string;
  openedAt: string;
  status: CaseStatus;
  closure?: CaseClosure;
}

/** 完整台账：结构可整体序列化到 localStorage */
export interface Ledger {
  version: 1;
  cases: CounselingCase[];
  sessions: RiskSession[];
  attempts: ContactAttempt[];
  riskVersions: RiskVersion[];
  safetyPlans: SafetyPlan[];
}

/** 表单草稿：按个案 ID 分键，切换个案时不串台 */
export type DraftKey = "session" | "safetyPlan";

export interface SessionDraft {
  at: string; // datetime-local 值
  counselor: string;
  level: RiskLevel;
  triggers: string;
  intervention: string;
  nextGoal: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  nextFollowupAt: string;
  firstChannel: ContactChannel;
  firstOutcome: AttemptOutcome;
  firstNote: string;
  rescheduleAt: string;
}

export interface SafetyPlanDraft {
  triggers: string;
  copingSteps: string;
  supporters: string;
  safeEnvironment: string;
  professionalHelp: string;
  agreedByClient: boolean;
  editedBy: string;
  note: string;
}

export type DraftMap = Partial<Record<DraftKey, SessionDraft | SafetyPlanDraft>>;
export type CaseDrafts = Record<string, DraftMap>;
