// ============================================================
// 수식 평가 엔진 (독자 구현)
// 지원: 숫자, 변수, + - * / ^, 단항 ±, 괄호, 함수 호출
// 함수: ROUND(x[,n]) FLOOR(x) CEIL(x) ABS(x) SQRT(x) MIN(...) MAX(...)
// 변수/함수명은 영문·숫자·_ 및 한글 허용
// ============================================================

export type Scope = Record<string, number>;

type TokType = "num" | "id" | "op" | "lp" | "rp" | "comma";
interface Tok {
  t: TokType;
  v: string;
}

const FUNCS: Record<string, (a: number[]) => number> = {
  ROUND: (a) => {
    const n = a.length > 1 ? a[1] : 0;
    const f = Math.pow(10, n);
    return Math.round((a[0] + Number.EPSILON) * f) / f;
  },
  FLOOR: (a) => Math.floor(a[0]),
  CEIL: (a) => Math.ceil(a[0]),
  ABS: (a) => Math.abs(a[0]),
  SQRT: (a) => Math.sqrt(a[0]),
  MIN: (a) => Math.min(...a),
  MAX: (a) => Math.max(...a),
};

function isDigit(c: string): boolean {
  return c >= "0" && c <= "9";
}
function isIdentStart(c: string): boolean {
  return /[A-Za-z_가-힣]/.test(c);
}
function isIdentPart(c: string): boolean {
  return /[A-Za-z0-9_가-힣]/.test(c);
}

function tokenize(s: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (isDigit(c) || c === ".") {
      let j = i + 1;
      while (j < s.length && (isDigit(s[j]) || s[j] === ".")) j++;
      toks.push({ t: "num", v: s.slice(i, j) });
      i = j;
      continue;
    }
    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < s.length && isIdentPart(s[j])) j++;
      toks.push({ t: "id", v: s.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "^") {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") {
      toks.push({ t: "lp", v: c });
      i++;
      continue;
    }
    if (c === ")") {
      toks.push({ t: "rp", v: c });
      i++;
      continue;
    }
    if (c === ",") {
      toks.push({ t: "comma", v: c });
      i++;
      continue;
    }
    throw new Error(`알 수 없는 문자: '${c}'`);
  }
  return toks;
}

class Parser {
  private toks: Tok[];
  private pos = 0;
  private scope: Scope;

  constructor(toks: Tok[], scope: Scope) {
    this.toks = toks;
    this.scope = scope;
  }

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }
  private next(): Tok {
    return this.toks[this.pos++];
  }

  parse(): number {
    if (this.toks.length === 0) return 0;
    const v = this.expr();
    if (this.pos < this.toks.length) throw new Error("수식 구문 오류");
    return v;
  }

  // 덧셈·뺄셈
  private expr(): number {
    let v = this.term();
    let t = this.peek();
    while (t && t.t === "op" && (t.v === "+" || t.v === "-")) {
      const op = this.next().v;
      const r = this.term();
      v = op === "+" ? v + r : v - r;
      t = this.peek();
    }
    return v;
  }

  // 곱셈·나눗셈
  private term(): number {
    let v = this.power();
    let t = this.peek();
    while (t && t.t === "op" && (t.v === "*" || t.v === "/")) {
      const op = this.next().v;
      const r = this.power();
      v = op === "*" ? v * r : v / r;
      t = this.peek();
    }
    return v;
  }

  // 거듭제곱 (우결합)
  private power(): number {
    const v = this.unary();
    const t = this.peek();
    if (t && t.t === "op" && t.v === "^") {
      this.next();
      return Math.pow(v, this.power());
    }
    return v;
  }

  private unary(): number {
    const t = this.peek();
    if (t && t.t === "op" && t.v === "-") {
      this.next();
      return -this.unary();
    }
    if (t && t.t === "op" && t.v === "+") {
      this.next();
      return this.unary();
    }
    return this.atom();
  }

  private atom(): number {
    const t = this.peek();
    if (!t) throw new Error("수식이 비어 있습니다");

    if (t.t === "num") {
      this.next();
      const n = parseFloat(t.v);
      if (!isFinite(n)) throw new Error(`잘못된 숫자: ${t.v}`);
      return n;
    }

    if (t.t === "lp") {
      this.next();
      const v = this.expr();
      const close = this.peek();
      if (!close || close.t !== "rp") throw new Error("괄호가 닫히지 않았습니다");
      this.next();
      return v;
    }

    if (t.t === "id") {
      this.next();
      const after = this.peek();
      if (after && after.t === "lp") {
        // 함수 호출
        this.next();
        const args: number[] = [];
        if (this.peek() && this.peek()!.t !== "rp") {
          args.push(this.expr());
          while (this.peek() && this.peek()!.t === "comma") {
            this.next();
            args.push(this.expr());
          }
        }
        const close = this.peek();
        if (!close || close.t !== "rp") throw new Error("함수 괄호가 닫히지 않았습니다");
        this.next();
        const fn = FUNCS[t.v.toUpperCase()];
        if (!fn) throw new Error(`알 수 없는 함수: ${t.v}`);
        return fn(args);
      }
      // 변수 참조
      if (Object.prototype.hasOwnProperty.call(this.scope, t.v)) {
        return this.scope[t.v];
      }
      throw new Error(`알 수 없는 변수: ${t.v}`);
    }

    throw new Error("수식 구문 오류");
  }
}

/** 수식을 평가해 숫자를 반환. 오류 시 throw. */
export function evalFormula(expr: string, scope: Scope): number {
  if (!expr || !expr.trim()) return 0;
  return new Parser(tokenize(expr), scope).parse();
}

/** 수식을 안전하게 평가. 오류 시 value=0, error 메시지 반환. */
export function tryEval(expr: string, scope: Scope): { value: number; error?: string } {
  try {
    return { value: evalFormula(expr, scope) };
  } catch (e) {
    return { value: 0, error: (e as Error).message };
  }
}

/** 수식에서 사용된 변수명 목록 추출 (검증·자동완성용) */
export function extractVars(expr: string): string[] {
  const out = new Set<string>();
  let toks: Tok[];
  try {
    toks = tokenize(expr);
  } catch {
    return [];
  }
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const nxt = toks[i + 1];
    if (t.t === "id" && !(nxt && nxt.t === "lp")) out.add(t.v);
  }
  return Array.from(out);
}
