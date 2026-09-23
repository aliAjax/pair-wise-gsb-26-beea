// 判断层规则验证（纯领域逻辑，不涉及 DOM/存储/React）
// 运行：node test/run-domain-tests.mjs
import assert from "node:assert/strict";
import { createSeedLedger } from "../src/data/seed";
import {
  addAttempt,
  closeCase,
  confirmDowngrade,
  recordSession,
  saveSafetyPlan,
} from "../src/domain/commands";
import {
  attemptsFor,
  effectiveFollowupAt,
  followupStatus,
} from "../src/domain/followup";
import {
  currentRiskState,
  downgradeReadiness,
  trailingLowSessions,
  versionsOf,
} from "../src/domain/risk";
import { closureCheck, plansOf } from "../src/domain/safety";
import type { RuntimeCtx } from "../src/domain/result";

const iso = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const ctx: RuntimeCtx = {
  id: (p: string) => `${p}-test-${Math.random().toString(36).slice(2, 7)}`,
  now: () => iso(0),
};

let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✕ ${name}`);
    console.error((e as Error).stack ?? e);
  }
}

test("高风险会谈必须留下紧急联系人/跟进时刻/一次联系结果", () => {
  let ledger = createSeedLedger();
  const base = {
    at: iso(0),
    counselor: "测试师",
    level: "high" as const,
    triggers: "x",
    intervention: "y",
    nextGoal: "z",
  };
  assert.equal(recordSession(ledger, "C-203", base, ctx).ok, false);
  const withContact = {
    ...base,
    emergencyContact: { name: "急", relation: "父", phone: "110" },
    nextFollowupAt: iso(2),
    firstChannel: "电话" as const,
    firstOutcome: "connected" as const,
    firstNote: "ok",
  };
  const r = recordSession(ledger, "C-203", withContact, ctx);
  assert.equal(r.ok, true);
  if (r.ok) {
    ledger = r.value.ledger;
    const session = ledger.sessions.at(-1)!;
    assert.ok(session.firstAttempt);
    assert.equal(session.firstAttempt.outcome, "connected");
  }
});

test("首次联系失败必须顺延；补记失败只允许向后顺延；尝试逐条保留", () => {
  let ledger = createSeedLedger();
  const input = {
    at: iso(-1),
    counselor: "测试师",
    level: "high" as const,
    triggers: "t",
    intervention: "i",
    nextGoal: "n",
    emergencyContact: { name: "急", relation: "母", phone: "120" },
    nextFollowupAt: iso(1),
    firstChannel: "电话" as const,
    firstOutcome: "failed" as const,
    firstNote: "未接",
    rescheduleAt: iso(3),
  };
  assert.equal(
    recordSession(ledger, "C-203", { ...input, rescheduleAt: iso(0.5) }, ctx).ok,
    false,
    "顺延时间早于原定时间必须拒绝"
  );

  const r = recordSession(ledger, "C-203", input, ctx);
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error("种子高风险会谈应可保存");
  ledger = r.value.ledger;
  const session = ledger.sessions.at(-1)!;
  assert.equal(followupStatus(session, ledger.attempts, iso(0)), "pending");

  assert.equal(
    addAttempt(ledger, session.id, {
      at: iso(1.2),
      channel: "短信",
      outcome: "failed",
      note: "短信无回应",
      rescheduleAt: iso(0.2),
    }, ctx).ok,
    false,
    "补记顺延不能提前"
  );

  const r2 = addAttempt(ledger, session.id, {
    at: iso(1.2),
    channel: "短信",
    outcome: "failed",
    note: "短信无回应",
    rescheduleAt: iso(6),
  }, ctx);
  assert.equal(r2.ok, true);
  if (!r2.ok) throw new Error("合法顺延应通过");
  ledger = r2.value;
  assert.equal(effectiveFollowupAt(session, ledger.attempts), iso(6));
  assert.equal(attemptsFor(session, ledger.attempts).length, 2);

  assert.equal(followupStatus(session, ledger.attempts, iso(6.1)), "overdue");
  const check = closureCheck(ledger, "C-203");
  assert.equal(check.canClose, false);
  assert.ok(check.blockers.join(";").includes("未取得联系"));

  const r3 = addAttempt(ledger, session.id, {
    at: iso(7),
    channel: "紧急联系人",
    outcome: "connected",
    note: "联系上本人",
  }, ctx);
  assert.equal(r3.ok, true);
  if (!r3.ok) throw new Error("接通应通过");
  ledger = r3.value;
  assert.equal(attemptsFor(session, ledger.attempts).length, 3);
  assert.equal(followupStatus(session, ledger.attempts, iso(8)), "reached");
  assert.equal(
    addAttempt(ledger, session.id, {
      at: iso(8),
      channel: "电话",
      outcome: "failed",
      note: "x",
      rescheduleAt: iso(10),
    }, ctx).ok,
    false,
    "已接通后不能继续补记"
  );
});

test("降级须连续两次低风险+督导确认；中间高风险重置；新版本保留旧值", () => {
  let ledger = createSeedLedger();
  assert.equal(trailingLowSessions(ledger, "C-203").length, 1);
  assert.equal(downgradeReadiness(ledger, "C-203").ready, false);
  assert.equal(confirmDowngrade(ledger, "C-203", "王督导", "", ctx).ok, false);

  // 再接一次高风险 → 连续低风险计数清零
  const high = recordSession(
    ledger,
    "C-203",
    {
      at: iso(-30),
      counselor: "周咨询师",
      level: "high",
      triggers: "反复",
      intervention: "x",
      nextGoal: "y",
      emergencyContact: { name: "吴", relation: "同事", phone: "9" },
      nextFollowupAt: iso(-29),
      firstChannel: "电话",
      firstOutcome: "connected",
      firstNote: "ok",
    },
    ctx
  );
  assert.equal(high.ok, true);
  if (!high.ok) throw new Error("高风险会谈保存失败");
  ledger = high.value.ledger;
  assert.equal(trailingLowSessions(ledger, "C-203").length, 0);

  for (const h of [-20, -10]) {
    const r = recordSession(
      ledger,
      "C-203",
      {
        at: iso(h),
        counselor: "周咨询师",
        level: "low",
        triggers: "平稳",
        intervention: "巩固",
        nextGoal: "复诊",
      },
      ctx
    );
    assert.equal(r.ok, true);
    if (r.ok) ledger = r.value.ledger;
  }
  assert.equal(confirmDowngrade(ledger, "C-203", "  ", "", ctx).ok, false);

  const before = versionsOf(ledger, "C-203").length;
  const conf = confirmDowngrade(ledger, "C-203", "王督导", "符合条件", ctx);
  assert.equal(conf.ok, true);
  if (!conf.ok) throw new Error("督导确认应通过");
  ledger = conf.value;
  const versions = versionsOf(ledger, "C-203");
  assert.equal(versions.length, before + 1);
  assert.equal(versions.at(-1)!.state, "downgraded");
  assert.equal(versions.at(-1)!.supervisor, "王督导");
  assert.equal(versions[0].state, "high"); // 旧版本保留
  assert.equal(currentRiskState(ledger, "C-203"), "downgraded");
});

test("种子：C-119 已两低+督导降级；C-042 逾期且不能结案", () => {
  const ledger = createSeedLedger();
  assert.equal(currentRiskState(ledger, "C-119"), "downgraded");
  const v119 = versionsOf(ledger, "C-119");
  assert.equal(v119.length, 2);
  assert.equal(v119[0].state, "high");
  assert.equal(v119[1].state, "downgraded");
  assert.ok(v119[1].confirmedAt);

  assert.equal(closeCase(ledger, "C-119", "  ", "陈咨询师", ctx).ok, false);
  const closed = closeCase(ledger, "C-119", "目标达成，转常规随访", "陈咨询师", ctx);
  assert.equal(closed.ok, true);

  const s042 = ledger.sessions.find((s) => s.id === "s-042-2")!;
  assert.equal(
    followupStatus(s042, ledger.attempts, new Date().toISOString()),
    "overdue"
  );
  assert.equal(closureCheck(ledger, "C-042").canClose, false);
});

test("安全计划保存生成新版本，旧版本保留；需来访者同意", () => {
  let ledger = createSeedLedger();
  const input = {
    triggers: "a",
    copingSteps: "b",
    supporters: "c",
    safeEnvironment: "d",
    professionalHelp: "e",
    agreedByClient: false,
    editedBy: "周咨询师",
  };
  assert.equal(saveSafetyPlan(ledger, "C-203", input, ctx).ok, false);
  const r = saveSafetyPlan(
    ledger,
    "C-203",
    { ...input, agreedByClient: true, note: "复核" },
    ctx
  );
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error("来访者同意后应可保存");
  ledger = r.value;
  const plans = plansOf(ledger, "C-203");
  assert.equal(plans[0].version, 2);
  assert.equal(plans[1].version, 1);
});

test("已结案个案禁止新增会谈与补记尝试", () => {
  let ledger = createSeedLedger();
  const c = closeCase(ledger, "C-119", "理由充分，风险解除", "陈咨询师", ctx);
  assert.equal(c.ok, true);
  if (!c.ok) throw new Error("C-119 应可结案");
  ledger = c.value.ledger;

  assert.equal(
    recordSession(
      ledger,
      "C-119",
      {
        at: iso(0),
        counselor: "陈咨询师",
        level: "low",
        triggers: "x",
        intervention: "y",
        nextGoal: "",
      },
      ctx
    ).ok,
    false
  );
  const s = ledger.sessions.find((x) => x.id === "s-119-1")!;
  assert.equal(
    addAttempt(
      ledger,
      s.id,
      { at: iso(0), channel: "电话", outcome: "failed", note: "x", rescheduleAt: iso(9) },
      ctx
    ).ok,
    false
  );
});

if (failed > 0) {
  console.error(`\n${failed} 项判断层验证失败`);
  process.exit(1);
} else {
  console.log("\n判断层全部 6 组规则验证通过");
}
