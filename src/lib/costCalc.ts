import type { BoqItem, CostRates, UnitPriceSheet } from "../types";

/** 원가계산서 산출 결과 (단위: 원) */
export interface CostResult {
  // 직접공사비
  directMaterial: number; // 직접재료비
  directLabor: number; // 직접노무비
  directExpense: number; // 직접경비
  directTotal: number; // 직접공사비 계
  // 간접비
  indirectLabor: number; // 간접노무비
  laborTotal: number; // 노무비 계 (직접+간접) — 보험료 산정 기준
  industrialAccident: number; // 산재보험료
  employment: number; // 고용보험료
  healthInsurance: number; // 국민건강보험료
  pension: number; // 국민연금보험료
  longTermCare: number; // 노인장기요양보험료
  safety: number; // 안전관리비
  environment: number; // 환경보전비
  etcExpense: number; // 기타경비
  indirectTotal: number; // 간접비 계
  // 집계
  pureConstruction: number; // 순공사원가
  generalAdmin: number; // 일반관리비
  profit: number; // 이윤
  totalCost: number; // 총원가 (공급가액)
  vat: number; // 부가가치세
  contractAmount: number; // 도급액 (총원가 + 부가세)
}

/** 조달청/국가계약법 예정가격 작성기준에 근거한 기본 요율 (%) */
export const DEFAULT_RATES: CostRates = {
  indirectLabor: 12, // 간접노무비 (직접노무비)
  industrialAccident: 3.7, // 산재보험 (노무비)
  employment: 0.87, // 고용보험 (노무비)
  healthInsurance: 3.545, // 건강보험 (직접노무비)
  pension: 4.5, // 국민연금 (직접노무비)
  longTermCare: 12.95, // 장기요양 (건강보험료)
  safety: 1.97, // 안전관리비 (재료비+직접노무비)
  environment: 0.3, // 환경보전비
  etcExpense: 5.5, // 기타경비 (재료비+노무비)
  generalAdmin: 6, // 일반관리비 (순공사원가, 6% 이하)
  profit: 15, // 이윤 (노무비+경비+일반관리비, 15% 이하)
  vat: 10, // 부가가치세
};

/** 내역서 합계 (재료/노무/경비) */
export function sumBoq(boq: BoqItem[]) {
  return boq.reduce(
    (a, it) => {
      a.material += it.qty * it.matUnit;
      a.labor += it.qty * it.laborUnit;
      a.expense += it.qty * it.expenseUnit;
      return a;
    },
    { material: 0, labor: 0, expense: 0 }
  );
}

/** 일위대가표 1식 합계 단가 (재료/노무/경비/합계) */
export function sumSheet(sheet: UnitPriceSheet) {
  const r = sheet.items.reduce(
    (a, it) => {
      a.material += it.qty * it.matUnit;
      a.labor += it.qty * it.laborUnit;
      a.expense += it.qty * it.expenseUnit;
      return a;
    },
    { material: 0, labor: 0, expense: 0 }
  );
  return { ...r, total: r.material + r.labor + r.expense };
}

const pct = (n: number) => n / 100;

/**
 * 직접공사비(재료/노무/경비)로부터 원가계산서를 산출.
 * 각 간접비 항목의 산정 기준은 CostRates 주석 참조.
 */
export function calcCost(
  directMaterial: number,
  directLabor: number,
  directExpense: number,
  rates: CostRates
): CostResult {
  const directTotal = directMaterial + directLabor + directExpense;

  const indirectLabor = directLabor * pct(rates.indirectLabor);
  const laborTotal = directLabor + indirectLabor;

  const industrialAccident = laborTotal * pct(rates.industrialAccident);
  const employment = laborTotal * pct(rates.employment);
  const healthInsurance = directLabor * pct(rates.healthInsurance);
  const pension = directLabor * pct(rates.pension);
  const longTermCare = healthInsurance * pct(rates.longTermCare);
  const safety = (directMaterial + directLabor) * pct(rates.safety);
  const environment = (directMaterial + directLabor) * pct(rates.environment);
  const etcExpense = (directMaterial + laborTotal) * pct(rates.etcExpense);

  const indirectTotal =
    indirectLabor +
    industrialAccident +
    employment +
    healthInsurance +
    pension +
    longTermCare +
    safety +
    environment +
    etcExpense;

  // 순공사원가 = 재료비 + 노무비(직접+간접) + 경비(직접경비 + 위 간접경비들)
  const expenseTotal =
    directExpense +
    industrialAccident +
    employment +
    healthInsurance +
    pension +
    longTermCare +
    safety +
    environment +
    etcExpense;

  const pureConstruction = directMaterial + laborTotal + expenseTotal;

  const generalAdmin = pureConstruction * pct(rates.generalAdmin);
  const profit = (laborTotal + expenseTotal + generalAdmin) * pct(rates.profit);

  const totalCost = pureConstruction + generalAdmin + profit;
  const vat = totalCost * pct(rates.vat);
  const contractAmount = totalCost + vat;

  return {
    directMaterial,
    directLabor,
    directExpense,
    directTotal,
    indirectLabor,
    laborTotal,
    industrialAccident,
    employment,
    healthInsurance,
    pension,
    longTermCare,
    safety,
    environment,
    etcExpense,
    indirectTotal,
    pureConstruction,
    generalAdmin,
    profit,
    totalCost,
    vat,
    contractAmount,
  };
}
