import type { MemberType, RCMember } from "../types";
import { unitWeight } from "./rebar";

export interface MemberResult {
  concrete: number; // 콘크리트 (m³)
  formwork: number; // 거푸집 (m²)
  rebar: number; // 철근 (kg)
}

export const MEMBER_LABELS: Record<MemberType, string> = {
  column: "기둥 (Column)",
  girder: "보 (Girder)",
  slab: "슬래브 (Slab)",
  wall: "벽 (Wall)",
  footing: "기초 (Footing)",
};

/**
 * 부재 1개 + 개수 기준 물량 산출.
 * 치수 단위: m. 결과: 콘크리트 m³, 거푸집 m², 철근 kg.
 *
 * 단면/거푸집 산정 규칙 (일반 적산 관행, 단순화):
 *  - 기둥:  콘크리트 = b·h·높이(l)        거푸집 = 둘레(2(b+h))·높이
 *  - 보:    콘크리트 = b·h·길이(l)        거푸집 = (양측면 2h + 바닥 b)·길이
 *  - 슬래브: 콘크리트 = 면적·두께(t)       거푸집 = 면적 (밑면)
 *  - 벽:    콘크리트 = 면적·두께(t)        거푸집 = 면적·2 (양면)
 *  - 기초:  콘크리트 = b·h·길이(l)        거푸집 = 둘레(2(b+l))·높이(h)
 */
export function calcMember(m: RCMember): MemberResult {
  const n = Math.max(0, m.count || 0);
  let concrete = 0;
  let formwork = 0;

  const area = m.useArea ? m.area : m.b * m.l; // 슬래브/벽 면적

  switch (m.type) {
    case "column":
      concrete = m.b * m.h * m.l;
      formwork = 2 * (m.b + m.h) * m.l;
      break;
    case "girder":
      concrete = m.b * m.h * m.l;
      formwork = (2 * m.h + m.b) * m.l;
      break;
    case "slab":
      concrete = area * m.t;
      formwork = area;
      break;
    case "wall":
      concrete = area * m.t;
      formwork = area * 2;
      break;
    case "footing":
      concrete = m.b * m.h * m.l;
      formwork = 2 * (m.b + m.l) * m.h;
      break;
  }

  // 철근: 각 라인 = 개수 × 가닥길이 × 단위중량
  let rebarKg = 0;
  for (const r of m.rebars) {
    rebarKg += (r.countPerMember || 0) * (r.lengthEach || 0) * unitWeight(r.dia);
  }

  return {
    concrete: concrete * n,
    formwork: formwork * n,
    rebar: rebarKg * n,
  };
}

export function calcTotals(members: RCMember[]): MemberResult {
  return members.reduce<MemberResult>(
    (acc, m) => {
      const r = calcMember(m);
      acc.concrete += r.concrete;
      acc.formwork += r.formwork;
      acc.rebar += r.rebar;
      return acc;
    },
    { concrete: 0, formwork: 0, rebar: 0 }
  );
}
