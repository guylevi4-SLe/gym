'use strict';
// Animated illustrations for exercises without a photo. Each is a small SVG (viewBox 64×64);
// the moving parts carry classes animated in styles.css (.ic-…). Colors come from the palette.
(() => {
  const o = (x, y) => `style="transform-origin:${x}px ${y}px"`;
  const svg = (name, body) => `<svg class="ic ic-${name}" viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;

  const ICONS = {
    treadmill: () => svg('treadmill', `
      <rect class="ef soft" x="6" y="49" width="48" height="7" rx="3.5"/>
      <path class="e belt" d="M10 52.5 H50"/>
      <path class="e" d="M51 50 L47 25 M41 25 H52"/>
      <g class="f">
        <g class="sw rev" ${o(27, 32)}><path d="M27 32 L24 41 L26 49"/></g>
        <path d="M27 32 L30 19"/>
        <g class="sw rev" ${o(30, 21)}><path d="M30 21 L35 27 L40 25"/></g>
        <g class="sw" ${o(27, 32)}><path d="M27 32 L31 40 L28 49"/></g>
        <g class="sw" ${o(30, 21)}><path d="M30 21 L25 28 L28 32"/></g>
      </g>
      <circle class="fh" cx="32" cy="13" r="4.5"/>`),

    elliptical: () => svg('elliptical', `
      <path class="e" d="M8 56 H56 M14 56 L20 50 H46 L50 56"/>
      <g class="spin" ${o(14, 47)}><circle class="e" cx="14" cy="47" r="5"/><path class="e" d="M14 42 V52"/></g>
      <g class="sw sm" ${o(40, 50)}><path class="e" d="M40 50 L36 20"/></g>
      <g class="sw sm rev" ${o(44, 50)}><path class="e" d="M44 50 L42 20"/></g>
      <g class="f">
        <g class="sw sm rev" ${o(27, 32)}><path d="M27 32 L25 41 L22 49"/></g>
        <g class="sw sm" ${o(27, 32)}><path d="M27 32 L31 41 L32 49"/></g>
        <path d="M27 32 L28 18 M28 21 L36 27 L38 22"/>
      </g>
      <circle class="fh" cx="29" cy="12" r="4.5"/>`),

    bike: () => svg('bike', `
      <path class="e" d="M10 56 H54 M18 56 L26 46 H44 M26 46 L22 31 M17 30 H27 M44 46 L43 24 M39 24 H48"/>
      <g class="spin" ${o(44, 46)}><circle class="e" cx="44" cy="46" r="8"/><path class="e" d="M44 38 V54 M36 46 H52"/></g>
      <g class="spin fast" ${o(31, 46)}><path class="e" d="M31 40 V52"/></g>
      <g class="f">
        <path d="M22 29 L30 17 M30 19 L41 24"/>
        <g class="sw xs" ${o(22, 29)}><path d="M22 29 L33 34 L31 44"/></g>
      </g>
      <circle class="fh" cx="31" cy="11" r="4.5"/>`),

    rower: () => svg('rower', `
      <path class="e" d="M6 54 H58"/>
      <g class="spin" ${o(52, 44)}><circle class="e" cx="52" cy="44" r="7"/><path class="e" d="M52 37 V51 M45 44 H59"/></g>
      <g class="slide">
        <rect class="ef soft" x="14" y="47" width="12" height="4" rx="2"/>
        <g class="f"><path d="M20 46 L31 36 L40 50 M20 46 L24 29 M24 32 L38 38"/></g>
        <circle class="fh" cx="25" cy="23" r="4.5"/>
      </g>`),

    stairs: () => svg('stairs', `
      <path class="e" d="M6 58 V50 H18 V42 H30 V34 H42 V26 H54 V18"/>
      <g class="f">
        <path d="M35 22 L34 34"/>
        <g class="lift"><path d="M35 22 L41 24 L41 30"/></g>
        <path d="M35 22 L36 11 M36 14 L42 19 M36 14 L30 20"/>
      </g>
      <circle class="fh" cx="37" cy="6" r="4.2"/>`),

    rope: () => svg('rope', `
      <path class="e" d="M12 58 H52"/>
      <g class="hop">
        <g class="rope" ${o(32, 30)}><path class="e" d="M22 30 C 17 64, 47 64, 42 30"/></g>
        <g class="f"><path d="M32 36 L28 52 M32 36 L36 52 M32 36 V20 M32 22 L22 30 M32 22 L42 30"/></g>
        <circle class="fh" cx="32" cy="13" r="4.5"/>
      </g>`),

    dumbbell: () => svg('dumbbell', `
      <g class="f"><path d="M30 38 L26 55 M30 38 L34 55 M30 38 V19 M30 21 V33"/></g>
      <g class="curl" ${o(30, 33)}>
        <path class="f" d="M30 33 V44"/>
        <path class="e" d="M25 46 H35"/>
        <rect class="fh" x="22" y="42" width="4" height="8" rx="1.5"/><rect class="fh" x="34" y="42" width="4" height="8" rx="1.5"/>
      </g>
      <circle class="fh" cx="30" cy="12" r="4.5"/>`),

    barbell: () => svg('barbell', `
      <ellipse class="ef soft shadow" cx="32" cy="57" rx="22" ry="2.5" ${o(32, 57)}/>
      <g class="lift big">
        <path class="e" d="M6 34 H58"/>
        <rect class="fh" x="10" y="22" width="6" height="24" rx="2"/><rect class="fh" x="17" y="26" width="4" height="16" rx="1.5"/>
        <rect class="fh" x="48" y="22" width="6" height="24" rx="2"/><rect class="fh" x="43" y="26" width="4" height="16" rx="1.5"/>
      </g>`),

    stack: () => svg('stack', `
      <path class="e" d="M14 58 V8 H50 V58"/>
      <g class="spin" ${o(32, 13)}><circle class="e" cx="32" cy="13" r="4"/><circle class="ef" cx="32" cy="9" r="1.2"/></g>
      <g class="cable" ${o(32, 17)}><path class="e" d="M32 17 V39"/></g>
      <rect class="fh soft" x="22" y="47" width="20" height="4" rx="1"/><rect class="fh soft" x="22" y="52" width="20" height="4" rx="1"/>
      <g class="lift">
        <rect class="fh" x="22" y="39" width="20" height="4" rx="1"/><rect class="fh" x="22" y="44" width="20" height="2.5" rx="1"/>
      </g>`),

    legpress: () => svg('legpress', `
      <path class="e" d="M26 56 L56 26 M8 54 H26 M12 54 L18 36"/>
      <g class="press"><path class="e" d="M38 30 L48 40"/><rect class="fh" x="45" y="22" width="5" height="10" rx="1.5" transform="rotate(45 47.5 27)"/></g>
      <g class="f">
        <path d="M17 38 L21 50"/>
        <g class="legp" ${o(21, 50)}><path d="M21 50 L32 38 L42 36"/></g>
        <path d="M18 40 L28 46"/>
      </g>
      <circle class="fh" cx="15" cy="31" r="4.5"/>`),

    pushup: () => svg('pushup', `
      <path class="e" d="M6 55 H58"/>
      <g class="arms" ${o(20, 54)}><path class="f" d="M20 54 V43"/></g>
      <g class="push" ${o(52, 53)}>
        <path class="f" d="M52 53 L20 43"/>
        <circle class="fh" cx="13" cy="40" r="4.5"/>
      </g>`),

    pullup: () => svg('pullup', `
      <path class="e" d="M8 10 H56 M12 10 V4 M52 10 V4"/>
      <g class="arms" ${o(32, 10)}><path class="f" d="M22 10 L27 30 M42 10 L37 30 M27 30 H37"/></g>
      <g class="rise">
        <g class="f"><path d="M32 30 V45 M32 45 L28 55 L31 60 M32 45 L36 55 L39 59"/></g>
        <circle class="fh" cx="32" cy="24" r="4.5"/>
      </g>`),

    crunch: () => svg('crunch', `
      <path class="e" d="M6 54 H58"/>
      <g class="f"><path d="M32 52 L42 38 L52 52"/></g>
      <g class="crunch" ${o(32, 52)}>
        <path class="f" d="M32 52 L15 50 M17 49 L12 44"/>
        <circle class="fh" cx="9" cy="48" r="4.5"/>
      </g>`),

    heart: () => svg('heart', `
      <g class="beat" ${o(32, 34)}><path class="fh" d="M32 52 C 10 38, 8 22, 20 17 C 26 15, 30 18, 32 22 C 34 18, 38 15, 44 17 C 56 22, 54 38, 32 52 Z"/></g>
      <path class="e pulse" d="M10 36 H22 L26 28 L31 42 L35 32 L38 36 H54"/>`),
  };

  // ---- Pose-based illustrations: a stick figure that moves between two poses (SMIL), so limbs stay joined.
  // Pose keys: h head, n neck/shoulders, p pelvis, k1/f1/t1 + k2/f2/t2 knee/foot/toe, e1/w1 + e2/w2 elbow/hand,
  // sw/hw = half width of shoulders/hips for front views. A single arm or leg may be given as e/w or k/f.
  const pt = a => `${a[0]} ${a[1]}`;
  const norm = P => ({ ...P, e1: P.e1 || P.e, w1: P.w1 || P.w, k1: P.k1 || P.k, f1: P.f1 || P.f });
  function bodyD(P) {
    const { n, p } = P, sw = P.sw || 0, hw = P.hw || 0;
    let d = `M${pt(n)} L${pt(p)}`;
    if (sw) d += ` M${n[0] - sw} ${n[1] + 1} H${n[0] + sw}`;
    if (hw) d += ` M${p[0] - hw} ${p[1]} H${p[0] + hw}`;
    const leg = (k, f, t, dx) => ` M${p[0] + dx} ${p[1]} L${pt(k)} L${pt(f)}${t ? ` L${pt(t)}` : ''}`;
    if (P.k1) d += leg(P.k1, P.f1, P.t1, -hw);
    if (P.k2) d += leg(P.k2, P.f2, P.t2, hw);
    const arm = (e, w, dx) => ` M${n[0] + dx} ${n[1] + (dx ? 1 : 0)} L${pt(e)} L${pt(w)}`;
    if (P.e1) d += arm(P.e1, P.w1, -sw);
    if (P.e2) d += arm(P.e2, P.w2, sw);
    return d;
  }
  // Equipment helpers (return [class, path] or ['circle', class, x, y, r])
  const db = (w, vertical) => ['f db', vertical
    ? `M${w[0]} ${w[1] - 5} V${w[1] + 5} M${w[0] - 3} ${w[1] - 5} H${w[0] + 3} M${w[0] - 3} ${w[1] + 5} H${w[0] + 3}`
    : `M${w[0] - 5} ${w[1]} H${w[0] + 5} M${w[0] - 5} ${w[1] - 3} V${w[1] + 3} M${w[0] + 5} ${w[1] - 3} V${w[1] + 3}`];
  const plate = (c, r = 6) => ['circle', 'pl', c[0], c[1], r];
  const pad = c => ['circle', 'ef', c[0], c[1], 3];
  const line = (a, b, cls = 'e') => [cls, `M${pt(a)} L${pt(b)}`];
  const V = (A, o) => ({ ...A, ...o });

  const anim = (attr, a, b, dur) => a === b ? '' :
    `<animate attributeName="${attr}" values="${a};${b};${a}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>`;
  function item(a, b, dur) {
    if (a[0] === 'circle') {
      const [, cls, x, y, r] = a, [, , x2, y2] = b;
      return `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}">${anim('cx', x, x2, dur)}${anim('cy', y, y2, dur)}</circle>`;
    }
    return `<path class="${a[0]}" d="${a[1]}">${anim('d', a[1], b[1], dur)}</path>`;
  }
  function posed(name, def) {
    const A = norm(def.A), B = norm(def.B), dur = def.dur || 1.8;
    const eqA = def.eq ? def.eq(A) : [], eqB = def.eq ? def.eq(B) : [];
    const back = [], front = [];
    eqA.forEach((x, i) => (/\bover\b/.test(x[0] === 'circle' ? x[1] : x[0]) ? front : back).push(item(x, eqB[i], dur)));
    return svg(name, `${back.join('')}
      <path class="f" d="${bodyD(A)}">${anim('d', bodyD(A), bodyD(B), dur)}</path>
      <circle class="fh" cx="${A.h[0]}" cy="${A.h[1]}" r="4.5">${anim('cx', A.h[0], B.h[0], dur)}${anim('cy', A.h[1], B.h[1], dur)}</circle>
      ${front.join('')}`);
  }

  // Shared base poses
  const SEAT = { p: [18, 47], n: [16, 30], h: [17, 23], k: [30, 47], f: [31, 57] };               // seated, facing right
  const STAND = { h: [32, 11], n: [32, 18], p: [32, 35], k1: [31, 46], f1: [31, 57], k2: [33, 46], f2: [34, 57] }; // side
  const FRONT = { h: [32, 11], n: [32, 18], p: [32, 35], sw: 5, hw: 4, k1: [28, 46], f1: [27, 57], k2: [36, 46], f2: [37, 57] };
  const FRONT_SEAT = { h: [32, 13], n: [32, 20], p: [32, 37], sw: 5, hw: 4, k1: [24, 44], f1: [24, 56], k2: [40, 44], f2: [40, 56] };
  const seat = ['e', 'M10 50 H30 M20 50 V58 M12 58 H28'], back = ['e', 'M12 50 L11 22'], floor = ['e', 'M6 58 H58'];
  const frontSeat = ['e soft', 'M24 42 H40 M26 42 V18 H38 V42'];

  const POSED = {
    chestpress: { A: V(SEAT, { e: [19, 38], w: [27, 34] }), B: V(SEAT, { e: [29, 32], w: [40, 32] }),
      eq: P => [seat, ['e', 'M12 50 L10 20 M10 20 V8 H16'], line([16, 8], [P.w[0], P.w[1] - 3]), ['e over', `M${P.w[0]} ${P.w[1] - 4} V${P.w[1] + 4}`]] },
    inclinepress: { A: V(SEAT, { n: [11, 32], h: [8, 26], e: [14, 40], w: [21, 31] }), B: V(SEAT, { n: [11, 32], h: [8, 26], e: [22, 26], w: [31, 18] }),
      eq: P => [seat, ['e', 'M12 50 L5 28 M5 28 L3 8 H9'], line([9, 8], [P.w[0] - 1, P.w[1] - 3]), ['e over', `M${P.w[0] - 3} ${P.w[1] - 3} L${P.w[0] + 3} ${P.w[1] + 3}`]] },
    pecdeck: { A: V(FRONT_SEAT, { e1: [18, 22], w1: [18, 12], e2: [46, 22], w2: [46, 12] }), B: V(FRONT_SEAT, { e1: [26, 27], w1: [29, 17], e2: [38, 27], w2: [35, 17] }),
      eq: P => [frontSeat, ['e', 'M8 6 H56'], line([P.w1[0], P.w1[1] - 2], [P.e1[0], P.e1[1] + 2], 'e over thick'), line([P.w2[0], P.w2[1] - 2], [P.e2[0], P.e2[1] + 2], 'e over thick')] },
    reversefly: { A: V(FRONT_SEAT, { e1: [27, 25], w1: [30, 24], e2: [37, 25], w2: [34, 24] }), B: V(FRONT_SEAT, { e1: [19, 21], w1: [10, 21], e2: [45, 21], w2: [54, 21] }),
      eq: P => [frontSeat, ['e', 'M8 6 H56'], pad(P.w1), pad(P.w2)] },
    pulldown: { A: V(FRONT_SEAT, { n: [32, 24], h: [32, 17], p: [32, 40], e1: [23, 16], w1: [18, 8], e2: [41, 16], w2: [46, 8] }),
      B: V(FRONT_SEAT, { n: [32, 24], h: [32, 17], p: [32, 40], e1: [19, 30], w1: [20, 21], e2: [45, 30], w2: [44, 21] }),
      eq: P => [['e', 'M22 47 H42'], ['e', `M32 2 V${P.w1[1]}`], ['e over thick', `M12 ${P.w1[1]} H52`]] },
    cablerow: { A: { p: [18, 50], n: [25, 34], h: [28, 28], k: [32, 43], f: [44, 52], e: [33, 39], w: [41, 42] },
      B: { p: [18, 50], n: [19, 33], h: [20, 26], k: [32, 43], f: [44, 52], e: [13, 41], w: [24, 43] },
      eq: P => [['e', 'M8 54 H28 M46 58 L48 44 M56 58 V30'], line([56, 42], P.w), ['e over', `M${P.w[0]} ${P.w[1] - 3} V${P.w[1] + 3}`]] },
    machinerow: { A: V(SEAT, { n: [29, 31], h: [33, 26], e: [38, 40], w: [46, 44] }), B: V(SEAT, { n: [29, 31], h: [33, 26], e: [22, 37], w: [32, 42] }),
      eq: P => [seat, ['e thick', 'M36 26 V42'], ['e', 'M54 58 V30'], line([54, 32], P.w), ['e over', `M${P.w[0]} ${P.w[1] - 3} V${P.w[1] + 3}`]] },
    backext: { A: { f: [14, 54], k: [21, 46], p: [30, 38], n: [34, 53], h: [34, 60], e: [36, 47], w: [33, 44] },
      B: { f: [14, 54], k: [21, 46], p: [30, 38], n: [42, 27], h: [46, 22], e: [40, 33], w: [38, 30] },
      eq: P => [['e', 'M10 58 L32 42 M28 36 L36 43 M12 52 L16 57']] },
    shoulderpress: { A: V(SEAT, { e: [24, 36], w: [25, 25] }), B: V(SEAT, { e: [22, 20], w: [22, 10] }),
      eq: P => [seat, ['e', 'M12 50 L11 6'], line([11, 6], P.w), ['e over', `M${P.w[0] - 3} ${P.w[1]} H${P.w[0] + 4}`]] },
    dbpress: { A: V(FRONT, { e1: [20, 25], w1: [20, 16], e2: [44, 25], w2: [44, 16] }), B: V(FRONT, { e1: [23, 12], w1: [25, 3], e2: [41, 12], w2: [39, 3] }),
      eq: P => [floor, db(P.w1), db(P.w2)].map((x, i) => i ? [x[0] + ' over', x[1]] : x) },
    lateral: { A: V(FRONT, { e1: [25, 27], w1: [24, 35], e2: [39, 27], w2: [40, 35] }), B: V(FRONT, { e1: [19, 19], w1: [10, 19], e2: [45, 19], w2: [54, 19] }),
      eq: P => [floor, [...db(P.w1, true)], [...db(P.w2, true)]] },
    lateralmachine: { A: V(FRONT_SEAT, { e1: [25, 29], w1: [25, 37], e2: [39, 29], w2: [39, 37] }), B: V(FRONT_SEAT, { e1: [19, 21], w1: [11, 21], e2: [45, 21], w2: [53, 21] }),
      eq: P => [frontSeat, pad(P.e1), pad(P.e2)] },
    preacher: { A: V(SEAT, { n: [22, 30], h: [25, 23], e: [34, 39], w: [42, 47] }), B: V(SEAT, { n: [22, 30], h: [25, 23], e: [34, 39], w: [37, 29] }),
      eq: P => [seat, ['e thick', 'M24 37 L38 44'], ['e over', `M${P.w[0] - 4} ${P.w[1]} H${P.w[0] + 4}`]] },
    curl: { A: V(STAND, { e: [32, 28], w: [33, 37] }), B: V(STAND, { e: [32, 28], w: [38, 21] }), eq: P => [floor, db(P.w)] },
    hammer: { A: V(STAND, { e: [32, 28], w: [33, 37] }), B: V(STAND, { e: [32, 28], w: [38, 21] }), eq: P => [floor, db(P.w, true)] },
    pushdown: { A: V(STAND, { h: [30, 11], n: [29, 18], p: [27, 35], k1: [27, 46], f1: [26, 57], k2: [28, 46], f2: [30, 57], e: [31, 28], w: [38, 23] }),
      B: V(STAND, { h: [30, 11], n: [29, 18], p: [27, 35], k1: [27, 46], f1: [26, 57], k2: [28, 46], f2: [30, 57], e: [31, 28], w: [35, 37] }),
      eq: P => [floor, ['e', 'M52 58 V4'], line([52, 6], P.w), ['e over', `M${P.w[0] - 3} ${P.w[1]} H${P.w[0] + 3}`]] },
    ohext: { A: { h: [33, 19], n: [31, 26], p: [31, 42], k1: [30, 50], f1: [30, 58], k2: [32, 50], f2: [33, 58], e: [29, 14], w: [22, 20] },
      B: { h: [33, 19], n: [31, 26], p: [31, 42], k1: [30, 50], f1: [30, 58], k2: [32, 50], f2: [33, 58], e: [29, 14], w: [28, 4] },
      eq: P => [floor, db(P.w, true)] },
    dips: { A: { h: [33, 9], n: [32, 16], p: [32, 32], k: [28, 42], f: [33, 47], e: [31, 23], w: [32, 30] },
      B: { h: [33, 19], n: [32, 26], p: [31, 42], k: [27, 51], f: [32, 56], e: [25, 28], w: [32, 30] },
      eq: P => [['e', 'M16 30 H48 M22 30 V58 M42 30 V58']] },
    assisteddips: { A: { h: [33, 9], n: [32, 16], p: [32, 32], k: [32, 43], f: [24, 44], e: [31, 23], w: [32, 30] },
      B: { h: [33, 19], n: [32, 26], p: [31, 42], k: [31, 53], f: [23, 54], e: [25, 28], w: [32, 30] },
      eq: P => [['e', 'M16 30 H48 M44 30 V58 M20 30 V36'], ['e thick', `M20 ${P.k1[1] + 3} H38`]] },
    assistedpullup: { A: { h: [33, 30], n: [32, 36], p: [32, 50], k: [32, 56], f: [24, 57], e: [33, 23], w: [32, 10] },
      B: { h: [33, 18], n: [32, 24], p: [32, 40], k: [32, 46], f: [24, 47], e: [26, 18], w: [32, 10] },
      eq: P => [['e', 'M10 10 H54 M50 10 V58'], ['e thick', `M20 ${P.k1[1] + 3} H40`]] },
    legext: { A: V(SEAT, { p: [16, 44], n: [14, 27], h: [15, 20], k: [30, 44], f: [32, 56], e: [17, 36], w: [24, 45] }),
      B: V(SEAT, { p: [16, 44], n: [14, 27], h: [15, 20], k: [30, 44], f: [41, 38], e: [17, 36], w: [24, 45] }),
      eq: P => [['e', 'M10 47 H32 M10 47 L9 20 M20 47 V58'], pad([P.f1[0] + 1, P.f1[1] - 1])] },
    legcurl: { A: { h: [9, 36], n: [15, 40], p: [30, 40], k: [41, 40], f: [52, 40], e: [12, 46], w: [10, 46] },
      B: { h: [9, 36], n: [15, 40], p: [30, 40], k: [41, 40], f: [36, 30], e: [12, 46], w: [10, 46] },
      eq: P => [['e', 'M8 45 H44 M12 45 V58 M38 45 V58'], pad([P.f1[0], P.f1[1] - 2])] },
    seatedcurl: { A: V(SEAT, { p: [16, 44], n: [14, 27], h: [15, 20], k: [30, 44], f: [42, 44], e: [17, 36], w: [24, 45] }),
      B: V(SEAT, { p: [16, 44], n: [14, 27], h: [15, 20], k: [30, 44], f: [28, 55], e: [17, 36], w: [24, 45] }),
      eq: P => [['e', 'M10 47 H32 M10 47 L9 20 M20 47 V58 M24 39 H33'], pad([P.f1[0], P.f1[1] + 2])] },
    adduct: { A: V(FRONT_SEAT, { e1: [25, 30], w1: [23, 38], e2: [39, 30], w2: [41, 38], k1: [17, 43], f1: [14, 55], k2: [47, 43], f2: [50, 55] }),
      B: V(FRONT_SEAT, { e1: [25, 30], w1: [23, 38], e2: [39, 30], w2: [41, 38], k1: [28, 46], f1: [28, 57], k2: [36, 46], f2: [36, 57] }),
      eq: P => [frontSeat, pad([P.k1[0] + 3, P.k1[1] + 2]), pad([P.k2[0] - 3, P.k2[1] + 2])] },
    abduct: { A: V(FRONT_SEAT, { e1: [25, 30], w1: [23, 38], e2: [39, 30], w2: [41, 38], k1: [28, 46], f1: [28, 57], k2: [36, 46], f2: [36, 57] }),
      B: V(FRONT_SEAT, { e1: [25, 30], w1: [23, 38], e2: [39, 30], w2: [41, 38], k1: [17, 43], f1: [14, 55], k2: [47, 43], f2: [50, 55] }),
      eq: P => [frontSeat, pad([P.k1[0] - 3, P.k1[1] + 2]), pad([P.k2[0] + 3, P.k2[1] + 2])] },
    calf: { A: { h: [31, 8], n: [30, 15], p: [30, 32], k: [30, 42], f: [30, 51], t1: [36, 52], e: [25, 12], w: [27, 9] },
      B: { h: [31, 3], n: [30, 10], p: [30, 27], k: [30, 37], f: [31, 46], t1: [36, 52], e: [25, 7], w: [27, 4] },
      eq: P => [['e', 'M30 52 H44 V58 M8 58 H56'], ['e thick', `M22 ${P.n[1] + 1} H38`]] },
    squat: { A: V(STAND, { h: [33, 11], n: [31, 18], p: [30, 35], k1: [32, 46], f1: [31, 57], k2: [32, 46], f2: [31, 57], e: [25, 24], w: [31, 17] }),
      B: V(STAND, { h: [37, 23], n: [34, 30], p: [24, 44], k1: [36, 48], f1: [31, 57], k2: [36, 48], f2: [31, 57], e: [28, 36], w: [34, 29] }),
      eq: P => [floor, plate([P.n[0] - 4, P.n[1] + 1], 5)].map((x, i) => i ? [x[0], 'pl over', ...x.slice(2)] : x) },
    smith: { A: V(STAND, { h: [33, 11], n: [31, 18], p: [30, 35], k1: [32, 46], f1: [31, 57], k2: [32, 46], f2: [31, 57], e: [25, 24], w: [31, 17] }),
      B: V(STAND, { h: [37, 23], n: [34, 30], p: [24, 44], k1: [36, 48], f1: [31, 57], k2: [36, 48], f2: [31, 57], e: [28, 36], w: [34, 29] }),
      eq: P => [floor, ['e', 'M48 4 V58 M14 4 V58'], ['e thick over', `M10 ${P.n[1] - 1} H52`]] },
    bwsquat: { A: V(STAND, { h: [33, 11], n: [31, 18], p: [30, 35], k1: [32, 46], f1: [31, 57], k2: [32, 46], f2: [31, 57], e: [38, 22], w: [46, 22] }),
      B: V(STAND, { h: [37, 23], n: [34, 30], p: [24, 44], k1: [36, 48], f1: [31, 57], k2: [36, 48], f2: [31, 57], e: [42, 31], w: [50, 31] }),
      eq: () => [floor] },
    deadlift: { A: { f: [32, 57], k: [37, 48], p: [24, 42], n: [37, 30], h: [42, 25], e: [37, 40], w: [37, 49] },
      B: { f: [32, 57], k: [33, 46], p: [31, 35], n: [32, 19], h: [33, 12], e: [33, 27], w: [33, 36] },
      eq: P => [floor, plate([P.w1[0], P.w1[1] + 1], 7)].map((x, i) => i ? ['circle', 'pl over', ...x.slice(2)] : x) },
    bentrow: { A: { f: [28, 57], k: [33, 47], p: [22, 38], n: [38, 30], h: [44, 27], e: [39, 39], w: [39, 47] },
      B: { f: [28, 57], k: [33, 47], p: [22, 38], n: [38, 30], h: [44, 27], e: [31, 30], w: [36, 38] },
      eq: P => [floor, ['circle', 'pl over', P.w1[0], P.w1[1], 6]] },
    dbrow: { A: { f: [22, 57], k: [24, 47], p: [20, 37], n: [36, 31], h: [42, 28], e: [32, 40], w: [32, 48], e2: [44, 36], w2: [46, 42] },
      B: { f: [22, 57], k: [24, 47], p: [20, 37], n: [36, 31], h: [42, 28], e: [26, 32], w: [30, 40], e2: [44, 36], w2: [46, 42] },
      eq: P => [['e', 'M40 44 H56 M44 44 V58 M52 44 V58'], db(P.w1)] },
    bench: { A: { h: [11, 37], n: [17, 40], p: [33, 41], k: [43, 37], f: [46, 56], e: [13, 46], w: [19, 33] },
      B: { h: [11, 37], n: [17, 40], p: [33, 41], k: [43, 37], f: [46, 56], e: [19, 32], w: [19, 22] },
      eq: P => [['e', 'M6 45 H40 M12 45 V58 M36 45 V58'], ['circle', 'pl over', P.w1[0], P.w1[1], 6]] },
    dbbench: { A: { h: [11, 37], n: [17, 40], p: [33, 41], k: [43, 37], f: [46, 56], e: [13, 46], w: [19, 33] },
      B: { h: [11, 37], n: [17, 40], p: [33, 41], k: [43, 37], f: [46, 56], e: [19, 32], w: [19, 22] },
      eq: P => [['e', 'M6 45 H40 M12 45 V58 M36 45 V58'], db(P.w1)] },
    lunge: { A: V(STAND, { e: [32, 26], w: [32, 34] }),
      B: { h: [32, 21], n: [31, 28], p: [31, 44], k1: [42, 46], f1: [42, 57], k2: [25, 53], f2: [16, 56], e: [31, 36], w: [31, 44] },
      eq: P => [floor, db(P.w1, true)] },
    hipthrust: { A: { h: [10, 35], n: [16, 39], p: [28, 52], k: [40, 44], f: [42, 57], e: [22, 46], w: [27, 50] },
      B: { h: [10, 35], n: [16, 39], p: [31, 38], k: [42, 40], f: [42, 57], e: [23, 39], w: [30, 36] },
      eq: P => [['e', 'M4 42 H18 M10 42 V58 M6 58 H58'], ['circle', 'pl over', P.p[0], P.p[1] - 3, 5]] },
    legraise: { A: { h: [36, 18], n: [32, 22], p: [32, 38], k: [32, 48], f: [32, 58], e: [32, 14], w: [32, 6] },
      B: { h: [36, 18], n: [32, 22], p: [31, 38], k: [42, 36], f: [52, 34], e: [32, 14], w: [32, 6] },
      eq: () => [['e', 'M10 6 H54']] },
    crossover: { A: V(FRONT, { e1: [20, 18], w1: [12, 13], e2: [44, 18], w2: [52, 13] }), B: V(FRONT, { e1: [25, 29], w1: [31, 37], e2: [39, 29], w2: [33, 37] }),
      eq: P => [['e', 'M4 2 V58 M60 2 V58 M2 58 H62'], line([4, 6], P.w1), line([60, 6], P.w2)] },
    machinecrunch: { A: V(SEAT, { e: [23, 31], w: [25, 24] }), B: V(SEAT, { n: [29, 33], h: [34, 29], e: [35, 37], w: [37, 30] }),
      eq: P => [seat, back, ['e thick over', `M${P.w[0] - 3} ${P.w[1] - 2} L${P.w[0] + 3} ${P.w[1] + 2}`]] },
    recumbent: { A: { p: [18, 47], n: [13, 31], h: [12, 24], k1: [32, 38], f1: [44, 41], k2: [32, 44], f2: [46, 51], e: [17, 40], w: [23, 46] },
      B: { p: [18, 47], n: [13, 31], h: [12, 24], k1: [32, 44], f1: [46, 51], k2: [32, 38], f2: [44, 41], e: [17, 40], w: [23, 46] }, dur: 1.1,
      eq: () => [['e', 'M10 50 H28 M14 50 L9 28 M20 50 V58 M10 58 H52 M45 46 V58'], ['circle', 'e', 45, 46, 6]] },
    seatedlegpress: { A: { h: [20, 21], n: [23, 28], p: [30, 44], k: [38, 27], f: [50, 32], e: [27, 36], w: [32, 43] },
      B: { h: [11, 23], n: [14, 30], p: [21, 46], k: [36, 37], f: [50, 32], e: [18, 38], w: [23, 45] },
      eq: P => [['e', 'M6 58 H62 M8 55 L44 47 M56 58 V36'], ['e thick over', 'M50 24 L55 39'],
        ['e', `M${P.p[0] - 9} ${P.p[1] + 3} H${P.p[0] + 6} M${P.p[0] - 1} ${P.p[1] + 3} V${P.p[1] + 7} M${P.p[0] - 7} ${P.p[1] + 1} L${P.n[0] - 6} ${P.n[1] - 4}`]] },
    kickback: { A: { h: [46, 20], n: [41, 26], p: [27, 35], k1: [29, 46], f1: [29, 57], k2: [29, 45], f2: [22, 52], e: [44, 34], w: [49, 39] },
      B: { h: [46, 20], n: [41, 26], p: [27, 35], k1: [29, 46], f1: [29, 57], k2: [16, 36], f2: [5, 34], e: [44, 34], w: [49, 39] },
      eq: P => [floor, ['e', 'M52 58 V24 M48 39 H54'], ['e thick', 'M37 27 L45 36'], pad([P.f2[0] + 2, P.f2[1] + 1])] },
    // Release and stretching
    foamroll: { A: { h: [12, 38], n: [18, 43], p: [33, 48], k: [44, 49], f: [56, 54], e: [18, 51], w: [14, 57] },
      B: { h: [20, 38], n: [26, 43], p: [41, 46], k: [48, 50], f: [58, 56], e: [26, 51], w: [22, 57] }, dur: 2.2,
      eq: () => [['e', 'M6 58 H60'], ['circle', 'ef over', 37, 53, 4.5]] },
    legstretch: { A: V(STAND, { e: [32, 27], w: [32, 35] }),
      B: { h: [43, 46], n: [40, 39], p: [31, 33], k1: [31, 46], f1: [31, 57], k2: [33, 46], f2: [34, 57], e: [38, 48], w: [35, 56] }, dur: 2.6,
      eq: () => [floor] },
    stretch: { A: V(FRONT, { e1: [23, 9], w1: [29, 1], e2: [41, 9], w2: [35, 1] }),
      B: V(FRONT, { n: [35, 19], h: [38, 12], p: [32, 35], e1: [30, 8], w1: [40, 1], e2: [47, 14], w2: [45, 4] }), dur: 2.6,
      eq: () => [floor] },
    armbike: { A: V(SEAT, { e: [27, 38], w: [37, 25] }), B: V(SEAT, { e: [27, 41], w: [43, 35] }), dur: 1.1,
      eq: () => [seat, ['e', 'M40 30 V58 M34 58 H50'], ['circle', 'e', 40, 30, 6]] },
  };
  for (const [k, def] of Object.entries(POSED)) ICONS[k] = () => posed(k, def);

  // First matching keyword wins, so the specific names come before the general ones.
  const RULES = [
    [/לחיצת רגליים בישיבה|seated leg press/i, 'seatedlegpress'],
    [/פשיטת ירך לאחור|בעיטה לאחור|קיקבק|kickback/i, 'kickback'],
    [/פומרולר|גליל|שחרור|foam|roller/i, 'foamroll'], [/מתיח(ת|ות) רגליים|leg stretch|hamstring stretch/i, 'legstretch'], [/מתיח|stretch|yoga|יוגה/i, 'stretch'],
    [/הליכון|ריצה/, 'treadmill'], [/אליפטי/, 'elliptical'], [/מכונת חתירה|חתירה במכונת/, 'rower'],
    [/אופני ידיים/, 'armbike'], [/אופני.*משענת|שכיבה/, 'recumbent'], [/אופני/, 'bike'], [/מדרגות|סטפר/, 'stairs'], [/חבל/, 'rope'],
    [/לחיצת חזה בשיפוע|שיפוע/, 'inclinepress'], [/לחיצת חזה במכונה/, 'chestpress'], [/לחיצת חזה במשקולות/, 'dbbench'], [/לחיצת חזה|בנץ׳|בנץ'/, 'bench'],
    [/פרפר הפוך|אחורי כתף/, 'reversefly'], [/פרפר|pec/i, 'pecdeck'], [/הצלבת כבלים|קרוס/, 'crossover'],
    [/פולי עליון|פולי/, 'pulldown'], [/חתירה בכבל/, 'cablerow'], [/חתירה במכונה/, 'machinerow'], [/חתירה במשקולת/, 'dbrow'], [/חתירה/, 'bentrow'],
    [/פשיטת גב|היפראקסטנשן/, 'backext'], [/דדליפט/, 'deadlift'],
    [/לחיצת כתפיים במכונה/, 'shoulderpress'], [/לחיצת כתפיים/, 'dbpress'], [/הרחקת כתפיים במכונה/, 'lateralmachine'], [/הרחקה לצדדים|הרחקת כתפיים/, 'lateral'],
    [/כפיפת מרפקים במכונה|פריצ׳ר|פריצר/, 'preacher'], [/פטיש/, 'hammer'], [/כפיפת מרפקים|בייספס/, 'curl'],
    [/מעל הראש/, 'ohext'], [/פשיטת מרפקים|טרייספס/, 'pushdown'], [/מקבילים עם סיוע/, 'assisteddips'], [/מקבילים/, 'dips'],
    [/לחיצת רגליים/, 'legpress'], [/פשיטת ברכיים/, 'legext'], [/כפיפת ברכיים בשכיבה/, 'legcurl'], [/כפיפת ברכיים/, 'seatedcurl'],
    [/מקרב/, 'adduct'], [/מרחיק/, 'abduct'], [/תאומים/, 'calf'],
    [/סמית/, 'smith'], [/סקוואט משקל גוף|סקוואט$/, 'bwsquat'], [/סקוואט/, 'squat'], [/מכרעים|לאנג/, 'lunge'], [/גשר ישבן|היפ תראסט|ישבן/, 'hipthrust'],
    [/שכיבות סמיכה/, 'pushup'], [/מתח עם סיוע/, 'assistedpullup'], [/מתח/, 'pullup'],
    [/הרמות רגליים/, 'legraise'], [/כפיפות בטן במכונה/, 'machinecrunch'], [/בטן/, 'crunch'],
    [/מוט/, 'barbell'], [/משקול/, 'curl'], [/כתפיים/, 'dbpress'], [/חזה/, 'chestpress'], [/גב/, 'pulldown'], [/רגליים/, 'legpress'],
    // English names (for exercises added in English)
    [/treadmill|\brun/i, 'treadmill'], [/elliptical|cross.?trainer/i, 'elliptical'], [/row(ing)? machine|rower|\berg\b/i, 'rower'],
    [/arm (bike|ergometer)/i, 'armbike'], [/recumbent/i, 'recumbent'], [/bike|cycl|spin/i, 'bike'], [/stair|stepper/i, 'stairs'], [/rope|skip/i, 'rope'],
    [/incline/i, 'inclinepress'], [/chest press/i, 'chestpress'], [/dumbbell (bench|chest)/i, 'dbbench'], [/bench/i, 'bench'],
    [/reverse fly|rear delt/i, 'reversefly'], [/fly|flye/i, 'pecdeck'], [/crossover/i, 'crossover'],
    [/pull.?down/i, 'pulldown'], [/cable row|seated row/i, 'cablerow'], [/machine row/i, 'machinerow'], [/dumbbell row|one.arm row/i, 'dbrow'], [/row/i, 'bentrow'],
    [/back ext|hyperext/i, 'backext'], [/deadlift/i, 'deadlift'],
    [/shoulder press machine|machine shoulder/i, 'shoulderpress'], [/shoulder press|overhead press|military/i, 'dbpress'], [/lateral raise machine/i, 'lateralmachine'], [/lateral|side raise/i, 'lateral'],
    [/preacher|curl machine/i, 'preacher'], [/hammer/i, 'hammer'], [/overhead (triceps|ext)/i, 'ohext'], [/push.?down|triceps/i, 'pushdown'],
    [/assisted dip/i, 'assisteddips'], [/dip/i, 'dips'], [/leg press/i, 'legpress'], [/leg ext/i, 'legext'], [/lying leg curl/i, 'legcurl'], [/leg curl|hamstring/i, 'seatedcurl'],
    [/adduct/i, 'adduct'], [/abduct/i, 'abduct'], [/calf/i, 'calf'], [/smith/i, 'smith'], [/bodyweight squat|air squat/i, 'bwsquat'], [/squat/i, 'squat'],
    [/lunge/i, 'lunge'], [/hip thrust|glute/i, 'hipthrust'], [/push.?up/i, 'pushup'], [/assisted pull/i, 'assistedpullup'], [/pull.?up|chin.?up/i, 'pullup'],
    [/leg raise/i, 'legraise'], [/crunch machine|ab machine/i, 'machinecrunch'], [/crunch|sit.?up|\babs?\b/i, 'crunch'],
    [/curl|biceps/i, 'curl'], [/barbell/i, 'barbell'],
  ];
  const BY_TYPE = { stretch: 'stretch', cardio: 'heart', machine: 'stack', free: 'curl', bodyweight: 'pushup' };

  // Realistic images: sprites/<icon>.webp holds its frames in a row (300×480 each), made with tools/sprite.py
  // from an image-AI picture. 8 frames play as a loop; 1 frame is a still picture until the full set arrives.
  const SPRITES = { bwsquat: 8, pulldown: 1 };
  const sprite = k => `<div class="sprite${SPRITES[k] === 1 ? ' still' : ''}" role="img" aria-hidden="true" style="background-image:url(sprites/${k}.webp)"></div>`;

  window.exerciseIcon = ex => {
    const name = ex?.name || '';
    const hit = RULES.find(([re]) => re.test(name));
    const k = hit ? hit[1] : (BY_TYPE[ex?.type] || 'stack');
    return SPRITES[k] ? sprite(k) : ICONS[k]();
  };
  window.EXERCISE_ICON_NAMES = Object.keys(ICONS);
})();
