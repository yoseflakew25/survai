/**
 * Shared skip / branch evaluation for builder preview + public collect.
 * Normalizes snake_case (`question_id`) and camelCase (`questionId`) rules.
 */

export type ConditionalOp = 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'between';

export interface ConditionalRule {
  questionId: string;
  op: ConditionalOp;
  value: string | number | [number, number];
}

export interface ConditionalLogic {
  operator: 'AND' | 'OR';
  rules: ConditionalRule[];
}

export type AnswerValue = string | number | string[] | null | undefined;

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function betweenBounds(
  value: ConditionalRule['value']
): { lo: number; hi: number } | null {
  if (Array.isArray(value) && value.length >= 2) {
    const lo = asNumber(value[0]);
    const hi = asNumber(value[1]);
    if (lo === null || hi === null) return null;
    return { lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
  }
  if (typeof value === 'string' && value.includes(',')) {
    const [a, b] = value.split(',', 2);
    const lo = asNumber(a);
    const hi = asNumber(b);
    if (lo === null || hi === null) return null;
    return { lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
  }
  return null;
}

/** Accept API/DB JSON (snake or camel) and return a typed ConditionalLogic. */
export function normalizeConditionalLogic(
  raw: unknown
): ConditionalLogic | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const operator = obj.operator === 'OR' ? 'OR' : 'AND';
  const rulesRaw = Array.isArray(obj.rules) ? obj.rules : [];
  const rules: ConditionalRule[] = [];
  for (const item of rulesRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const questionId = String(row.question_id ?? row.questionId ?? '').trim();
    if (!questionId) continue;
    const op = String(row.op ?? 'eq') as ConditionalOp;
    rules.push({
      questionId,
      op,
      value: row.value as ConditionalRule['value']
    });
  }
  if (rules.length === 0) return null;
  return { operator, rules };
}

export function ruleMatches(
  rule: ConditionalRule,
  answers: Record<string, AnswerValue>
): boolean {
  const current = answers[rule.questionId];
  if (current === null || current === undefined) return false;

  const equals = (a: unknown, b: unknown): boolean => {
    const an = asNumber(a);
    const bn = asNumber(b);
    if (an !== null && bn !== null) return an === bn;
    return String(a) === String(b);
  };

  switch (rule.op) {
    case 'eq':
      return Array.isArray(current)
        ? current.some((v) => equals(v, rule.value))
        : equals(current, rule.value);
    case 'neq':
      return Array.isArray(current)
        ? !current.some((v) => equals(v, rule.value))
        : !equals(current, rule.value);
    case 'gt': {
      const cur = asNumber(current);
      const rhs = asNumber(rule.value);
      return cur !== null && rhs !== null && cur > rhs;
    }
    case 'lt': {
      const cur = asNumber(current);
      const rhs = asNumber(rule.value);
      return cur !== null && rhs !== null && cur < rhs;
    }
    case 'contains':
      return (
        typeof current === 'string' &&
        current.toLowerCase().includes(String(rule.value).toLowerCase())
      );
    case 'between': {
      const cur = asNumber(current);
      const bounds = betweenBounds(rule.value);
      return cur !== null && bounds !== null && cur >= bounds.lo && cur <= bounds.hi;
    }
    default:
      return false;
  }
}

/** True when the question should be shown (no logic ⇒ always shown). */
export function conditionIsActive(
  logic: ConditionalLogic | null | undefined,
  answers: Record<string, AnswerValue>
): boolean {
  if (!logic || logic.rules.length === 0) return true;
  const results = logic.rules.map((r) => ruleMatches(r, answers));
  return logic.operator === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);
}

export function isQuestionVisible(
  conditionalLogic: unknown,
  answers: Record<string, AnswerValue>
): boolean {
  return conditionIsActive(normalizeConditionalLogic(conditionalLogic), answers);
}
