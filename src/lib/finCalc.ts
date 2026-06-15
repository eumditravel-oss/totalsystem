import type { Room } from "../types";

export interface RoomResult {
  floor: number; // 바닥 면적 (m²)
  ceiling: number; // 천장 면적 (m²)
  wall: number; // 벽 면적 (개구부 공제, m²)
  baseboard: number; // 걸레받이 면적 (m²)
  perimeter: number; // 실 둘레 (m)
}

/** 실 1종(개수 포함) 마감 물량 산출. 치수 단위 m. */
export function calcRoom(r: Room): RoomResult {
  const n = Math.max(0, r.count || 0);
  const perimeter = 2 * (r.length + r.width);
  const floor = r.length * r.width;
  const ceiling = floor;
  const grossWall = perimeter * r.height;
  const wall = Math.max(0, grossWall - (r.openingArea || 0));
  const baseboard = perimeter * (r.baseboardHeight || 0);

  return {
    floor: floor * n,
    ceiling: ceiling * n,
    wall: wall * n,
    baseboard: baseboard * n,
    perimeter: perimeter * n,
  };
}

/** 마감재명 → 면적 집계 (자재별 물량 산출서) */
export function aggregateByMaterial(rooms: Room[]): { material: string; area: number; type: string }[] {
  const map = new Map<string, { material: string; area: number; type: string }>();
  const add = (material: string, type: string, area: number) => {
    const key = `${type}__${material}`;
    if (!material.trim() || area <= 0) return;
    const cur = map.get(key);
    if (cur) cur.area += area;
    else map.set(key, { material, type, area });
  };
  for (const r of rooms) {
    const res = calcRoom(r);
    add(r.finish.floor, "바닥", res.floor);
    add(r.finish.wall, "벽", res.wall);
    add(r.finish.ceiling, "천장", res.ceiling);
    add(r.finish.baseboard, "걸레받이", res.baseboard);
  }
  return Array.from(map.values()).sort((a, b) => (a.type + a.material).localeCompare(b.type + b.material, "ko"));
}
