import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { MemberType, RCMember, RCState, RebarLine } from "../types";
import { load, save, uid } from "../lib/storage";
import { num } from "../lib/format";
import { NumCell, TextCell } from "../components/Cells";
import { MEMBER_LABELS, calcMember, calcTotals } from "../lib/rcCalc";
import { REBAR_DIAS, unitWeight } from "../lib/rebar";

const KEY = "kcost.rc.v1";

function blankMember(type: MemberType = "column"): RCMember {
  return {
    id: uid(),
    name: "",
    type,
    count: 1,
    b: 0,
    h: 0,
    l: 0,
    t: 0,
    area: 0,
    useArea: false,
    rebars: [],
  };
}

const SAMPLE: RCState = {
  projectName: "○○ 신축공사 골조",
  members: [
    {
      id: uid(),
      name: "C1",
      type: "column",
      count: 12,
      b: 0.5,
      h: 0.5,
      l: 3.6,
      t: 0,
      area: 0,
      useArea: false,
      rebars: [
        { id: uid(), role: "주근", dia: "HD22", countPerMember: 12, lengthEach: 4.0 },
        { id: uid(), role: "띠철근", dia: "HD10", countPerMember: 24, lengthEach: 1.9 },
      ],
    },
    {
      id: uid(),
      name: "G1",
      type: "girder",
      count: 20,
      b: 0.4,
      h: 0.6,
      l: 6.0,
      t: 0,
      area: 0,
      useArea: false,
      rebars: [
        { id: uid(), role: "상부주근", dia: "HD25", countPerMember: 4, lengthEach: 6.6 },
        { id: uid(), role: "하부주근", dia: "HD25", countPerMember: 4, lengthEach: 6.6 },
        { id: uid(), role: "스터럽", dia: "HD10", countPerMember: 30, lengthEach: 1.8 },
      ],
    },
    {
      id: uid(),
      name: "S1",
      type: "slab",
      count: 1,
      b: 0,
      h: 0,
      l: 0,
      t: 0.15,
      area: 360,
      useArea: true,
      rebars: [{ id: uid(), role: "배력근 D13@200 양방향", dia: "HD13", countPerMember: 3600, lengthEach: 1.0 }],
    },
  ],
};

const TYPE_HINT: Record<MemberType, string> = {
  column: "폭 b × 춤 h × 높이 L",
  girder: "폭 b × 춤 h × 길이 L",
  slab: "면적 또는 (b × L) × 두께 t",
  wall: "면적 또는 (b × L) × 두께 t",
  footing: "폭 b × 높이 h × 길이 L",
};

export default function RCModule() {
  const [state, setState] = useState<RCState>(() => load<RCState>(KEY, SAMPLE));
  useEffect(() => save(KEY, state), [state]);

  const patch = (p: Partial<RCState>) => setState((s) => ({ ...s, ...p }));
  const setMember = (id: string, p: Partial<RCMember>) =>
    patch({ members: state.members.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  const addMember = (type: MemberType) => patch({ members: [...state.members, blankMember(type)] });
  const delMember = (id: string) => patch({ members: state.members.filter((m) => m.id !== id) });

  const totals = useMemo(() => calcTotals(state.members), [state.members]);

  return (
    <div>
      <div className="module-head">
        <h2>RC 골조물량 산출</h2>
        <span className="badge">RC</span>
        <div className="spacer" style={{ flex: 1 }} />
        <input
          style={{ minWidth: 220 }}
          value={state.projectName}
          onChange={(e) => patch({ projectName: e.target.value })}
          placeholder="공사명"
        />
        <button
          className="btn ghost sm danger"
          onClick={() => confirm("샘플로 초기화할까요?") && setState(SAMPLE)}
        >
          초기화
        </button>
      </div>

      <div className="summary-cards">
        <div className="stat">
          <div className="k">콘크리트</div>
          <div className="v num">{num(totals.concrete, 2)}<span className="u">m³</span></div>
        </div>
        <div className="stat">
          <div className="k">거푸집</div>
          <div className="v num">{num(totals.formwork, 2)}<span className="u">m²</span></div>
        </div>
        <div className="stat">
          <div className="k">철근</div>
          <div className="v num">{num(totals.rebar / 1000, 3)}<span className="u">ton</span></div>
        </div>
        <div className="stat">
          <div className="k">철근(kg)</div>
          <div className="v num">{num(totals.rebar, 0)}<span className="u">kg</span></div>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 14, gap: 8 }}>
        <span className="muted" style={{ fontSize: 13 }}>부재 추가:</span>
        {(Object.keys(MEMBER_LABELS) as MemberType[]).map((t) => (
          <button key={t} className="btn sm" onClick={() => addMember(t)}>+ {MEMBER_LABELS[t]}</button>
        ))}
      </div>

      {state.members.map((m) => (
        <MemberCard
          key={m.id}
          m={m}
          onChange={(p) => setMember(m.id, p)}
          onDelete={() => delMember(m.id)}
        />
      ))}
      {state.members.length === 0 && <div className="card empty">부재를 추가하세요.</div>}
    </div>
  );
}

function MemberCard({
  m,
  onChange,
  onDelete,
}: {
  m: RCMember;
  onChange: (p: Partial<RCMember>) => void;
  onDelete: () => void;
}) {
  const res = calcMember(m);
  const isAreaType = m.type === "slab" || m.type === "wall";

  const setRebar = (id: string, p: Partial<RebarLine>) =>
    onChange({ rebars: m.rebars.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const addRebar = () =>
    onChange({ rebars: [...m.rebars, { id: uid(), role: "", dia: "HD13", countPerMember: 0, lengthEach: 0 }] });
  const delRebar = (id: string) => onChange({ rebars: m.rebars.filter((r) => r.id !== id) });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div className="row">
          <input style={{ width: 90 }} value={m.name} placeholder="기호" onChange={(e) => onChange({ name: e.target.value })} />
          <select value={m.type} onChange={(e) => onChange({ type: e.target.value as MemberType })}>
            {(Object.keys(MEMBER_LABELS) as MemberType[]).map((t) => (
              <option key={t} value={t}>{MEMBER_LABELS[t]}</option>
            ))}
          </select>
          <span className="muted" style={{ fontSize: 12 }}>{TYPE_HINT[m.type]}</span>
        </div>
        <button className="btn ghost sm danger" onClick={onDelete}>부재 삭제</button>
      </div>

      <div className="row" style={{ gap: 14, marginBottom: 12 }}>
        <Field label="개수">
          <input type="number" style={{ width: 80 }} value={m.count} onChange={(e) => onChange({ count: parseFloat(e.target.value) || 0 })} />
        </Field>
        {isAreaType ? (
          <>
            <Field label="면적 직접입력">
              <select value={m.useArea ? "y" : "n"} onChange={(e) => onChange({ useArea: e.target.value === "y" })}>
                <option value="y">예</option>
                <option value="n">아니오 (b×L)</option>
              </select>
            </Field>
            {m.useArea ? (
              <Field label="면적 (m²)"><input type="number" style={{ width: 100 }} value={m.area} onChange={(e) => onChange({ area: parseFloat(e.target.value) || 0 })} /></Field>
            ) : (
              <>
                <Field label="b (m)"><input type="number" style={{ width: 90 }} value={m.b} onChange={(e) => onChange({ b: parseFloat(e.target.value) || 0 })} /></Field>
                <Field label="L (m)"><input type="number" style={{ width: 90 }} value={m.l} onChange={(e) => onChange({ l: parseFloat(e.target.value) || 0 })} /></Field>
              </>
            )}
            <Field label="두께 t (m)"><input type="number" style={{ width: 90 }} value={m.t} onChange={(e) => onChange({ t: parseFloat(e.target.value) || 0 })} /></Field>
          </>
        ) : (
          <>
            <Field label="b (m)"><input type="number" style={{ width: 90 }} value={m.b} onChange={(e) => onChange({ b: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="h (m)"><input type="number" style={{ width: 90 }} value={m.h} onChange={(e) => onChange({ h: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="L (m)"><input type="number" style={{ width: 90 }} value={m.l} onChange={(e) => onChange({ l: parseFloat(e.target.value) || 0 })} /></Field>
          </>
        )}
      </div>

      <div className="tbl-wrap" style={{ marginBottom: 10 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th className="l">철근 역할</th>
              <th className="c">규격</th>
              <th>개수(부재당)</th>
              <th>가닥길이(m)</th>
              <th>단위중량(kg/m)</th>
              <th>중량(kg)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {m.rebars.map((r) => {
              const w = (r.countPerMember || 0) * (r.lengthEach || 0) * unitWeight(r.dia) * m.count;
              return (
                <tr key={r.id}>
                  <td className="l"><TextCell value={r.role} onChange={(v) => setRebar(r.id, { role: v })} placeholder="주근/늑근 등" /></td>
                  <td className="c" style={{ width: 90 }}>
                    <select value={r.dia} onChange={(e) => setRebar(r.id, { dia: e.target.value })} style={{ width: "100%" }}>
                      {REBAR_DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>
                  <td style={{ width: 100 }}><NumCell value={r.countPerMember} onChange={(v) => setRebar(r.id, { countPerMember: v })} /></td>
                  <td style={{ width: 100 }}><NumCell value={r.lengthEach} onChange={(v) => setRebar(r.id, { lengthEach: v })} /></td>
                  <td className="num">{unitWeight(r.dia).toFixed(3)}</td>
                  <td className="num">{num(w, 1)}</td>
                  <td className="c"><button className="btn ghost sm danger" onClick={() => delRebar(r.id)}>✕</button></td>
                </tr>
              );
            })}
            {m.rebars.length === 0 && <tr><td colSpan={7} className="empty" style={{ padding: 14 }}>배근 입력이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button className="btn sm" onClick={addRebar}>+ 배근 추가</button>
        <div className="row" style={{ gap: 18, fontSize: 13 }}>
          <span>콘크리트 <b className="num">{num(res.concrete, 3)}</b> m³</span>
          <span>거푸집 <b className="num">{num(res.formwork, 2)}</b> m²</span>
          <span>철근 <b className="num">{num(res.rebar, 1)}</b> kg</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
