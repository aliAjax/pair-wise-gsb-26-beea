// 判断层：统一返回结构与基础校验。所有命令只返回结果，不碰存储与 UI。

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(error: string): Result<T> {
  return { ok: false, error };
}

export function isBlank(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

export function isValidIso(value: string | undefined | null): value is string {
  return !!value && !Number.isNaN(Date.parse(value));
}

/** 生成新 ID 的依赖（可在测试中替换为确定性实现） */
export interface RuntimeCtx {
  id: (prefix: string) => string;
  now: () => string;
}

export function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export const defaultCtx: RuntimeCtx = {
  id: createId,
  now: () => new Date().toISOString(),
};
