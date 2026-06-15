import { useEffect, useMemo, useState } from "react";
import type { FinState, Room } from "../types";
import { load, save, uid } from "../lib/storage";
import { num } from "../lib/format";
import { NumCell, TextCell } from "../components/Cells";
import { aggregateByMaterial, calcRoom } from "../lib/finCalc";

const KEY = "kcost.fin.v1";

function blankRoom(): Room {
  return {
    id: uid(),
    name: "",
    count: 1,
    length: 0,
    width: 0,
    height: 2.4,
    openingArea: 0,
    baseboardHeight: 0.1,
    finish: { floor: "", wall: "", ceiling: "", baseboard: "" },
  };
}

const SAMPLE: FinState = {
  projectName: "○○ 인테리어 마감",
  rooms: [
    {
      id: uid(),
      name: "사무실 A",
      count: 4,
      length: 6,
      width: 5,
      height: 2.7,
      openingArea: 6,
      baseboardHeight: 0.1,
      finish: { floor: "데코타일 3T", wall: "수성페인트", ceiling: "마이톤 텍스 600각", baseboard: "걸레받이 PVC H100" },
    },
    {
      id: uid(),
      name: "복도",
      count: 1,
      length: 20,
      width: 2.4,
      height: 2.7,
      openingArea: 0,
      baseboardHeight: 0.1,
      finish: { floor: "포세린 타일 600각", wall: "수성페인트", ceiling: "SMC 점검구 천장", baseboard: "걸레받이 타일 H100" },
    },
    {
      id: uid(),
      name: "화장실",
      count: 2,
      length: 3,
      width: 2.5,
      height: 2.4,
      openingArea: 1.8,
      baseboardHeight: 0,
      finish: { floor: "포세린 타일 300각", wall: "도기질 타일 300각", ceiling: "SMC 천장", baseboard: "" },
    },
  ],
};

export default function FINModule() {
  const [state, setState] = useState<FinState>(() => load<FinState>(KEY, SAMPLE));
  useEffect(() => save(KEY, state), [state]);

  const patch = (p: Partial<FinState>) => setState((s) => ({ ...s, ...p }));
  const setRoom = (id: string, p: Partial<Room>) =>
    patch({ rooms: state.rooms.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const setFinish = (id: string, p: Partial<Room["finish"]>) =>
    patch({ rooms: state.rooms.map((r) => (r.id === id ? { ...r, finish: { ...r.finish, ...p } } : r)) });
  const addRoom = () => patch({ rooms: [...state.rooms, blankRoom()] });
  const delRoom = (id: string) => patch({ rooms: state.rooms.filter((r) => r.id !== id) });

  const totals = useMemo(() => {
    return state.rooms.reduce(
      (a, r) => {
        const res = calcRoom(r);
        a.floor += res.floor;
        a.wall += res.wall;
        a.ceiling += res.ceiling;
        a.baseboard += res.baseboard;
        return a;
      },
      { floor: 0, wall: 0, ceiling: 0, baseboard: 0 }
    );
  }, [state.rooms]);

  const byMaterial = useMemo(() => aggregateByMaterial(state.rooms), [state.rooms]);

  return (
    <div>
      <div className="module-head">
        <h2>FIN 마감물량 산출</h2>
        <span className="badge">FIN</span>
        <div className="spacer" style={{ flex: 1 }} />
        <input
          style={{ minWidth: 220 }}
          value={state.projectName}
          onChange={(e) => patch({ projectName: e.target.value })}
          placeholder="공사명"
        />
        <button className="btn ghost sm danger" onClick={() => confirm("샘플로 초기화할까요?") && setState(SAMPLE)}>
          초기화
        </button>
      </div>

      <div className="summary-cards">
        <div className="stat"><div className="k">바닥 면적</div><div className="v num">{num(totals.floor, 2)}<span className="u">m²</span></div></div>
        <div className="stat"><div className="k">벽 면적</div><div className="v num">{num(totals.wall, 2)}<span className="u">m²</span></div></div>
        <div className="stat"><div className="k">천장 면적</div><div className="v num">{num(totals.ceiling, 2)}<span className="u">m²</span></div></div>
        <div className="stat"><div className="k">걸레받이</div><div className="v num">{num(totals.baseboard, 2)}<span className="u">m²</span></div></div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>실 (Room) 입력</h4>
          <button className="btn primary sm" onClick={addRoom}>+ 실 추가</button>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="l">실명</th>
                <th>개수</th>
                <th>가로(m)</th>
                <th>세로(m)</th>
                <th>천장고(m)</th>
                <th>개구부(m²)</th>
                <th>걸레높이(m)</th>
                <th>바닥(m²)</th>
                <th>벽(m²)</th>
                <th>천장(m²)</th>
                <th>걸레(m²)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {state.rooms.map((r) => {
                const res = calcRoom(r);
                return (
                  <tr key={r.id}>
                    <td className="l" style={{ minWidth: 110 }}><TextCell value={r.name} onChange={(v) => setRoom(r.id, { name: v })} placeholder="실명" /></td>
                    <td style={{ width: 60 }}><NumCell value={r.count} onChange={(v) => setRoom(r.id, { count: v })} /></td>
                    <td style={{ width: 72 }}><NumCell value={r.length} onChange={(v) => setRoom(r.id, { length: v })} /></td>
                    <td style={{ width: 72 }}><NumCell value={r.width} onChange={(v) => setRoom(r.id, { width: v })} /></td>
                    <td style={{ width: 72 }}><NumCell value={r.height} onChange={(v) => setRoom(r.id, { height: v })} /></td>
                    <td style={{ width: 78 }}><NumCell value={r.openingArea} onChange={(v) => setRoom(r.id, { openingArea: v })} /></td>
                    <td style={{ width: 78 }}><NumCell value={r.baseboardHeight} onChange={(v) => setRoom(r.id, { baseboardHeight: v })} /></td>
                    <td className="num">{num(res.floor, 2)}</td>
                    <td className="num">{num(res.wall, 2)}</td>
                    <td className="num">{num(res.ceiling, 2)}</td>
                    <td className="num">{num(res.baseboard, 2)}</td>
                    <td className="c"><button className="btn ghost sm danger" onClick={() => delRoom(r.id)}>✕</button></td>
                  </tr>
                );
              })}
              {state.rooms.length === 0 && <tr><td colSpan={12} className="empty">실을 추가하세요.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          벽 면적 = 둘레 2(가로+세로) × 천장고 − 개구부. 걸레받이 = 둘레 × 걸레받이 높이. 모든 값은 개수만큼 곱해집니다.
        </p>
      </div>

      <div className="card">
        <h4>마감 사양 (실별 자재 지정)</h4>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="l">실명</th>
                <th className="l">바닥 마감</th>
                <th className="l">벽 마감</th>
                <th className="l">천장 마감</th>
                <th className="l">걸레받이</th>
              </tr>
            </thead>
            <tbody>
              {state.rooms.map((r) => (
                <tr key={r.id}>
                  <td className="l">{r.name || <span className="muted">(미입력)</span>}</td>
                  <td className="l"><TextCell value={r.finish.floor} onChange={(v) => setFinish(r.id, { floor: v })} placeholder="바닥재" /></td>
                  <td className="l"><TextCell value={r.finish.wall} onChange={(v) => setFinish(r.id, { wall: v })} placeholder="벽재" /></td>
                  <td className="l"><TextCell value={r.finish.ceiling} onChange={(v) => setFinish(r.id, { ceiling: v })} placeholder="천장재" /></td>
                  <td className="l"><TextCell value={r.finish.baseboard} onChange={(v) => setFinish(r.id, { baseboard: v })} placeholder="걸레받이" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h4>자재별 물량 집계</h4>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="c">부위</th>
                <th className="l">마감재</th>
                <th>물량(m²)</th>
              </tr>
            </thead>
            <tbody>
              {byMaterial.map((m, i) => (
                <tr key={i}>
                  <td className="c">{m.type}</td>
                  <td className="l">{m.material}</td>
                  <td className="num">{num(m.area, 2)}</td>
                </tr>
              ))}
              {byMaterial.length === 0 && <tr><td colSpan={3} className="empty">마감재를 입력하면 자동 집계됩니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
