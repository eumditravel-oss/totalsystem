import type { ModuleKey } from "../types";

interface AppDef {
  key: Exclude<ModuleKey, "home">;
  tag: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
}

const APPS: AppDef[] = [
  {
    key: "estimate",
    tag: "XCOST",
    title: "통합내역 · 일위대가",
    desc: "내역서 작성, 일위대가 호표 구성, 조달청 기준 원가계산서(간접비·일반관리비·이윤)까지 한 번에.",
    icon: "📋",
    color: "linear-gradient(135deg,#3b82f6,#22d3ee)",
  },
  {
    key: "rc",
    tag: "RC",
    title: "골조물량 산출",
    desc: "기둥·보·슬래브·벽·기초 부재 치수와 배근을 입력하면 콘크리트·거푸집·철근 물량을 규격별로 자동 산출.",
    icon: "🏗️",
    color: "linear-gradient(135deg,#f59e0b,#f87171)",
  },
  {
    key: "fin",
    tag: "FIN",
    title: "마감물량 산출",
    desc: "실(room)별 치수와 마감 사양을 입력하면 바닥·벽·천장·걸레받이 면적을 산출하고 자재별로 집계.",
    icon: "🎨",
    color: "linear-gradient(135deg,#34d399,#22d3ee)",
  },
];

export default function Launcher({ onOpen }: { onOpen: (k: ModuleKey) => void }) {
  return (
    <div className="launcher">
      <h1>KCOST Suite</h1>
      <div className="sub">
        건설 적산 통합 스위트 — 원하는 프로그램을 선택하세요
      </div>
      <div className="app-grid">
        {APPS.map((a) => (
          <button key={a.key} className="app-card" onClick={() => onOpen(a.key)}>
            <span className="glow" />
            <span className="icon" style={{ background: a.color }}>
              {a.icon}
            </span>
            <span className="tag">{a.tag}</span>
            <h3>{a.title}</h3>
            <p>{a.desc}</p>
            <span className="play">실행 ▶</span>
          </button>
        ))}
      </div>
    </div>
  );
}
