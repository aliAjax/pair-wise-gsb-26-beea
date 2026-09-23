// 资料层：首次启动时的示例台账。时间相对当前时刻生成，保证跟进待办、本周会谈等指标有实际内容。

import type { LedgerState } from "./types";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

export function buildSeed(now: Date): LedgerState {
  const t = now.getTime();

  return {
    cases: [
      { id: "case-042", alias: "C-042", topic: "焦虑", counselor: "王咨询师", status: "active", createdAt: iso(t - 10 * DAY) },
      { id: "case-119", alias: "C-119", topic: "亲密关系", counselor: "王咨询师", status: "active", createdAt: iso(t - 30 * DAY) },
      { id: "case-203", alias: "C-203", topic: "职业压力", counselor: "李咨询师", status: "active", createdAt: iso(t - 20 * DAY) },
      { id: "case-087", alias: "C-087", topic: "亲子冲突", counselor: "李咨询师", status: "active", createdAt: iso(t - 6 * DAY) },
    ],

    sessions: [
      {
        id: "ss-042-1",
        caseId: "case-042",
        occurredAt: iso(t - 5 * DAY),
        riskLevel: "high",
        summary: "惊恐发作频率上升，会谈中流露自伤念头，当场共同复盘安全计划。",
        emergencyContact: { name: "周女士", phone: "138****2210", relation: "母亲" },
        nextFollowUpAt: iso(t - 4 * DAY + 2 * HOUR),
        followUpStatus: "reached",
        createdAt: iso(t - 5 * DAY),
      },
      {
        id: "ss-042-2",
        caseId: "case-042",
        occurredAt: iso(t - 2 * DAY),
        riskLevel: "medium",
        summary: "躯体化症状减轻，自伤念头未再出现，继续呼吸放松训练。",
        followUpStatus: "none",
        createdAt: iso(t - 2 * DAY),
      },
      {
        id: "ss-119-1",
        caseId: "case-119",
        occurredAt: iso(t - 3 * DAY),
        riskLevel: "low",
        summary: "能识别沟通中的回避模式，并尝试向伴侣直接表达需求。",
        followUpStatus: "none",
        createdAt: iso(t - 3 * DAY),
      },
      {
        id: "ss-119-2",
        caseId: "case-119",
        occurredAt: iso(t - 1 * DAY),
        riskLevel: "low",
        summary: "冲突后自我安抚成功，情绪平稳，无任何风险信号。",
        followUpStatus: "none",
        createdAt: iso(t - 1 * DAY),
      },
      {
        id: "ss-203-1",
        caseId: "case-203",
        occurredAt: iso(t - 6 * DAY),
        riskLevel: "low",
        summary: "下周边界练习推进顺利，睡眠时长回升。",
        followUpStatus: "none",
        createdAt: iso(t - 6 * DAY),
      },
      {
        id: "ss-087-1",
        caseId: "case-087",
        occurredAt: iso(t - 26 * HOUR),
        riskLevel: "high",
        summary: "与母亲激烈冲突后出现轻生念头，未形成计划，同意启动安全计划。",
        emergencyContact: { name: "陈先生", phone: "139****0873", relation: "父亲" },
        // 首次联系失败后已顺延 24 小时，当前已逾期
        nextFollowUpAt: iso(t - 1 * HOUR),
        followUpStatus: "open",
        createdAt: iso(t - 26 * HOUR),
      },
    ],

    attempts: [
      {
        id: "att-042-1",
        caseId: "case-042",
        sessionId: "ss-042-1",
        attemptedAt: iso(t - 5 * DAY + 2 * HOUR),
        channel: "phone",
        result: "no-answer",
        note: "拨打来访者手机无人接听，顺延 24 小时后再试。",
      },
      {
        id: "att-042-2",
        caseId: "case-042",
        sessionId: "ss-042-1",
        attemptedAt: iso(t - 4 * DAY + 2 * HOUR),
        channel: "phone",
        result: "reached",
        note: "与来访者通话 15 分钟，情绪平稳，确认安全计划可执行。",
      },
      {
        id: "att-087-1",
        caseId: "case-087",
        sessionId: "ss-087-1",
        attemptedAt: iso(t - 25 * HOUR),
        channel: "phone",
        result: "no-answer",
        note: "拨打来访者手机无人接听，已发短信并请父亲留意。",
      },
    ],

    plans: [
      {
        id: "sp-042-1",
        caseId: "case-042",
        version: 1,
        warningSigns: "胸闷心悸加重、连续失眠、出现自伤念头",
        copingStrategies: "4-7-8 呼吸法、54321 接地练习、出门快走 10 分钟",
        supportContacts: "母亲 138****2210；好友小李",
        professionalResources: "心理危机热线 400-161-9995；急诊 120",
        changeNote: "高风险会谈后建立",
        createdAt: iso(t - 5 * DAY),
      },
      {
        id: "sp-119-1",
        caseId: "case-119",
        version: 1,
        warningSigns: "持续情绪低落超过三天、回避所有社交",
        copingStrategies: "情绪日记、与伴侣约定冷静信号",
        supportContacts: "伴侣；姐姐",
        professionalResources: "心理危机热线 400-161-9995",
        changeNote: "初访建立",
        createdAt: iso(t - 30 * DAY),
      },
      {
        id: "sp-087-1",
        caseId: "case-087",
        version: 1,
        warningSigns: "轻生念头、与家人激烈冲突后独处",
        copingStrategies: "离开冲突现场、听固定歌单、给咨询师留言",
        supportContacts: "父亲 139****0873；班主任",
        professionalResources: "心理危机热线 400-161-9995；急诊 120",
        changeNote: "高风险会谈后建立",
        createdAt: iso(t - 26 * HOUR),
      },
    ],

    assessments: [
      { id: "ra-042-1", caseId: "case-042", version: 1, level: "medium", kind: "initial", basisSessionIds: [], createdAt: iso(t - 10 * DAY) },
      { id: "ra-042-2", caseId: "case-042", version: 2, level: "high", kind: "escalation", basisSessionIds: ["ss-042-1"], createdAt: iso(t - 5 * DAY) },
      { id: "ra-119-1", caseId: "case-119", version: 1, level: "medium", kind: "initial", basisSessionIds: [], createdAt: iso(t - 30 * DAY) },
      { id: "ra-203-1", caseId: "case-203", version: 1, level: "low", kind: "initial", basisSessionIds: [], createdAt: iso(t - 20 * DAY) },
      { id: "ra-087-1", caseId: "case-087", version: 1, level: "medium", kind: "initial", basisSessionIds: [], createdAt: iso(t - 6 * DAY) },
      { id: "ra-087-2", caseId: "case-087", version: 2, level: "high", kind: "escalation", basisSessionIds: ["ss-087-1"], createdAt: iso(t - 26 * HOUR) },
    ],
  };
}
