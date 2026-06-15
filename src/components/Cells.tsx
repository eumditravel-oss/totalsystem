import { toNum } from "../lib/format";

/** 숫자 입력 셀 (테이블 내) */
export function NumCell({
  value,
  onChange,
  step,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step ?? "any"}
      onChange={(e) => onChange(toNum(e.target.value))}
    />
  );
}

/** 텍스트 입력 셀 (좌측 정렬) */
export function TextCell({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="l"
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
