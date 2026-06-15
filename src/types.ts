// ===== 공통 =====
export type ModuleKey = "home" | "estimate" | "rc" | "fin";

// ===== 내역/일위대가 (XCOST) =====

/** 내역서 한 줄 (품목) */
export interface BoqItem {
  id: string;
  category: string; // 공종 (예: 토공사, 철근콘크리트공사)
  name: string; // 품명
  spec: string; // 규격
  unit: string; // 단위
  qty: number; // 수량
  matUnit: number; // 재료비 단가
  laborUnit: number; // 노무비 단가
  expenseUnit: number; // 경비 단가
}

/** 일위대가 구성 항목 */
export interface UnitPriceItem {
  id: string;
  name: string; // 품명/규격
  unit: string; // 단위
  qty: number; // 수량 (단위당 소요량)
  matUnit: number; // 재료비 단가
  laborUnit: number; // 노무비 단가
  expenseUnit: number; // 경비 단가
}

/** 일위대가표 (호표) */
export interface UnitPriceSheet {
  id: string;
  title: string; // 명칭
  unit: string; // 산출 단위
  items: UnitPriceItem[];
}

/** 원가계산서 요율 (조달청/국가계약법 기준 기본값, 단위 %) */
export interface CostRates {
  indirectLabor: number; // 간접노무비 (직접노무비 기준)
  industrialAccident: number; // 산재보험료 (노무비 기준)
  employment: number; // 고용보험료 (노무비 기준)
  healthInsurance: number; // 국민건강보험료 (직접노무비 기준)
  pension: number; // 국민연금보험료 (직접노무비 기준)
  longTermCare: number; // 노인장기요양보험료 (건강보험료 기준)
  safety: number; // 안전관리비 (재료비+직접노무비 기준)
  environment: number; // 환경보전비 (재료비+직접노무비+기계경비 기준)
  etcExpense: number; // 기타경비 (재료비+노무비 기준)
  generalAdmin: number; // 일반관리비 (순공사원가 기준)
  profit: number; // 이윤 (노무비+경비+일반관리비 기준)
  vat: number; // 부가가치세
}

export interface EstimateState {
  projectName: string;
  boq: BoqItem[];
  sheets: UnitPriceSheet[];
  rates: CostRates;
}

// ===== RC 골조물량 =====

export type MemberType = "column" | "girder" | "slab" | "wall" | "footing";

export interface RebarLine {
  id: string;
  role: string; // 주근/늑근/배력근 등
  dia: string; // 규격 (예: HD22)
  countPerMember: number; // 부재 1개당 개수 (또는 m당 개수)
  lengthEach: number; // 가닥당 길이 (m)
}

export interface RCMember {
  id: string;
  name: string; // 부재 기호 (예: C1, G1, S1)
  type: MemberType;
  count: number; // 동일 부재 개수
  // 치수 (m). 부재 유형별로 의미가 다름
  b: number; // 폭
  h: number; // 높이/춤
  l: number; // 길이/스팬
  t: number; // 두께 (슬래브/벽)
  area: number; // 면적 (슬래브/벽: 직접 입력 시)
  useArea: boolean; // 면적 직접입력 여부
  rebars: RebarLine[];
}

export interface RCState {
  projectName: string;
  members: RCMember[];
}

// ===== FIN 마감물량 =====

export interface FinishSpec {
  floor: string; // 바닥 마감재
  wall: string; // 벽 마감재
  ceiling: string; // 천장 마감재
  baseboard: string; // 걸레받이
}

export interface Room {
  id: string;
  name: string; // 실명
  count: number; // 동일 실 개수
  length: number; // 가로 (m)
  width: number; // 세로 (m)
  height: number; // 천장고 (m)
  openingArea: number; // 개구부 면적 (창/문, m²) — 벽 면적에서 공제
  baseboardHeight: number; // 걸레받이 높이 (m)
  finish: FinishSpec;
}

export interface FinState {
  projectName: string;
  rooms: Room[];
}
