// 资料层：个案台账的领域模型，纯数据，不含逻辑与界面。

export type RiskLevel = "low" | "medium" | "high";
export type CaseStatus = "active" | "closed";
export type ContactChannel = "phone" | "sms" | "wechat" | "email";
export type ContactResult = "reached" | "no-answer" | "voicemail" | "refused";
export type FollowUpStatus = "none" | "open" | "reached";

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

/** 个案 */
export interface CaseRecord {
  id: string;
  alias: string;
  topic: string;
  counselor: string;
  status: CaseStatus;
  createdAt: string;
  closedAt?: string;
}

/** 风险会谈 */
export interface RiskSession {
  id: string;
  caseId: string;
  occurredAt: string;
  riskLevel: RiskLevel;
  summary: string;
  /** 高风险会谈必填 */
  emergencyContact?: EmergencyContact;
  /** 高风险会谈必填；联系失败会被顺延 */
  nextFollowUpAt?: string;
  followUpStatus: FollowUpStatus;
  createdAt: string;
}

/** 联系尝试：只增不删，失败也保留 */
export interface ContactAttempt {
  id: string;
  caseId: string;
  sessionId: string;
  attemptedAt: string;
  channel: ContactChannel;
  result: ContactResult;
  note: string;
}

/** 安全计划：版本化保存，旧版本保留 */
export interface SafetyPlan {
  id: string;
  caseId: string;
  version: number;
  warningSigns: string;
  copingStrategies: string;
  supportContacts: string;
  professionalResources: string;
  changeNote: string;
  createdAt: string;
  supersedes?: string;
}

/** 风险评估版本：当前风险等级取最高版本 */
export interface RiskAssessment {
  id: string;
  caseId: string;
  version: number;
  level: RiskLevel;
  kind: "initial" | "escalation" | "downgrade";
  /** 降级时必填：督导姓名 */
  supervisor?: string;
  /** 降级依据：连续两次低风险会谈 */
  basisSessionIds: string[];
  createdAt: string;
}

/** 会谈录入草稿：按个案隔离存放，切换个案不串台 */
export interface SessionDraft {
  caseId: string;
  occurredAt: string;
  riskLevel: RiskLevel;
  summary: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  nextFollowUpAt: string;
  firstAttemptChannel: ContactChannel;
  firstAttemptResult: ContactResult | "";
  firstAttemptNote: string;
}

/** 台账整体状态 */
export interface LedgerState {
  cases: CaseRecord[];
  sessions: RiskSession[];
  attempts: ContactAttempt[];
  plans: SafetyPlan[];
  assessments: RiskAssessment[];
}
