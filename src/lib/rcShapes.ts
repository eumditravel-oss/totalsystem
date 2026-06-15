// 기본 내장 도형 라이브러리 (독자 정의) + 샘플 부재
import type { Member, RcState, Shape } from "./rcEngine";
import { defaultSettings } from "./rcEngine";
import { uid } from "./storage";

export function defaultShapes(): Shape[] {
  return [
    // ── 독립기초 ──
    {
      id: "fnd_iso",
      name: "독립기초",
      category: "foundation",
      params: [
        { id: "W", label: "기초가로", kind: "dim", unit: "m", def: 2.0 },
        { id: "L", label: "기초세로", kind: "dim", unit: "m", def: 2.0 },
        { id: "D", label: "기초두께", kind: "dim", unit: "m", def: 0.5 },
        { id: "LEAN", label: "버림두께", kind: "dim", unit: "m", def: 0.06 },
        { id: "RUB", label: "잡석두께", kind: "dim", unit: "m", def: 0.1 },
        { id: "EXT", label: "버림/잡석내민", kind: "dim", unit: "m", def: 0.1 },
        { id: "MB", label: "주근규격", kind: "bar", def: "HD16" },
        { id: "MS", label: "주근간격", kind: "spacing", unit: "m", def: 0.2 },
        { id: "COVER", label: "피복", kind: "dim", unit: "m", def: 0.08 },
      ],
      derived: [{ id: "BW", label: "버림폭여유", expr: "EXT*2" }],
      rules: [
        { id: uid(), label: "콘크리트", kind: "concrete", expr: "W*L*D" },
        { id: uid(), label: "버림콘크리트", kind: "lean", expr: "(W+BW)*(L+BW)*LEAN" },
        { id: uid(), label: "잡석", kind: "rubble", expr: "(W+BW)*(L+BW)*RUB" },
        { id: uid(), label: "거푸집", kind: "formwork", expr: "2*(W+L)*D" },
        { id: uid(), label: "하부주근(가로)", kind: "rebar", barParam: "MB", countExpr: "FLOOR(L/MS)+1", lengthExpr: "W-2*COVER", pos: "general", hook: true },
        { id: uid(), label: "하부주근(세로)", kind: "rebar", barParam: "MB", countExpr: "FLOOR(W/MS)+1", lengthExpr: "L-2*COVER", pos: "general", hook: true },
      ],
    },
    // ── 매트기초 ──
    {
      id: "fnd_mat",
      name: "매트기초",
      category: "foundation",
      params: [
        { id: "W", label: "매트가로", kind: "dim", unit: "m", def: 20 },
        { id: "L", label: "매트세로", kind: "dim", unit: "m", def: 18 },
        { id: "D", label: "매트두께", kind: "dim", unit: "m", def: 0.6 },
        { id: "LEAN", label: "버림두께", kind: "dim", unit: "m", def: 0.06 },
        { id: "RUB", label: "잡석두께", kind: "dim", unit: "m", def: 0.1 },
        { id: "MB", label: "매트철근규격", kind: "bar", def: "HD22" },
        { id: "MS", label: "철근간격", kind: "spacing", unit: "m", def: 0.2 },
        { id: "COVER", label: "피복", kind: "dim", unit: "m", def: 0.08 },
      ],
      derived: [],
      rules: [
        { id: uid(), label: "콘크리트", kind: "concrete", expr: "W*L*D" },
        { id: uid(), label: "버림콘크리트", kind: "lean", expr: "W*L*LEAN" },
        { id: uid(), label: "잡석", kind: "rubble", expr: "W*L*RUB" },
        { id: uid(), label: "거푸집", kind: "formwork", expr: "2*(W+L)*D" },
        { id: uid(), label: "상부근(가로)", kind: "rebar", barParam: "MB", countExpr: "FLOOR(L/MS)+1", lengthExpr: "W-2*COVER", pos: "top", lap: true },
        { id: uid(), label: "상부근(세로)", kind: "rebar", barParam: "MB", countExpr: "FLOOR(W/MS)+1", lengthExpr: "L-2*COVER", pos: "top", lap: true },
        { id: uid(), label: "하부근(가로)", kind: "rebar", barParam: "MB", countExpr: "FLOOR(L/MS)+1", lengthExpr: "W-2*COVER", pos: "general", lap: true },
        { id: uid(), label: "하부근(세로)", kind: "rebar", barParam: "MB", countExpr: "FLOOR(W/MS)+1", lengthExpr: "L-2*COVER", pos: "general", lap: true },
      ],
    },
    // ── 사각기둥 ──
    {
      id: "col_rect",
      name: "사각기둥",
      category: "column",
      params: [
        { id: "B", label: "단면폭", kind: "dim", unit: "m", def: 0.5 },
        { id: "H", label: "단면춤", kind: "dim", unit: "m", def: 0.5 },
        { id: "HT", label: "층고", kind: "dim", unit: "m", def: 3.2 },
        { id: "MB", label: "주근규격", kind: "bar", def: "HD22" },
        { id: "NMAIN", label: "주근개수", kind: "count", def: 8 },
        { id: "TB", label: "띠철근규격", kind: "bar", def: "HD10" },
        { id: "TS", label: "띠철근간격", kind: "spacing", unit: "m", def: 0.2 },
        { id: "COVER", label: "피복", kind: "dim", unit: "m", def: 0.04 },
      ],
      derived: [],
      rules: [
        { id: uid(), label: "콘크리트", kind: "concrete", expr: "B*H*HT" },
        { id: uid(), label: "거푸집", kind: "formwork", expr: "2*(B+H)*HT" },
        { id: uid(), label: "주근", kind: "rebar", barParam: "MB", countExpr: "NMAIN", lengthExpr: "HT", pos: "general", lap: true },
        { id: uid(), label: "띠철근", kind: "rebar", barParam: "TB", countExpr: "FLOOR(HT/TS)+1", lengthExpr: "2*((B-2*COVER)+(H-2*COVER))", pos: "none", hook: true },
      ],
    },
    // ── 일반보 ──
    {
      id: "beam_gen",
      name: "일반보",
      category: "beam",
      params: [
        { id: "B", label: "보폭", kind: "dim", unit: "m", def: 0.4 },
        { id: "H", label: "보춤", kind: "dim", unit: "m", def: 0.6 },
        { id: "L", label: "보길이", kind: "dim", unit: "m", def: 6.0 },
        { id: "MT", label: "상부주근규격", kind: "bar", def: "HD22" },
        { id: "NT", label: "상부주근개수", kind: "count", def: 3 },
        { id: "MBO", label: "하부주근규격", kind: "bar", def: "HD22" },
        { id: "NB", label: "하부주근개수", kind: "count", def: 3 },
        { id: "ST", label: "스터럽규격", kind: "bar", def: "HD10" },
        { id: "SS", label: "스터럽간격", kind: "spacing", unit: "m", def: 0.2 },
        { id: "COVER", label: "피복", kind: "dim", unit: "m", def: 0.04 },
      ],
      derived: [],
      rules: [
        { id: uid(), label: "콘크리트", kind: "concrete", expr: "B*H*L" },
        { id: uid(), label: "거푸집", kind: "formwork", expr: "(2*H+B)*L" },
        { id: uid(), label: "상부주근", kind: "rebar", barParam: "MT", countExpr: "NT", lengthExpr: "L", pos: "top", lap: true },
        { id: uid(), label: "하부주근", kind: "rebar", barParam: "MBO", countExpr: "NB", lengthExpr: "L", pos: "general", lap: true },
        { id: uid(), label: "스터럽", kind: "rebar", barParam: "ST", countExpr: "FLOOR(L/SS)+1", lengthExpr: "2*((B-2*COVER)+(H-2*COVER))", pos: "none", hook: true },
      ],
    },
    // ── 슬래브 ──
    {
      id: "slab_gen",
      name: "슬래브",
      category: "slab",
      params: [
        { id: "W", label: "가로", kind: "dim", unit: "m", def: 6.0 },
        { id: "L", label: "세로", kind: "dim", unit: "m", def: 8.0 },
        { id: "T", label: "두께", kind: "dim", unit: "m", def: 0.15 },
        { id: "MB", label: "철근규격", kind: "bar", def: "HD13" },
        { id: "MS", label: "철근간격", kind: "spacing", unit: "m", def: 0.2 },
        { id: "COVER", label: "피복", kind: "dim", unit: "m", def: 0.03 },
      ],
      derived: [],
      rules: [
        { id: uid(), label: "콘크리트", kind: "concrete", expr: "W*L*T" },
        { id: uid(), label: "거푸집", kind: "formwork", expr: "W*L" },
        { id: uid(), label: "상부근(가로)", kind: "rebar", barParam: "MB", countExpr: "FLOOR(L/MS)+1", lengthExpr: "W-2*COVER", pos: "top", lap: true },
        { id: uid(), label: "상부근(세로)", kind: "rebar", barParam: "MB", countExpr: "FLOOR(W/MS)+1", lengthExpr: "L-2*COVER", pos: "top", lap: true },
        { id: uid(), label: "하부근(가로)", kind: "rebar", barParam: "MB", countExpr: "FLOOR(L/MS)+1", lengthExpr: "W-2*COVER", pos: "general", lap: true },
        { id: uid(), label: "하부근(세로)", kind: "rebar", barParam: "MB", countExpr: "FLOOR(W/MS)+1", lengthExpr: "L-2*COVER", pos: "general", lap: true },
      ],
    },
    // ── 벽체 ──
    {
      id: "wall_gen",
      name: "벽체",
      category: "wall",
      params: [
        { id: "L", label: "벽길이", kind: "dim", unit: "m", def: 5.0 },
        { id: "H", label: "벽높이", kind: "dim", unit: "m", def: 3.0 },
        { id: "T", label: "벽두께", kind: "dim", unit: "m", def: 0.2 },
        { id: "LAYER", label: "배근층수", kind: "num", def: 2 },
        { id: "VB", label: "수직근규격", kind: "bar", def: "HD13" },
        { id: "VS", label: "수직근간격", kind: "spacing", unit: "m", def: 0.2 },
        { id: "HB", label: "수평근규격", kind: "bar", def: "HD13" },
        { id: "HS", label: "수평근간격", kind: "spacing", unit: "m", def: 0.2 },
        { id: "OPEN", label: "개구부면적", kind: "num", unit: "m²", def: 0 },
      ],
      derived: [],
      rules: [
        { id: uid(), label: "콘크리트", kind: "concrete", expr: "L*H*T-OPEN*T" },
        { id: uid(), label: "거푸집", kind: "formwork", expr: "2*(L*H-OPEN)" },
        { id: uid(), label: "수직근", kind: "rebar", barParam: "VB", countExpr: "(FLOOR(L/VS)+1)*LAYER", lengthExpr: "H", pos: "general", lap: true },
        { id: uid(), label: "수평근", kind: "rebar", barParam: "HB", countExpr: "(FLOOR(H/HS)+1)*LAYER", lengthExpr: "L", pos: "general", lap: true },
      ],
    },
  ];
}

function m(name: string, shapeId: string, count: number, strength: string, values: Record<string, number | string>): Member {
  return { id: uid(), name, shapeId, count, strength, values };
}

export function defaultState(): RcState {
  return {
    projectName: "○○ 신축공사 골조",
    shapes: defaultShapes(),
    members: [
      m("F1 독립기초", "fnd_iso", 12, "27", { W: 2.4, L: 2.4, D: 0.6, LEAN: 0.06, RUB: 0.1, EXT: 0.1, MB: "HD19", MS: 0.2, COVER: 0.08 }),
      m("MAT 매트기초", "fnd_mat", 1, "27", { W: 24, L: 18, D: 0.6, LEAN: 0.06, RUB: 0.1, MB: "HD22", MS: 0.2, COVER: 0.08 }),
      m("C1 기둥", "col_rect", 20, "30", { B: 0.5, H: 0.5, HT: 3.6, MB: "HD22", NMAIN: 12, TB: "HD10", TS: 0.15, COVER: 0.04 }),
      m("G1 보", "beam_gen", 24, "30", { B: 0.4, H: 0.6, L: 6.0, MT: "HD25", NT: 4, MBO: "HD25", NB: 4, ST: "HD10", SS: 0.2, COVER: 0.04 }),
      m("S1 슬래브", "slab_gen", 8, "30", { W: 6, L: 8, T: 0.15, MB: "HD13", MS: 0.2, COVER: 0.03 }),
      m("W1 벽체", "wall_gen", 6, "30", { L: 6, H: 3.2, T: 0.2, LAYER: 2, VB: "HD13", VS: 0.2, HB: "HD13", HS: 0.2, OPEN: 0 }),
    ],
    settings: defaultSettings(),
  };
}
