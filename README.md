# KCOST Suite — 건설 적산 통합 스위트

하우코스트 **XCOST**, 고려전산 **RC / FIN** 프로그램의 핵심 개념을 참고해 만든 오픈소스 건설 적산 웹앱입니다.
런처 화면에서 아이콘을 클릭하면 세 개의 독립 모듈로 진입합니다 (넥슨 게임 런처 방식).

> ⚠️ **면책**: 본 프로젝트는 상용 프로그램의 코드를 복제한 것이 아니라, 공개된 적산 개념과 조달청 「예정가격 작성기준」을 바탕으로 독자적으로 구현한 학습/실무 보조용 도구입니다. 실제 입찰·계약 산출물로 쓰기 전에는 반드시 검증하세요.

## 모듈 구성

| 아이콘 | 모듈 | 참고 원본 | 주요 기능 |
|---|---|---|---|
| 📋 | **통합내역 · 일위대가** | XCOST | 내역서 작성, 일위대가 호표 구성, 원가계산서(간접비·일반관리비·이윤·부가세) 자동 산출 |
| 🏗️ | **RC 골조물량** | 고려전산 RC | 기둥·보·슬래브·벽·기초 부재 입력 → 콘크리트(m³)·거푸집(m²)·철근(kg/ton) 규격별 자동 산출 |
| 🎨 | **FIN 마감물량** | 고려전산 FIN | 실(room)별 치수·마감 사양 입력 → 바닥·벽·천장·걸레받이 면적 산출 및 자재별 집계 |

## 산출 방식 (요약)

**원가계산서** — 내역서의 재료비/노무비/경비 합계를 직접공사비로 삼아 다음을 계산합니다.
간접노무비, 산재·고용·건강보험·국민연금·장기요양, 안전관리비, 환경보전비, 기타경비 → 순공사원가 → 일반관리비 → 이윤 → 총원가 → 부가세 → 도급액.
모든 요율(%)은 화면에서 직접 수정 가능하며 기본값은 조달청 기준입니다.

**RC 골조물량**
- 기둥: 콘크리트 `b·h·L`, 거푸집 `2(b+h)·L`
- 보: 콘크리트 `b·h·L`, 거푸집 `(2h+b)·L`
- 슬래브: 콘크리트 `면적·t`, 거푸집 `면적`
- 벽: 콘크리트 `면적·t`, 거푸집 `면적·2`
- 기초: 콘크리트 `b·h·L`, 거푸집 `2(b+L)·h`
- 철근: `Σ(부재당 개수 × 가닥길이 × 단위중량)` × 부재 개수 (KS D 3504 단위중량 적용)

**FIN 마감물량**
- 바닥/천장 = `가로·세로`, 벽 = `2(가로+세로)·천장고 − 개구부`, 걸레받이 = `둘레·걸레받이높이`
- 모든 값에 실 개수를 곱하고, 마감재명 기준으로 자재별 물량을 합산

데이터는 브라우저 `localStorage`에 자동 저장됩니다 (서버 불필요).

## 기술 스택

React 18 · TypeScript · Vite. 외부 UI 라이브러리 없이 순수 CSS.

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 타입체크 + 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
```

## 프로젝트 구조

```
src/
  App.tsx                 런처 ↔ 모듈 라우팅
  components/
    Launcher.tsx          아이콘 그리드 런처
    Cells.tsx             테이블 입력 셀
  modules/
    EstimateModule.tsx    내역서 / 일위대가 / 원가계산서
    RCModule.tsx          골조물량 산출
    FINModule.tsx         마감물량 산출
  lib/
    costCalc.ts           원가계산 엔진 + 기본 요율
    rcCalc.ts             골조 물량 산식
    finCalc.ts            마감 면적 산식 + 자재 집계
    rebar.ts              철근 단위중량표
    format.ts / storage.ts
  types.ts                전 모듈 타입 정의
```

## GitHub에 올리기

이 폴더에서:

```bash
git init
git add .
git commit -m "feat: KCOST Suite 초기 버전 (내역/일위대가, RC, FIN)"

# GitHub에서 빈 저장소를 만든 뒤 (README 추가 없이):
git branch -M main
git remote add origin https://github.com/<사용자명>/kcost-suite.git
git push -u origin main
```

> GitHub CLI(`gh`)가 설치되어 있으면 한 번에:
> ```bash
> gh repo create kcost-suite --public --source=. --remote=origin --push
> ```

## 라이선스

MIT
