// 页面层：展示辅助函数（不含业务判断）

import type {
  FollowupStatus,
  RiskState,
} from "../data/types";

/** ISO 时间 → datetime-local 控件值（本地时区） */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** datetime-local 控件值 → ISO；空值返回空串 */
export function fromLocalInput(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function nowLocalInput(offsetMinutes = 0): string {
  return toLocalInput(new Date(Date.now() + offsetMinutes * 60_000).toISOString());
}

/** ISO → "2026/09/23 14:05" */
export function fmtDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function fmtDate(iso: string | undefined): string {
  return fmtDateTime(iso).slice(0, 10);
}

export const riskStateLabel: Record<RiskState, string> = {
  high: "高风险",
  downgraded: "已降级（督导确认）",
};

export const followupStatusLabel: Record<FollowupStatus, string> = {
  reached: "已接通 · 跟进完成",
  pending: "待跟进",
  overdue: "已逾期未接通",
};

export function relativeFromNow(iso: string, nowIso: string): string {
  const diffMs = Date.parse(iso) - Date.parse(nowIso);
  const abs = Math.abs(diffMs);
  const hour = 3_600_000;
  const day = 24 * hour;
  let text: string;
  if (abs >= day) text = `${Math.round(abs / day)} 天`;
  else if (abs >= hour) text = `${Math.round(abs / hour)} 小时`;
  else text = `${Math.max(1, Math.round(abs / 60_000))} 分钟`;
  return diffMs >= 0 ? `${text}后` : `${text}前`;
}
