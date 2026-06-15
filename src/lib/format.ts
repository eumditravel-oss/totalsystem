// 숫자/통화 포맷 유틸

/** 원 단위 정수 표시 (천단위 콤마) */
export function won(n: number): string {
  if (!isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ko-KR");
}

/** 소수 표시 (기본 3자리, 불필요한 0 제거) */
export function num(n: number, digits = 3): string {
  if (!isFinite(n)) return "0";
  return Number(n.toFixed(digits)).toLocaleString("ko-KR", {
    maximumFractionDigits: digits,
  });
}

/** 입력 문자열 → 숫자 (빈값/오류는 0) */
export function toNum(v: string | number): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return isFinite(n) ? n : 0;
}
