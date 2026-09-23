// 页面层辅助：文案与时间格式化，不承载业务判断。

import type { ContactChannel, ContactResult, RiskLevel } from "../data/types";

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

export const RISK_CLASS: Record<RiskLevel, string> = {
  low: "risk-low",
  medium: "risk-medium",
  high: "risk-high",
};

export const CHANNEL_LABEL: Record<ContactChannel, string> = {
  phone: "电话",
  sms: "短信",
  wechat: "微信",
  email: "邮件",
};

export const RESULT_LABEL: Record<ContactResult, string> = {
  reached: "已接通",
  "no-answer": "无人接听",
  voicemail: "已留言",
  refused: "对方拒绝",
};

export const RESULT_CLASS: Record<ContactResult, string> = {
  reached: "result-reached",
  "no-answer": "result-failed",
  voicemail: "result-failed",
  refused: "result-failed",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO -> "9月22日 14:30" */
export function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO -> datetime-local 输入框值 */
export function toInputValue(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export function isOverdue(iso: string | undefined, now: Date): boolean {
  return !!iso && new Date(iso).getTime() <= now.getTime();
}

/** 跟进时刻的相对提示，如 "已逾期 2 小时"、"3 小时后" */
export function followUpHint(iso: string | undefined, now: Date): string {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const hours = Math.round(abs / 3600_000);
  const days = Math.round(abs / 86400_000);
  const span = hours < 24 ? `${hours} 小时` : `${days} 天`;
  return diff <= 0 ? `已逾期 ${span}` : `${span}后跟进`;
}
