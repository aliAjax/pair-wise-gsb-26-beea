// 资料层：示例台账。时间以"相对当前时刻"生成，
// 保证演示时能看到 待跟进 / 已顺延 / 待督导确认 等真实状态。

import type {
  ContactAttempt,
  CounselingCase,
  Ledger,
  RiskSession,
  RiskVersion,
  SafetyPlan,
} from "./types";

const hours = (n: number, base: number) => new Date(base + n * 3_600_000).toISOString();
const days = (n: number, base: number) => hours(n * 24, base);

export function createSeedLedger(now: number = Date.now()): Ledger {
  const cases: CounselingCase[] = [
    {
      id: "C-042",
      alias: "来访者 042",
      theme: "焦虑",
      mainConcern: "惊恐发作伴入睡困难，近期出现自伤念头",
      emotion: "紧张、恐惧、失控感",
      openedAt: days(-62, now),
      status: "open",
    },
    {
      id: "C-119",
      alias: "来访者 119",
      theme: "亲密关系",
      mainConcern: "关系冲突后的情绪崩溃与自我否定",
      emotion: "近两周趋稳，偶有低落",
      openedAt: days(-124, now),
      status: "open",
    },
    {
      id: "C-203",
      alias: "来访者 203",
      theme: "职业压力",
      mainConcern: "加班失节后连续失眠，工作场合恐慌",
      emotion: "疲惫、警觉性高",
      openedAt: days(-41, now),
      status: "open",
    },
  ];

  const sessions: RiskSession[] = [
    // ---- C-042：高风险，首次联系失败已顺延，等待下次跟进 ----
    {
      id: "s-042-1",
      caseId: "C-042",
      at: days(-10, now),
      counselor: "李咨询师",
      level: "low",
      triggers: "工作汇报前心慌，能自行缓解",
      intervention: "呼吸放松、睡眠卫生",
      nextGoal: "保持睡眠节律，记录发作情境",
      createdAt: days(-10, now),
    },
    {
      id: "s-042-2",
      caseId: "C-042",
      at: hours(-20, now),
      counselor: "李咨询师",
      level: "high",
      triggers: "夜间惊恐发作，哭泣，表达'不想继续了'，有模糊自伤念头",
      intervention: "当场稳定化练习，移除房间内危险物品，约定保持联系",
      nextGoal: "24 小时内电话跟进，评估念头强度与计划",
      emergencyContact: { name: "张某", relation: "母亲", phone: "138-0000-0042" },
      nextFollowupAt: hours(-18, now),
      firstAttempt: {
        id: "a-042-1",
        sessionId: "s-042-2",
        at: hours(-19, now),
        channel: "电话",
        outcome: "failed",
        note: "两次拨打未接听，已留言请回电",
        nextFollowupAt: hours(-2, now),
      },
      createdAt: hours(-19, now),
    },

    // ---- C-119：高风险后连续两次低风险，督导已确认降级（未结案） ----
    {
      id: "s-119-1",
      caseId: "C-119",
      at: days(-30, now),
      counselor: "陈咨询师",
      level: "high",
      triggers: "激烈争吵后表达'消失了就轻松了'，当晚独处",
      intervention: "延长会谈，与同住家人通话陪护，约定次日联系",
      nextGoal: "家人陪护下度过周末，周内复诊",
      emergencyContact: { name: "林某", relation: "姐姐", phone: "139-0000-0119" },
      nextFollowupAt: days(-29, now),
      firstAttempt: {
        id: "a-119-1",
        sessionId: "s-119-1",
        at: days(-29, now),
        channel: "电话",
        outcome: "connected",
        note: "本人接听，情绪平稳，姐姐在家陪护",
      },
      createdAt: days(-30, now),
    },
    {
      id: "s-119-2",
      caseId: "C-119",
      at: days(-14, now),
      counselor: "陈咨询师",
      level: "low",
      triggers: "无自伤念头，能主动与伴侣暂停冲突",
      intervention: "沟通模式分析、边界练习回顾",
      nextGoal: "继续回避模式记录",
      createdAt: days(-14, now),
    },
    {
      id: "s-119-3",
      caseId: "C-119",
      at: days(-3, now),
      counselor: "陈咨询师",
      level: "low",
      triggers: "一周内两次小冲突，均自行调节，睡眠恢复",
      intervention: "巩固安全计划，复盘预警信号识别",
      nextGoal: "月度常规会谈",
      createdAt: days(-3, now),
    },

    // ---- C-203：高风险已接通，完成一次低风险，还需一次 + 督导确认 ----
    {
      id: "s-203-1",
      caseId: "C-203",
      at: days(-8, now),
      counselor: "周咨询师",
      level: "high",
      triggers: "连续加班后在公司出现濒死感，谈及'开车不如撞上去'但无具体计划",
      intervention: "现场 grounding 练习，协助当晚请假，联系同住同事",
      nextGoal: "本周暂停加班，48 小时内跟进评估",
      emergencyContact: { name: "吴某", relation: "同事（同住）", phone: "137-0000-0203" },
      nextFollowupAt: days(-6, now),
      firstAttempt: {
        id: "a-203-1",
        sessionId: "s-203-1",
        at: days(-6, now),
        channel: "即时消息",
        outcome: "connected",
        note: "回复状态尚可，已恢复进食与睡眠，答应按时复诊",
      },
      createdAt: days(-8, now),
    },
    {
      id: "s-203-2",
      caseId: "C-203",
      at: days(-4, now),
      counselor: "周咨询师",
      level: "low",
      triggers: "闯入念头未再出现，已调整工作安排",
      intervention: "认知重评，安全计划第二步演练",
      nextGoal: "下周会谈确认稳定性",
      createdAt: days(-4, now),
    },
  ];

  const attempts: ContactAttempt[] = [
    ...sessions
      .filter((s) => s.firstAttempt)
      .map((s) => s.firstAttempt as ContactAttempt),
    {
      id: "a-042-2",
      sessionId: "s-042-2",
      at: hours(-3, now),
      channel: "紧急联系人",
      outcome: "failed",
      note: "联系其母亲，称来访者在加班未归，答应转告；再次顺延",
      nextFollowupAt: hours(-1, now),
    },
  ];

  const riskVersions: RiskVersion[] = [
    {
      id: "rv-042-1",
      caseId: "C-042",
      version: 1,
      state: "high",
      sourceSessionId: "s-042-2",
      reason: "首次风险评估：低风险（焦虑症状可控）",
      changedBy: "李咨询师",
      at: days(-10, now),
    },
    // 注意：v1 为初评低风险，昨夜高风险会谈后追加 v2
    {
      id: "rv-042-2",
      caseId: "C-042",
      version: 2,
      state: "high",
      sourceSessionId: "s-042-2",
      reason: "夜间惊恐发作伴模糊自伤念头，升为高风险",
      changedBy: "李咨询师",
      at: hours(-20, now),
    },
    {
      id: "rv-119-1",
      caseId: "C-119",
      version: 1,
      state: "high",
      sourceSessionId: "s-119-1",
      reason: "冲突后出现自我消失表述且当晚独处，高风险",
      changedBy: "陈咨询师",
      at: days(-30, now),
    },
    {
      id: "rv-119-2",
      caseId: "C-119",
      version: 2,
      state: "downgraded",
      sourceSessionId: "s-119-3",
      reason: "连续两次低风险会谈（14 天前、3 天前），社会功能恢复，同意降级",
      changedBy: "陈咨询师",
      at: days(-3, now),
      supervisor: "王督导",
      supervisorNote: "已复盘两次会谈记录与安全计划，符合降级条件",
      confirmedAt: days(-2, now),
    },
    {
      id: "rv-203-1",
      caseId: "C-203",
      version: 1,
      state: "high",
      sourceSessionId: "s-203-1",
      reason: "濒死感伴被动伤害联想，高风险",
      changedBy: "周咨询师",
      at: days(-8, now),
    },
  ];

  const safetyPlans: SafetyPlan[] = [
    {
      id: "sp-042-1",
      caseId: "C-042",
      version: 1,
      triggers: "夜间独处、心跳加速、灾难化想法",
      copingSteps: "4-7-8 呼吸 ×5；冷水洗脸；坐到门口开阔处",
      supporters: "母亲张某（138-0000-0042）",
      safeEnvironment: "药物交母亲保管，厨房刀具收纳入柜",
      professionalHelp: "紧急情况拨急救/心理援助热线；工作日联系本机构",
      agreedByClient: true,
      editedBy: "李咨询师",
      createdAt: days(-9, now),
    },
    {
      id: "sp-119-1",
      caseId: "C-119",
      version: 1,
      triggers: "争吵后被抛弃感、独自反复刷消息",
      copingSteps: "暂停对话 20 分钟；写下三个证据反驳极端想法",
      supporters: "姐姐林某；伴侣（冷静期后）",
      safeEnvironment: "不在饮酒后独处，删除购物软件中囤药清单",
      professionalHelp: "热线 + 次日急诊联络方式已写入手机备忘录",
      agreedByClient: true,
      editedBy: "陈咨询师",
      createdAt: days(-28, now),
    },
    {
      id: "sp-119-2",
      caseId: "C-119",
      version: 2,
      triggers: "同上；新增：深夜加班后的疲惫性反刍",
      copingSteps: "暂停对话；证据检验；睡前 1 小时离开工作消息",
      supporters: "姐姐林某；伴侣；好友阿岚",
      safeEnvironment: "同 v1，已随搬家复核药品存放",
      professionalHelp: "恢复常规月度会谈；危机时走绿色通道",
      agreedByClient: true,
      editedBy: "陈咨询师",
      createdAt: days(-4, now),
      note: "降级前复核更新",
    },
    {
      id: "sp-203-1",
      caseId: "C-203",
      version: 1,
      triggers: "连续加班、通勤驾驶时的闯入念头",
      copingSteps: "靠边停车；5-4-3-2-1 grounding；听固定歌单",
      supporters: "同住同事吴某",
      safeEnvironment: "极端疲惫时不自驾，改乘公共交通",
      professionalHelp: "机构紧急联系卡已发放",
      agreedByClient: true,
      editedBy: "周咨询师",
      createdAt: days(-8, now),
    },
  ];

  return { version: 1, cases, sessions, attempts, riskVersions, safetyPlans };
}
