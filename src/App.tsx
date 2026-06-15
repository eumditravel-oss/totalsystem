import { useState } from "react";
import type { ModuleKey } from "./types";
import Launcher from "./components/Launcher";
import EstimateModule from "./modules/EstimateModule";
import RCModule from "./modules/RCModule";
import FINModule from "./modules/FINModule";

const TITLES: Record<Exclude<ModuleKey, "home">, string> = {
  estimate: "통합내역 · 일위대가",
  rc: "RC 골조물량 산출",
  fin: "FIN 마감물량 산출",
};

export default function App() {
  const [view, setView] = useState<ModuleKey>("home");

  if (view === "home") {
    return <Launcher onOpen={setView} />;
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <span className="dot" />
          KCOST <span style={{ color: "var(--muted)", fontWeight: 500 }}>Suite</span>
        </div>
        <button className="btn ghost sm" onClick={() => setView("home")}>
          ← 런처로
        </button>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>
          {TITLES[view as Exclude<ModuleKey, "home">]}
        </div>
        <div className="spacer" />
      </div>
      <div className="content">
        {view === "estimate" && <EstimateModule />}
        {view === "rc" && <RCModule />}
        {view === "fin" && <FINModule />}
      </div>
    </div>
  );
}
