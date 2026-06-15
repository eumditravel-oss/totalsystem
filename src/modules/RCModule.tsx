import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { load, save, uid } from "../lib/storage";
import { num, toNum } from "../lib/format";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  REBAR_POS_LABELS,
  RULE_KIND_LABELS,
  computeAll,
  concreteMatrix,
  rebarMatrix,
  singleMatrix,
  defaultSettings,
  type Category,
  type Matrix,
  type Member,
  type QtyRule,
  type RcState,
  type RebarPos,
  type RuleKind,
  type Shape,
} from "../lib/rcEngine";
import { defaultState } from "../lib/rcShapes";

const KEY = "kcost.rc.v2";
type Tab = "members" | "shapes" | "settings" | "analysis";

const cell = (v: number, d: number) => (Math.abs(v) < 1e-9 ? "·" : num(v, d));

export default function RCModule() {
  const [state, setState] = useState<RcState>(() => load<RcState>(KEY, defaultState()));
  const [tab, setTab] = useState<Tab>("members");
  useEffect(() => save(KEY, state), [state]);

  const results = useMemo(() => computeAll(state), [state]);
  const patch = (p: Partial<RcState>) => setState((s) => ({ ...s, ...p }));

  const totals = useMemo(() => {
    let c = 0, f = 0, l = 0, r = 0, kg = 0;
    for (const x of results) { c += x.concrete; f += x.formwork; l += x.lean; r += x.rubble; kg += x.rebarTotal; }
    return { c, f, l, r, kg };
  }, [results]);

  return (
    <div>
      <div className="module-head">
        <h2>RC 골조물량 산출</h2>
        <span className="badge">RC · 산식엔진</span>
        <div className="spacer" style={{ flex: 1 }} />
        <input style={{ minWidth: 200 }} value={state.projectName} onChange={(e) => patch({ projectName: e.target.value })} placeholder="공사명" />
        <button className="btn ghost sm danger" onClick={() => confirm("샘플 데이터로 초기화할까요?") && setState(defaultState())}>초기화</button>
      </div>

      <div className="summary-cards">
        <div className="stat"><div className="k">콘크리트</div><div className="v num">{num(totals.c, 2)}<span className="u">m³</span></div></div>
        <div className="stat"><div className="k">거푸집</div><div className="v num">{num(totals.f, 2)}<span className="u">m²</span></div></div>
        <div className="stat"><div className="k">철근</div><div className="v num">{num(totals.kg / 1000, 3)}<span className="u">ton</span></div></div>
        <div className="stat"><div className="k">버림 / 잡석</div><div className="v num" style={{ fontSize: 18 }}>{num(totals.l, 1)} / {num(totals.r, 1)}<span className="u">m³</span></div></div>
      </div>

      <div className="tabs">
        <button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>부재 입력</button>
        <button className={tab === "shapes" ? "active" : ""} onClick={() => setTab("shapes")}>도형 · 산식</button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>정착 · 이음 설정</button>
        <button className={tab === "analysis" ? "active" : ""} onClick={() => setTab("analysis")}>분석표</button>
      </div>

      {tab === "members" && <MembersTab state={state} setState={setState} results={results} />}
      {tab === "shapes" && <ShapesTab state={state} setState={setState} />}
      {tab === "settings" && <SettingsTab state={state} setState={setState} />}
      {tab === "analysis" && <AnalysisTab state={state} results={results} />}
    </div>
  );
}

type SetState = Dispatch<SetStateAction<RcState>>;

/* ===================== 부재 입력 ===================== */
function MembersTab({ state, setState, results }: { state: RcState; setState: SetState; results: ReturnType<typeof computeAll> }) {
  const shapeById = useMemo(() => new Map(state.shapes.map((s) => [s.id, s])), [state.shapes]);
  const resById = useMemo(() => new Map(results.map((r) => [r.id, r])), [results]);

  const defaultsFor = (shape: Shape): Record<string, number | string> => {
    const v: Record<string, number | string> = {};
    for (const p of shape.params) v[p.id] = p.def;
    return v;
  };

  const addMember = () => {
    const shape = state.shapes[0];
    if (!shape) return;
    const mem: Member = { id: uid(), name: "신규 부재", shapeId: shape.id, count: 1, strength: state.settings.strengths[0], values: defaultsFor(shape) };
    setState((s) => ({ ...s, members: [...s.members, mem] }));
  };
  const updMember = (id: string, p: Partial<Member>) =>
    setState((s) => ({ ...s, members: s.members.map((m) => (m.id === id ? { ...m, ...p } : m)) }));
  const setVal = (id: string, key: string, val: number | string) =>
    setState((s) => ({ ...s, members: s.members.map((m) => (m.id === id ? { ...m, values: { ...m.values, [key]: val } } : m)) }));
  const delMember = (id: string) => setState((s) => ({ ...s, members: s.members.filter((m) => m.id !== id) }));
  const changeShape = (id: string, shapeId: string) => {
    const shape = shapeById.get(shapeId);
    if (!shape) return;
    updMember(id, { shapeId, values: defaultsFor(shape) });
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn primary sm" onClick={addMember}>+ 부재 추가</button>
      </div>
      {state.members.map((mem) => {
        const shape = shapeById.get(mem.shapeId);
        const r = resById.get(mem.id);
        if (!shape) return null;
        return (
          <div className="card" key={mem.id}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div className="row">
                <input style={{ width: 130 }} value={mem.name} onChange={(e) => updMember(mem.id, { name: e.target.value })} placeholder="부호" />
                <select value={mem.shapeId} onChange={(e) => changeShape(mem.id, e.target.value)}>
                  {state.shapes.map((s) => <option key={s.id} value={s.id}>{CATEGORY_LABELS[s.category]} · {s.name}</option>)}
                </select>
                <div className="field"><label>개수</label><input type="number" style={{ width: 70 }} value={mem.count} onChange={(e) => updMember(mem.id, { count: toNum(e.target.value) })} /></div>
                <div className="field"><label>강도</label>
                  <select value={mem.strength} onChange={(e) => updMember(mem.id, { strength: e.target.value })}>
                    {state.settings.strengths.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button className="btn ghost sm danger" onClick={() => delMember(mem.id)}>삭제</button>
            </div>

            <div className="row" style={{ gap: 12 }}>
              {shape.params.map((p) => (
                <div className="field" key={p.id} style={{ width: 120 }}>
                  <label>{p.label}{p.unit ? ` (${p.unit})` : ""}</label>
                  {p.kind === "bar" ? (
                    <select value={String(mem.values[p.id] ?? p.def)} onChange={(e) => setVal(mem.id, p.id, e.target.value)}>
                      {state.settings.barSizes.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  ) : (
                    <input type="number" step="any" value={Number(mem.values[p.id] ?? p.def)} onChange={(e) => setVal(mem.id, p.id, toNum(e.target.value))} />
                  )}
                </div>
              ))}
            </div>

            {r && (
              <div className="row" style={{ justifyContent: "space-between", marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <div className="row" style={{ gap: 18, fontSize: 13 }}>
                  <span>콘크리트 <b className="num">{num(r.concrete, 3)}</b> m³</span>
                  <span>거푸집 <b className="num">{num(r.formwork, 2)}</b> m²</span>
                  <span>철근 <b className="num">{num(r.rebarTotal, 1)}</b> kg</span>
                  {r.rebar.length > 0 && <span className="muted">({r.rebar.map((x) => `${x.bar} ${num(x.kg, 0)}`).join(", ")})</span>}
                </div>
                {r.errors.length > 0 && <span style={{ color: "var(--red)", fontSize: 12 }}>⚠ {r.errors[0]}</span>}
              </div>
            )}
          </div>
        );
      })}
      {state.members.length === 0 && <div className="card empty">부재를 추가하세요.</div>}
    </div>
  );
}

/* ===================== 도형 · 산식 편집 ===================== */
function ShapesTab({ state, setState }: { state: RcState; setState: SetState }) {
  const [sel, setSel] = useState<string>(state.shapes[0]?.id ?? "");
  const shape = state.shapes.find((s) => s.id === sel) ?? state.shapes[0];

  const updShape = (id: string, p: Partial<Shape>) =>
    setState((s) => ({ ...s, shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...p } : sh)) }));
  const addShape = () => {
    const ns: Shape = { id: uid(), name: "새 도형", category: "etc", params: [{ id: "A", label: "치수A", kind: "dim", unit: "m", def: 1 }], derived: [], rules: [{ id: uid(), label: "콘크리트", kind: "concrete", expr: "A" }] };
    setState((s) => ({ ...s, shapes: [...s.shapes, ns] }));
    setSel(ns.id);
  };
  const delShape = (id: string) => {
    if (!confirm("이 도형을 삭제할까요? (사용 중인 부재가 있으면 계산되지 않습니다)")) return;
    setState((s) => ({ ...s, shapes: s.shapes.filter((sh) => sh.id !== id) }));
  };

  if (!shape) return <div className="card empty">도형이 없습니다. <button className="btn sm" onClick={addShape}>+ 도형 추가</button></div>;

  const setRule = (rid: string, p: Partial<QtyRule>) =>
    updShape(shape.id, { rules: shape.rules.map((r) => (r.id === rid ? { ...r, ...p } : r)) });
  const addRule = () => updShape(shape.id, { rules: [...shape.rules, { id: uid(), label: "신규", kind: "concrete", expr: "" }] });
  const delRule = (rid: string) => updShape(shape.id, { rules: shape.rules.filter((r) => r.id !== rid) });

  const barParams = shape.params.filter((p) => p.kind === "bar");

  return (
    <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
      <div className="card" style={{ width: 200, flexShrink: 0 }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>도형 목록</h4>
          <button className="btn sm" onClick={addShape}>+</button>
        </div>
        {state.shapes.map((s) => (
          <div key={s.id} className="row" style={{ justifyContent: "space-between", padding: "4px 0" }}>
            <button className="btn ghost sm" style={{ flex: 1, textAlign: "left", borderColor: s.id === sel ? "var(--accent)" : "var(--line)" }} onClick={() => setSel(s.id)}>
              <span className="muted" style={{ fontSize: 11 }}>{CATEGORY_LABELS[s.category]}</span> {s.name}
            </button>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="card">
          <div className="row" style={{ gap: 10 }}>
            <div className="field"><label>도형명</label><input value={shape.name} onChange={(e) => updShape(shape.id, { name: e.target.value })} /></div>
            <div className="field"><label>부재 분류</label>
              <select value={shape.category} onChange={(e) => updShape(shape.id, { category: e.target.value as Category })}>
                {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="field" style={{ justifyContent: "flex-end" }}><label>&nbsp;</label><button className="btn ghost sm danger" onClick={() => delShape(shape.id)}>도형 삭제</button></div>
          </div>
        </div>

        <div className="card">
          <h4>변수 (부재 입력 항목)</h4>
          <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>기호(id)는 산식에서 그대로 사용됩니다. 개수는 <code>N</code>으로 참조할 수 있어요.</p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th className="c">기호</th><th className="l">표시명</th><th className="c">종류</th><th className="c">단위</th><th>기본값</th></tr></thead>
              <tbody>
                {shape.params.map((p, i) => (
                  <tr key={i}>
                    <td className="c" style={{ width: 70 }}>{p.id}</td>
                    <td className="l">{p.label}</td>
                    <td className="c">{p.kind === "bar" ? "철근규격" : p.kind === "spacing" ? "간격" : p.kind === "count" ? "개수" : p.kind === "dim" ? "치수" : "수치"}</td>
                    <td className="c">{p.unit ?? ""}</td>
                    <td className="num">{String(p.def)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>물량 산식</h4>
            <button className="btn primary sm" onClick={addRule}>+ 산식 추가</button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: -2 }}>철근은 <b>본수×길이×단위중량</b>으로 산출되며, 길이에 정착/이음/후크가 자동 가산됩니다. 함수: ROUND, FLOOR, CEIL, MIN, MAX.</p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="l">명칭</th><th className="c">종류</th>
                  <th className="l">산식 / (철근) 본수 · 길이</th>
                  <th className="c">규격</th><th className="c">정착</th><th className="c">이음</th><th className="c">후크</th><th></th>
                </tr>
              </thead>
              <tbody>
                {shape.rules.map((r) => (
                  <tr key={r.id}>
                    <td className="l" style={{ width: 110 }}><input className="l" value={r.label} onChange={(e) => setRule(r.id, { label: e.target.value })} /></td>
                    <td className="c" style={{ width: 90 }}>
                      <select value={r.kind} onChange={(e) => setRule(r.id, { kind: e.target.value as RuleKind })} style={{ width: "100%" }}>
                        {(Object.keys(RULE_KIND_LABELS) as RuleKind[]).map((k) => <option key={k} value={k}>{RULE_KIND_LABELS[k]}</option>)}
                      </select>
                    </td>
                    {r.kind === "rebar" ? (
                      <td className="l">
                        <div className="row" style={{ gap: 4 }}>
                          <input className="l" style={{ flex: 1 }} placeholder="본수" value={r.countExpr ?? ""} onChange={(e) => setRule(r.id, { countExpr: e.target.value })} />
                          <input className="l" style={{ flex: 1 }} placeholder="길이(m)" value={r.lengthExpr ?? ""} onChange={(e) => setRule(r.id, { lengthExpr: e.target.value })} />
                        </div>
                      </td>
                    ) : (
                      <td className="l"><input className="l" placeholder="산식" value={r.expr ?? ""} onChange={(e) => setRule(r.id, { expr: e.target.value })} /></td>
                    )}
                    <td className="c" style={{ width: 80 }}>
                      {r.kind === "rebar" && (
                        <select value={r.barParam ?? ""} onChange={(e) => setRule(r.id, { barParam: e.target.value })} style={{ width: "100%" }}>
                          <option value="">-</option>
                          {barParams.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="c" style={{ width: 90 }}>
                      {r.kind === "rebar" && (
                        <select value={r.pos ?? "none"} onChange={(e) => setRule(r.id, { pos: e.target.value as RebarPos })} style={{ width: "100%" }}>
                          {(Object.keys(REBAR_POS_LABELS) as RebarPos[]).map((p) => <option key={p} value={p}>{REBAR_POS_LABELS[p]}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="c">{r.kind === "rebar" && <input type="checkbox" checked={!!r.lap} onChange={(e) => setRule(r.id, { lap: e.target.checked })} />}</td>
                    <td className="c">{r.kind === "rebar" && <input type="checkbox" checked={!!r.hook} onChange={(e) => setRule(r.id, { hook: e.target.checked })} />}</td>
                    <td className="c"><button className="btn ghost sm danger" onClick={() => delRule(r.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== 정착 · 이음 설정 ===================== */
function SettingsTab({ state, setState }: { state: RcState; setState: SetState }) {
  const st = state.settings;
  const [strength, setStrength] = useState<string>(st.strengths[0]);

  const mutate = (fn: (s: RcState["settings"]) => void) =>
    setState((s) => { const settings = structuredClone(s.settings); fn(settings); return { ...s, settings }; });

  return (
    <div>
      <div className="card">
        <div className="row" style={{ gap: 16 }}>
          <div className="field"><label>이음 = 정착 ×</label><input type="number" step="any" style={{ width: 80 }} value={st.lapFactor} onChange={(e) => mutate((x) => { x.lapFactor = toNum(e.target.value); })} /></div>
          <div className="field"><label>할증 콘크리트(%)</label><input type="number" step="any" style={{ width: 80 }} value={st.waste.concrete} onChange={(e) => mutate((x) => { x.waste.concrete = toNum(e.target.value); })} /></div>
          <div className="field"><label>할증 철근(%)</label><input type="number" step="any" style={{ width: 80 }} value={st.waste.rebar} onChange={(e) => mutate((x) => { x.waste.rebar = toNum(e.target.value); })} /></div>
          <div className="field"><label>할증 잡석(%)</label><input type="number" step="any" style={{ width: 80 }} value={st.waste.rubble} onChange={(e) => mutate((x) => { x.waste.rubble = toNum(e.target.value); })} /></div>
          <div className="field" style={{ justifyContent: "flex-end" }}><label>&nbsp;</label><button className="btn sm" onClick={() => mutate((x) => Object.assign(x, defaultSettings()))}>기본값 복원</button></div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <h4 style={{ margin: 0 }}>정착길이 표 (mm)</h4>
          <div className="field"><label>콘크리트 강도</label>
            <select value={strength} onChange={(e) => setStrength(e.target.value)}>{st.strengths.map((s) => <option key={s} value={s}>{s} MPa</option>)}</select>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>도형 산식에서 철근에 지정한 위치(상부/일반/압축)에 따라 이 표의 값을 길이에 가산합니다. 이음 = 일반정착 × {st.lapFactor}배.</p>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="c">규격</th>
                <th>기초 상부</th><th>기초 일반</th>
                <th>일반부재 상부</th><th>일반부재 일반</th>
                <th>압축</th><th>후크</th><th>단위중량(kg/m)</th>
              </tr>
            </thead>
            <tbody>
              {st.barSizes.map((bar) => (
                <tr key={bar}>
                  <td className="c">{bar}</td>
                  <td><input type="number" value={st.anchorFoundation[strength]?.[bar]?.top ?? 0} onChange={(e) => mutate((x) => { x.anchorFoundation[strength][bar].top = toNum(e.target.value); })} /></td>
                  <td><input type="number" value={st.anchorFoundation[strength]?.[bar]?.general ?? 0} onChange={(e) => mutate((x) => { x.anchorFoundation[strength][bar].general = toNum(e.target.value); })} /></td>
                  <td><input type="number" value={st.anchorBase[strength]?.[bar]?.top ?? 0} onChange={(e) => mutate((x) => { x.anchorBase[strength][bar].top = toNum(e.target.value); })} /></td>
                  <td><input type="number" value={st.anchorBase[strength]?.[bar]?.general ?? 0} onChange={(e) => mutate((x) => { x.anchorBase[strength][bar].general = toNum(e.target.value); })} /></td>
                  <td><input type="number" value={st.compression[strength]?.[bar] ?? 0} onChange={(e) => mutate((x) => { x.compression[strength][bar] = toNum(e.target.value); })} /></td>
                  <td><input type="number" value={st.hook[strength]?.[bar] ?? 0} onChange={(e) => mutate((x) => { x.hook[strength][bar] = toNum(e.target.value); })} /></td>
                  <td><input type="number" step="any" value={st.unitWeight[bar] ?? 0} onChange={(e) => mutate((x) => { x.unitWeight[bar] = toNum(e.target.value); })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===================== 분석표 ===================== */
type View = "concrete" | "formwork" | "rebar" | "lean" | "rubble";
const VIEW_LABELS: Record<View, string> = { concrete: "콘크리트(m³)", formwork: "거푸집(m²)", rebar: "철근(kg)", lean: "버림(m³)", rubble: "잡석(m³)" };

function AnalysisTab({ state, results }: { state: RcState; results: ReturnType<typeof computeAll> }) {
  const [view, setView] = useState<View>("concrete");
  const st = state.settings;

  const matrix: Matrix = useMemo(() => {
    if (view === "rebar") return rebarMatrix(results, st);
    if (view === "formwork") return singleMatrix(results, (r) => r.formwork, "거푸집", st.waste.formwork);
    if (view === "lean") return singleMatrix(results, (r) => r.lean, "버림", st.waste.concrete);
    if (view === "rubble") return singleMatrix(results, (r) => r.rubble, "잡석", st.waste.rubble);
    return concreteMatrix(results, st);
  }, [view, results, st]);

  const digits = view === "rebar" ? 0 : 2;

  return (
    <div>
      <div className="tabs" style={{ borderBottom: "none", marginBottom: 8 }}>
        {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
          <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}>{VIEW_LABELS[v]}</button>
        ))}
      </div>
      <div className="card">
        <h4>{VIEW_LABELS[view]} 집계 — 부재분류 × 규격</h4>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th className="l">부재</th>{matrix.cols.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.category}>
                  <td className="l">{CATEGORY_LABELS[row.category]}</td>
                  {matrix.cols.map((c) => <td key={c} className="num">{cell(row.cells[c] ?? 0, digits)}</td>)}
                </tr>
              ))}
              {matrix.rows.length === 0 && <tr><td colSpan={matrix.cols.length + 1} className="empty">데이터가 없습니다.</td></tr>}
            </tbody>
            <tfoot>
              <tr><td className="l">소계</td>{matrix.cols.map((c) => <td key={c} className="num">{cell(matrix.subtotal[c], digits)}</td>)}</tr>
              <tr><td className="l">할증 {matrix.wastePct}%</td>{matrix.cols.map((c) => <td key={c} className="num muted">{cell(matrix.total[c] - matrix.subtotal[c], digits)}</td>)}</tr>
              <tr><td className="l">합계</td>{matrix.cols.map((c) => <td key={c} className="num">{cell(matrix.total[c], digits)}</td>)}</tr>
            </tfoot>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          {view === "concrete" && "열 = 콘크리트 강도/종류. 부재별 강도 지정값으로 분류됩니다."}
          {view === "rebar" && "열 = 철근 규격. 정착·이음·후크가 포함된 길이로 산출됩니다."}
          {(view === "formwork" || view === "lean" || view === "rubble") && "단일 항목 집계입니다."}
        </p>
      </div>
    </div>
  );
}
