// 이형철근 단위중량 (kg/m) — KS D 3504 기준
export const REBAR_UNIT_WEIGHT: Record<string, number> = {
  HD10: 0.56,
  HD13: 0.995,
  HD16: 1.56,
  HD19: 2.25,
  HD22: 3.04,
  HD25: 3.98,
  HD29: 5.04,
  HD32: 6.23,
  HD35: 7.51,
  HD38: 8.95,
  // 원형철근 호환 표기
  D10: 0.56,
  D13: 0.995,
  D16: 1.56,
  D19: 2.25,
  D22: 3.04,
  D25: 3.98,
  D29: 5.04,
  D32: 6.23,
};

export const REBAR_DIAS = ["HD10", "HD13", "HD16", "HD19", "HD22", "HD25", "HD29", "HD32", "HD35", "HD38"];

/** 규격 문자열 → 단위중량(kg/m). 미등록 규격은 0 */
export function unitWeight(dia: string): number {
  return REBAR_UNIT_WEIGHT[dia.toUpperCase().trim()] ?? 0;
}
