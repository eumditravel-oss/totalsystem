// ============================================================
// RC 골조물량 산출 엔진 (독자 설계)
//
// 구성:
//  - 부재 분류(Category)
//  - 도형(Shape): 변수(param) + 보조산식(derived) + 물량규칙(rule)
//  - 부재(Member): 도형 참조 + 변수값
//  - 설정(Settings): 정착/이음 룩업표, 철근 단위중량, 할증
//  - 산출(compute): 부재별 콘크리트/거푸집/잡석/철근 물량
//  - 집계(aggregate): 부재분류 × 규격 매트릭스
// ============================================================

import { tryEval, type Scope } from "./formula";

export type Category =
  | "foundation"
  | "column"
  | "beam"
  | "slab"
  | "wall"
  | "stair"
  | "etc";

export const CATEGORY_LABELS: Record<Category, string> = {
  foundation: "기초",
  column: "기둥",
  beam: "보",
  slab: "슬래브",
  wall: "벽체",
  stair: "계단",
  etc: "기타",
};

export const CATEGORY_ORDER: Category[] = [
  "foundation",
  "column",
  "beam",
  "slab",
  "wall",
  "stair",
  "etc",
];

// ---- 도형 정의 ----

export type ParamKind = "dim" | "count" | "spacing" | "bar" | "num";

export interface ShapeParam {
  id: string; // 수식에서 참조하는 기호 (예: W, L, H)
  label: string; // 표시명
  kind: ParamKind;
  unit?: string;
  def: number | string;
}

export interface Derived {
  id: string; // 보조 변수 기호
  label: string;
  expr: string;
}

export type RebarPos = "top" | "general" | "compression" | "none";

export const REBAR_POS_LABELS: Record<RebarPos, string> = {
  top: "상부인장",
  general: "일반인장",
  compression: "압축",
  none: "정착없음",
};

export type RuleKind = "concrete" | "formwork" | "lean" | "rubble" | "rebar";

export const RULE_KIND_LABELS: Record<RuleKind, string> = {
  concrete: "콘크리트(m³)",
  formwork: "거푸집(m²)",
  lean: "버림(m³)",
  rubble: "잡석(m³)",
  rebar: "철근(kg)",
};

export interface QtyRule {
  id: string;
  label: string;
  kind: RuleKind;
  // 콘크리트/거푸집/버림/잡석:
  expr?: string; // 부재 1개당 물량 (개수는 엔진이 곱함)
  // 철근:
  barParam?: string; // 규격을 담은 param id
  countExpr?: string; // 가닥수
  lengthExpr?: string; // 순길이(m)
  pos?: RebarPos; // 정착 위치
  lap?: boolean; // 이음 가산
  hook?: boolean; // 후크 가산(양단)
}

export interface Shape {
  id: string;
  name: string;
  category: Category;
  params: ShapeParam[];
  derived: Derived[];
  rules: QtyRule[];
}

// ---- 부재 인스턴스 ----

export interface Member {
  id: string;
  name: string;
  shapeId: string;
  count: number;
  strength: string; // 콘크리트 강도/종류 (분석표 콘크리트 열)
  values: Record<string, number | string>;
}

// ---- 설정 ----

export interface AnchorEntry {
  top: number;
  general: number;
}

export interface Settings {
  strengths: string[]; // 콘크리트 강도/종류 열
  barSizes: string[]; // 철근 규격
  unitWeight: Record<string, number>; // kg/m
  lapFactor: number; // 이음 = 정착 × factor
  // 정착(mm): [강도][규격] = {상부, 일반}
  anchorBase: Record<string, Record<string, AnchorEntry>>; // 기초 외 부재
  anchorFoundation: Record<string, Record<string, AnchorEntry>>; // 기초
  compression: Record<string, Record<string, number>>; // [강도][규격]
  hook: Record<string, Record<string, number>>; // [강도][규격]
  waste: { concrete: number; formwork: number; rubble: number; rebar: number }; // 할증 %
}

export interface RcState {
  projectName: string;
  shapes: Shape[];
  members: Member[];
  settings: Settings;
}

// ============================================================
// 기본 데이터 (편집 가능한 초기값)
// ============================================================

export const UNIT_WEIGHT: Record<string, number> = {
  HD10: 0.56,
  HD13: 0.995,
  HD16: 1.56,
  HD19: 2.25,
  HD22: 3.04,
  HD25: 3.98,
  HD29: 5.04,
  HD32: 6.23,
};

export const BAR_SIZES = Object.keys(UNIT_WEIGHT);

// 정착 기준값(강도 30MPa, mm) — 일반적 설계기준을 바탕으로 한 편집 가능 초기값
const ANCHOR30_BASE: Record<string, AnchorEntry> = {
  HD10: { top: 300, general: 300 },
  HD13: { top: 430, general: 430 },
  HD16: { top: 760, general: 760 },
  HD19: { top: 1030, general: 1030 },
  HD22: { top: 1540, general: 1540 },
  HD25: { top: 1760, general: 1760 },
  HD29: { top: 1990, general: 1990 },
  HD32: { top: 2210, general: 2210 },
};
const ANCHOR30_FND: Record<string, AnchorEntry> = {
  HD10: { top: 350, general: 300 },
  HD13: { top: 460, general: 360 },
  HD16: { top: 690, general: 530 },
  HD19: { top: 830, general: 640 },
  HD22: { top: 1340, general: 1030 },
  HD25: { top: 1750, general: 1350 },
  HD29: { top: 2220, general: 1710 },
  HD32: { top: 2740, general: 2110 },
};
const COMP30: Record<string, number> = {
  HD10: 230, HD13: 310, HD16: 460, HD19: 560,
  HD22: 650, HD25: 740, HD29: 830, HD32: 920,
};
const HOOK30: Record<string, number> = {
  HD10: 150, HD13: 190, HD16: 240, HD19: 290,
  HD22: 340, HD25: 390, HD29: 460, HD32: 510,
};

// 강도별 배율 (정착길이 ∝ 1/√fck 근사) — 초기값 생성용
const STRENGTH_SCALE: Record<string, number> = {
  "30": 1.0,
  "27": 1.054,
  "24": 1.118,
  "21": 1.195,
};

const round10 = (n: number) => Math.round(n / 10) * 10;

function scaleEntry(base: Record<string, AnchorEntry>, f: number): Record<string, AnchorEntry> {
  const out: Record<string, AnchorEntry> = {};
  for (const k of Object.keys(base)) {
    out[k] = { top: round10(base[k].top * f), general: round10(base[k].general * f) };
  }
  return out;
}
function scaleFlat(base: Record<string, number>, f: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(base)) out[k] = round10(base[k] * f);
  return out;
}

export function defaultSettings(): Settings {
  const strengths = ["30", "27", "21"];
  const anchorBase: Settings["anchorBase"] = {};
  const anchorFoundation: Settings["anchorFoundation"] = {};
  const compression: Settings["compression"] = {};
  const hook: Settings["hook"] = {};
  for (const s of strengths) {
    const f = STRENGTH_SCALE[s] ?? 1;
    anchorBase[s] = scaleEntry(ANCHOR30_BASE, f);
    anchorFoundation[s] = scaleEntry(ANCHOR30_FND, f);
    compression[s] = scaleFlat(COMP30, f);
    hook[s] = scaleFlat(HOOK30, f);
  }
  return {
    strengths,
    barSizes: [...BAR_SIZES],
    unitWeight: { ...UNIT_WEIGHT },
    lapFactor: 1.3,
    anchorBase,
    anchorFoundation,
    compression,
    hook,
    waste: { concrete: 1, formwork: 0, rubble: 3, rebar: 3 },
  };
}

/** 정착길이(m) 조회 */
export function lookupAnchor(
  st: Settings,
  strength: string,
  bar: string,
  category: Category,
  pos: RebarPos
): number {
  if (pos === "none") return 0;
  if (pos === "compression") {
    return (st.compression[strength]?.[bar] ?? 0) / 1000;
  }
  const table = category === "foundation" ? st.anchorFoundation : st.anchorBase;
  const e = table[strength]?.[bar];
  if (!e) return 0;
  return (pos === "top" ? e.top : e.general) / 1000;
}

/** 이음길이(m) = 일반정착 × lapFactor */
export function lookupLap(st: Settings, strength: string, bar: string, category: Category): number {
  const base = lookupAnchor(st, strength, bar, category, "general");
  return base * st.lapFactor;
}

/** 후크길이(m) */
export function lookupHook(st: Settings, strength: string, bar: string): number {
  return (st.hook[strength]?.[bar] ?? 0) / 1000;
}

// ============================================================
// 산출
// ============================================================

export interface RebarQty {
  bar: string;
  kg: number;
}

export interface MemberResult {
  id: string;
  name: string;
  category: Category;
  strength: string;
  concrete: number; // m³
  formwork: number; // m²
  lean: number; // m³
  rubble: number; // m³
  rebar: RebarQty[]; // 규격별 kg
  rebarTotal: number; // kg
  errors: string[];
}

function buildScope(shape: Shape, member: Member): { scope: Scope; errors: string[] } {
  const scope: Scope = {};
  const errors: string[] = [];
  // 변수값 (숫자형만 scope에 투입)
  for (const p of shape.params) {
    if (p.kind === "bar") continue; // 문자열 규격은 별도 처리
    const raw = member.values[p.id];
    const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? p.def));
    scope[p.id] = isFinite(n) ? n : 0;
  }
  scope["N"] = member.count; // 개수도 참조 가능
  // 보조산식 순차 평가
  for (const d of shape.derived) {
    const r = tryEval(d.expr, scope);
    if (r.error) errors.push(`보조산식 ${d.id}: ${r.error}`);
    scope[d.id] = r.value;
  }
  return { scope, errors };
}

export function computeMember(shape: Shape, member: Member, st: Settings): MemberResult {
  const { scope, errors } = buildScope(shape, member);
  const res: MemberResult = {
    id: member.id,
    name: member.name,
    category: shape.category,
    strength: member.strength,
    concrete: 0,
    formwork: 0,
    lean: 0,
    rubble: 0,
    rebar: [],
    rebarTotal: 0,
    errors,
  };
  const rebarMap = new Map<string, number>();
  const n = Math.max(0, member.count || 0);

  for (const rule of shape.rules) {
    if (rule.kind === "rebar") {
      const bar = String(member.values[rule.barParam ?? ""] ?? "");
      if (!bar) {
        res.errors.push(`${rule.label}: 철근 규격 미지정`);
        continue;
      }
      const cntR = tryEval(rule.countExpr ?? "0", scope);
      const lenR = tryEval(rule.lengthExpr ?? "0", scope);
      if (cntR.error) res.errors.push(`${rule.label}(본수): ${cntR.error}`);
      if (lenR.error) res.errors.push(`${rule.label}(길이): ${lenR.error}`);
      const anchor = lookupAnchor(st, member.strength, bar, shape.category, rule.pos ?? "none");
      const lap = rule.lap ? lookupLap(st, member.strength, bar, shape.category) : 0;
      const hook = rule.hook ? 2 * lookupHook(st, member.strength, bar) : 0;
      const totalLen = Math.max(0, lenR.value + anchor + lap + hook);
      const uw = st.unitWeight[bar] ?? 0;
      const kg = cntR.value * totalLen * uw * n;
      rebarMap.set(bar, (rebarMap.get(bar) ?? 0) + kg);
      res.rebarTotal += kg;
    } else {
      const r = tryEval(rule.expr ?? "0", scope);
      if (r.error) res.errors.push(`${rule.label}: ${r.error}`);
      const val = r.value * n;
      if (rule.kind === "concrete") res.concrete += val;
      else if (rule.kind === "formwork") res.formwork += val;
      else if (rule.kind === "lean") res.lean += val;
      else if (rule.kind === "rubble") res.rubble += val;
    }
  }
  res.rebar = Array.from(rebarMap.entries())
    .map(([bar, kg]) => ({ bar, kg }))
    .sort((a, b) => st.barSizes.indexOf(a.bar) - st.barSizes.indexOf(b.bar));
  return res;
}

export function computeAll(state: RcState): MemberResult[] {
  const byId = new Map(state.shapes.map((s) => [s.id, s]));
  const out: MemberResult[] = [];
  for (const m of state.members) {
    const shape = byId.get(m.shapeId);
    if (!shape) continue;
    out.push(computeMember(shape, m, state.settings));
  }
  return out;
}

// ============================================================
// 집계 (부재분류 × 규격 매트릭스)
// ============================================================

export interface Matrix {
  cols: string[]; // 열 (강도 또는 규격)
  rows: { category: Category; cells: Record<string, number> }[];
  subtotal: Record<string, number>;
  total: Record<string, number>; // 할증 적용
  wastePct: number;
}

function emptyCells(cols: string[]): Record<string, number> {
  const o: Record<string, number> = {};
  for (const c of cols) o[c] = 0;
  return o;
}

/** 콘크리트 집계: 열=강도 */
export function concreteMatrix(results: MemberResult[], st: Settings): Matrix {
  const cols = st.strengths;
  return buildMatrix(cols, st.waste.concrete, results, (r, cells) => {
    cells[r.strength] = (cells[r.strength] ?? 0) + r.concrete;
  });
}

/** 철근 집계: 열=규격 */
export function rebarMatrix(results: MemberResult[], st: Settings): Matrix {
  const cols = st.barSizes;
  return buildMatrix(cols, st.waste.rebar, results, (r, cells) => {
    for (const rb of r.rebar) cells[rb.bar] = (cells[rb.bar] ?? 0) + rb.kg;
  });
}

/** 거푸집/버림/잡석 집계: 단일 열 */
export function singleMatrix(
  results: MemberResult[],
  st: Settings,
  pick: (r: MemberResult) => number,
  colLabel: string,
  wastePct: number
): Matrix {
  return buildMatrix([colLabel], wastePct, results, (r, cells) => {
    cells[colLabel] = (cells[colLabel] ?? 0) + pick(r);
  });
}

function buildMatrix(
  cols: string[],
  wastePct: number,
  results: MemberResult[],
  add: (r: MemberResult, cells: Record<string, number>) => void
): Matrix {
  const rowMap = new Map<Category, Record<string, number>>();
  for (const r of results) {
    if (!rowMap.has(r.category)) rowMap.set(r.category, emptyCells(cols));
    add(r, rowMap.get(r.category)!);
  }
  const rows = CATEGORY_ORDER.filter((c) => rowMap.has(c)).map((category) => ({
    category,
    cells: rowMap.get(category)!,
  }));
  const subtotal = emptyCells(cols);
  for (const row of rows) for (const c of cols) subtotal[c] += row.cells[c] ?? 0;
  const total = emptyCells(cols);
  for (const c of cols) total[c] = subtotal[c] * (1 + wastePct / 100);
  return { cols, rows, subtotal, total, wastePct };
}
