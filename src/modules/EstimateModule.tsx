import { useEffect, useMemo, useState } from "react";
import type {
  BoqItem,
  CostRates,
  EstimateState,
  UnitPriceItem,
  UnitPriceSheet,
} from "../types";
import { load, save, uid } from "../lib/storage";
import { won } from "../lib/format";
import { NumCell, TextCell } from "../components/Cells";
import {
  DEFAULT_RATES,
  calcCost,
  sumBoq,
  sumSheet,
} from "../lib/costCalc";

const KEY = "kcost.estimate.v1";

function blankItem(): BoqItem {
  return {
    id: uid(),
    category: "",
    name: "",
    spec: "",
    unit: "",
    qty: 0,
    matUnit: 0,
    laborUnit: 0,
    expenseUnit: 0,
  };
}

function blankSheetItem(): UnitPriceItem {
  return { id: uid(), name: "", unit: "", qty: 0, matUnit: 0, laborUnit: 0, expenseUnit: 0 };
}

const SAMPLE: EstimateState = {
  projectName: "○○ 신축공사",
  boq: [
    {
      id: uid(),
      category: "철근콘크리트공사",
      name: "레미콘 타설",
      spec: "25-24-150",
      unit: "m³",
      qty: 120,
      matUnit: 78000,
      laborUnit: 12000,
      expenseUnit: 1500,
    },
    {
      id: uid(),
      category: "철근콘크리트공사",
      name: "철근 가공조립",
      spec: "SD400 HD22",
      unit: "ton",
      qty: 9.5,
      matUnit: 980000,
      laborUnit: 350000,
      expenseUnit: 15000,
    },
    {
      id: uid(),
      category: "철근콘크리트공사",
      name: "유로폼 거푸집",
      spec: "3회 전용",
      unit: "m²",
      qty: 640,
      matUnit: 8500,
      laborUnit: 14500,
      expenseUnit: 800,
    },
  ],
  sheets: [
    {
      id: uid(),
      title: "콘크리트 타설 (펌프카)",
      unit: "m³",
      items: [
        { id: uid(), name: "레미콘 25-24-150", unit: "m³", qty: 1.0, matUnit: 78000, laborUnit: 0, expenseUnit: 0 },
        { id: uid(), name: "콘크리트공", unit: "인", qty: 0.1, matUnit: 0, laborUnit: 160000, expenseUnit: 0 },
        { id: uid(), name: "펌프카 임대", unit: "대", qty: 0.02, matUnit: 0, laborUnit: 0, expenseUnit: 600000 },
      ],
    },
  ],
  rates: DEFAULT_RATES,
};

type Tab = "boq" | "sheet" | "cost";

export default function EstimateModule() {
  const [state, setState] = useState<EstimateState>(() =>
    load<EstimateState>(KEY, SAMPLE)
  );
  const [tab, setTab] = useState<Tab>("boq");

  useEffect(() => save(KEY, state), [state]);

  const patch = (p: Partial<EstimateState>) => setState((s) => ({ ...s, ...p }));

  return (
    <div>
      <div className="module-head">
        <h2>통합내역 · 일위대가</h2>
        <span className="badge">XCOST</span>
        <div className="spacer" style={{ flex: 1 }} />
        <input
          style={{ minWidth: 220 }}
          value={state.projectName}
          onChange={(e) => patch({ projectName: e.target.value })}
          placeholder="공사명"
        />
        <button
          className="btn ghost sm danger"
          onClick={() => {
            if (confirm("샘플 데이터로 초기화할까요?")) setState(SAMPLE);
          }}
        >
          초기화
        </button>
      </div>

      <div className="tabs">
        <button className={tab === "boq" ? "active" : ""} onClick={() => setTab("boq")}>
          내역서
        </button>
        <button className={tab === "sheet" ? "active" : ""} onClick={() => setTab("sheet")}>
          일위대가
        </button>
        <button className={tab === "cost" ? "active" : ""} onClick={() => setTab("cost")}>
          원가계산서
        </button>
      </div>

      {tab === "boq" && <BoqTab state={state} patch={patch} />}
      {tab === "sheet" && <SheetTab state={state} patch={patch} />}
      {tab === "cost" && <CostTab state={state} patch={patch} />}
    </div>
  );
}

/* ===================== 내역서 ===================== */
function BoqTab({
  state,
  patch,
}: {
  state: EstimateState;
  patch: (p: Partial<EstimateState>) => void;
}) {
  const setItem = (id: string, p: Partial<BoqItem>) =>
    patch({ boq: state.boq.map((it) => (it.id === id ? { ...it, ...p } : it)) });
  const add = () => patch({ boq: [...state.boq, blankItem()] });
  const del = (id: string) => patch({ boq: state.boq.filter((it) => it.id !== id) });

  const total = useMemo(() => sumBoq(state.boq), [state.boq]);
  const grand = total.material + total.labor + total.expense;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h4 style={{ margin: 0 }}>공사 내역서</h4>
        <button className="btn primary sm" onClick={add}>+ 행 추가</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th className="l">공종</th>
              <th className="l">품명</th>
              <th className="l">규격</th>
              <th className="c">단위</th>
              <th>수량</th>
              <th>재료비단가</th>
              <th>노무비단가</th>
              <th>경비단가</th>
              <th>합계금액</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {state.boq.map((it) => {
              const amt = it.qty * (it.matUnit + it.laborUnit + it.expenseUnit);
              return (
                <tr key={it.id}>
                  <td className="l">
                    <TextCell value={it.category} onChange={(v) => setItem(it.id, { category: v })} placeholder="공종" />
                  </td>
                  <td className="l">
                    <TextCell value={it.name} onChange={(v) => setItem(it.id, { name: v })} placeholder="품명" />
                  </td>
                  <td className="l">
                    <TextCell value={it.spec} onChange={(v) => setItem(it.id, { spec: v })} placeholder="규격" />
                  </td>
                  <td className="c" style={{ width: 60 }}>
                    <TextCell value={it.unit} onChange={(v) => setItem(it.id, { unit: v })} placeholder="단위" />
                  </td>
                  <td style={{ width: 80 }}>
                    <NumCell value={it.qty} onChange={(v) => setItem(it.id, { qty: v })} />
                  </td>
                  <td style={{ width: 100 }}>
                    <NumCell value={it.matUnit} onChange={(v) => setItem(it.id, { matUnit: v })} />
                  </td>
                  <td style={{ width: 100 }}>
                    <NumCell value={it.laborUnit} onChange={(v) => setItem(it.id, { laborUnit: v })} />
                  </td>
                  <td style={{ width: 100 }}>
                    <NumCell value={it.expenseUnit} onChange={(v) => setItem(it.id, { expenseUnit: v })} />
                  </td>
                  <td className="num">{won(amt)}</td>
                  <td className="c">
                    <button className="btn ghost sm danger" onClick={() => del(it.id)}>✕</button>
                  </td>
                </tr>
              );
            })}
            {state.boq.length === 0 && (
              <tr>
                <td colSpan={10} className="empty">행을 추가하세요.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="l">합계</td>
              <td className="num">{won(total.material)}</td>
              <td className="num">{won(total.labor)}</td>
              <td className="num">{won(total.expense)}</td>
              <td className="num">{won(grand)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        합계금액 = 수량 × (재료비단가 + 노무비단가 + 경비단가). 재료·노무·경비 합계는 원가계산서 탭의 직접공사비로 자동 반영됩니다.
      </p>
    </div>
  );
}

/* ===================== 일위대가 ===================== */
function SheetTab({
  state,
  patch,
}: {
  state: EstimateState;
  patch: (p: Partial<EstimateState>) => void;
}) {
  const setSheets = (sheets: UnitPriceSheet[]) => patch({ sheets });
  const addSheet = () =>
    setSheets([...state.sheets, { id: uid(), title: "신규 일위대가", unit: "식", items: [blankSheetItem()] }]);
  const delSheet = (id: string) => setSheets(state.sheets.filter((s) => s.id !== id));
  const updSheet = (id: string, p: Partial<UnitPriceSheet>) =>
    setSheets(state.sheets.map((s) => (s.id === id ? { ...s, ...p } : s)));

  return (
    <div>
      <div className="row" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn primary sm" onClick={addSheet}>+ 일위대가 호표 추가</button>
      </div>
      {state.sheets.map((sheet, i) => {
        const sum = sumSheet(sheet);
        const setItem = (id: string, p: Partial<UnitPriceItem>) =>
          updSheet(sheet.id, { items: sheet.items.map((it) => (it.id === id ? { ...it, ...p } : it)) });
        const addItem = () => updSheet(sheet.id, { items: [...sheet.items, blankSheetItem()] });
        const delItem = (id: string) => updSheet(sheet.id, { items: sheet.items.filter((it) => it.id !== id) });
        return (
          <div className="card" key={sheet.id}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div className="row">
                <span className="badge">호표 {i + 1}</span>
                <input
                  style={{ minWidth: 240 }}
                  value={sheet.title}
                  onChange={(e) => updSheet(sheet.id, { title: e.target.value })}
                  placeholder="명칭"
                />
                <input
                  style={{ width: 80 }}
                  value={sheet.unit}
                  onChange={(e) => updSheet(sheet.id, { unit: e.target.value })}
                  placeholder="단위"
                />
              </div>
              <div className="row">
                <button className="btn sm" onClick={addItem}>+ 구성</button>
                <button className="btn ghost sm danger" onClick={() => delSheet(sheet.id)}>호표 삭제</button>
              </div>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="l">품명 · 규격</th>
                    <th className="c">단위</th>
                    <th>소요량</th>
                    <th>재료비</th>
                    <th>노무비</th>
                    <th>경비</th>
                    <th>합계</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.items.map((it) => {
                    const line = it.qty * (it.matUnit + it.laborUnit + it.expenseUnit);
                    return (
                      <tr key={it.id}>
                        <td className="l">
                          <TextCell value={it.name} onChange={(v) => setItem(it.id, { name: v })} placeholder="품명/규격" />
                        </td>
                        <td className="c" style={{ width: 60 }}>
                          <TextCell value={it.unit} onChange={(v) => setItem(it.id, { unit: v })} />
                        </td>
                        <td style={{ width: 90 }}>
                          <NumCell value={it.qty} onChange={(v) => setItem(it.id, { qty: v })} />
                        </td>
                        <td style={{ width: 100 }}>
                          <NumCell value={it.matUnit} onChange={(v) => setItem(it.id, { matUnit: v })} />
                        </td>
                        <td style={{ width: 100 }}>
                          <NumCell value={it.laborUnit} onChange={(v) => setItem(it.id, { laborUnit: v })} />
                        </td>
                        <td style={{ width: 100 }}>
                          <NumCell value={it.expenseUnit} onChange={(v) => setItem(it.id, { expenseUnit: v })} />
                        </td>
                        <td className="num">{won(line)}</td>
                        <td className="c">
                          <button className="btn ghost sm danger" onClick={() => delItem(it.id)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="l">{sheet.unit || "단위"}당 합계</td>
                    <td className="num">{won(sum.material)}</td>
                    <td className="num">{won(sum.labor)}</td>
                    <td className="num">{won(sum.expense)}</td>
                    <td className="num">{won(sum.total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
      {state.sheets.length === 0 && <div className="card empty">일위대가 호표가 없습니다. 추가하세요.</div>}
    </div>
  );
}

/* ===================== 원가계산서 ===================== */
const RATE_FIELDS: { key: keyof CostRates; label: string; basis: string }[] = [
  { key: "indirectLabor", label: "간접노무비", basis: "직접노무비" },
  { key: "industrialAccident", label: "산재보험료", basis: "노무비(직접+간접)" },
  { key: "employment", label: "고용보험료", basis: "노무비(직접+간접)" },
  { key: "healthInsurance", label: "국민건강보험료", basis: "직접노무비" },
  { key: "pension", label: "국민연금보험료", basis: "직접노무비" },
  { key: "longTermCare", label: "노인장기요양보험료", basis: "건강보험료" },
  { key: "safety", label: "안전관리비", basis: "재료비+직접노무비" },
  { key: "environment", label: "환경보전비", basis: "재료비+직접노무비" },
  { key: "etcExpense", label: "기타경비", basis: "재료비+노무비" },
  { key: "generalAdmin", label: "일반관리비", basis: "순공사원가" },
  { key: "profit", label: "이윤", basis: "노무비+경비+일반관리비" },
  { key: "vat", label: "부가가치세", basis: "총원가" },
];

function CostTab({
  state,
  patch,
}: {
  state: EstimateState;
  patch: (p: Partial<EstimateState>) => void;
}) {
  const base = useMemo(() => sumBoq(state.boq), [state.boq]);
  const r = useMemo(
    () => calcCost(base.material, base.labor, base.expense, state.rates),
    [base, state.rates]
  );
  const setRate = (key: keyof CostRates, v: number) =>
    patch({ rates: { ...state.rates, [key]: v } });

  const Row = ({ label, basis, value, cls }: { label: string; basis?: string; value: number; cls?: string }) => (
    <tr className={cls}>
      <td className="label">{label}</td>
      <td className="basis">{basis ?? ""}</td>
      <td className="num">{won(value)}</td>
    </tr>
  );

  return (
    <div>
      <div className="summary-cards">
        <div className="stat">
          <div className="k">직접공사비</div>
          <div className="v num">{won(r.directTotal)}<span className="u">원</span></div>
        </div>
        <div className="stat">
          <div className="k">순공사원가</div>
          <div className="v num">{won(r.pureConstruction)}<span className="u">원</span></div>
        </div>
        <div className="stat">
          <div className="k">총원가(공급가액)</div>
          <div className="v num">{won(r.totalCost)}<span className="u">원</span></div>
        </div>
        <div className="stat">
          <div className="k">도급액(VAT 포함)</div>
          <div className="v num" style={{ color: "var(--green)" }}>{won(r.contractAmount)}<span className="u">원</span></div>
        </div>
      </div>

      <div className="card">
        <h4>원가계산서</h4>
        <div className="tbl-wrap">
          <table className="tbl cost-table">
            <thead>
              <tr>
                <th className="l">비목</th>
                <th className="l">산정 기준</th>
                <th>금액(원)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="section"><td colSpan={3}>Ⅰ. 직접공사비</td></tr>
              <Row label="직접재료비" value={r.directMaterial} basis="내역서 재료비 합계" />
              <Row label="직접노무비" value={r.directLabor} basis="내역서 노무비 합계" />
              <Row label="직접경비" value={r.directExpense} basis="내역서 경비 합계" />
              <Row label="직접공사비 계" value={r.directTotal} cls="" />

              <tr className="section"><td colSpan={3}>Ⅱ. 간접비</td></tr>
              <Row label="간접노무비" value={r.indirectLabor} basis={`직접노무비 × ${state.rates.indirectLabor}%`} />
              <Row label="산재보험료" value={r.industrialAccident} basis={`노무비 × ${state.rates.industrialAccident}%`} />
              <Row label="고용보험료" value={r.employment} basis={`노무비 × ${state.rates.employment}%`} />
              <Row label="국민건강보험료" value={r.healthInsurance} basis={`직접노무비 × ${state.rates.healthInsurance}%`} />
              <Row label="국민연금보험료" value={r.pension} basis={`직접노무비 × ${state.rates.pension}%`} />
              <Row label="노인장기요양보험료" value={r.longTermCare} basis={`건강보험료 × ${state.rates.longTermCare}%`} />
              <Row label="안전관리비" value={r.safety} basis={`(재료비+직접노무비) × ${state.rates.safety}%`} />
              <Row label="환경보전비" value={r.environment} basis={`(재료비+직접노무비) × ${state.rates.environment}%`} />
              <Row label="기타경비" value={r.etcExpense} basis={`(재료비+노무비) × ${state.rates.etcExpense}%`} />
              <Row label="간접비 계" value={r.indirectTotal} />

              <tr className="section"><td colSpan={3}>Ⅲ. 집계</td></tr>
              <Row label="순공사원가" value={r.pureConstruction} basis="직접공사비 + 간접비" />
              <Row label="일반관리비" value={r.generalAdmin} basis={`순공사원가 × ${state.rates.generalAdmin}%`} />
              <Row label="이윤" value={r.profit} basis={`(노무비+경비+일반관리비) × ${state.rates.profit}%`} />
              <Row label="총원가 (공급가액)" value={r.totalCost} cls="grand" />
              <Row label="부가가치세" value={r.vat} basis={`총원가 × ${state.rates.vat}%`} />
              <Row label="도급액" value={r.contractAmount} cls="grand" />
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h4>요율 설정 (%)</h4>
        <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
          조달청 「예정가격 작성기준」 기반 기본값입니다. 공사 규모·공종에 따라 직접 조정하세요.
        </p>
        <div className="row" style={{ gap: 14 }}>
          {RATE_FIELDS.map((f) => (
            <div className="field" key={f.key} style={{ width: 150 }}>
              <label>{f.label} <span className="muted">({f.basis})</span></label>
              <input
                type="number"
                step="any"
                value={state.rates[f.key]}
                onChange={(e) => setRate(f.key, parseFloat(e.target.value) || 0)}
              />
            </div>
          ))}
          <div className="field" style={{ justifyContent: "flex-end" }}>
            <label>&nbsp;</label>
            <button className="btn sm" onClick={() => patch({ rates: DEFAULT_RATES })}>기본값 복원</button>
          </div>
        </div>
      </div>
    </div>
  );
}
