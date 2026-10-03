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

  // First matching keyword wins, so the specific names come before the general ones.
  const RULES = [
    [/הליכון|ריצה/, 'treadmill'], [/אליפטי/, 'elliptical'], [/מכונת חתירה|חתירה במכונת/, 'rower'],
    [/אופני/, 'bike'], [/מדרגות|סטפר/, 'stairs'], [/חבל/, 'rope'],
    [/לחיצת רגליים/, 'legpress'], [/שכיבות סמיכה/, 'pushup'], [/מתח/, 'pullup'], [/בטן|הרמות רגליים/, 'crunch'],
    [/מוט|דדליפט|סמית/, 'barbell'], [/משקול|פטיש|הרחקה לצדדים|מכרעים|לאנג/, 'dumbbell'],
  ];
  const BY_TYPE = { cardio: 'heart', machine: 'stack', free: 'dumbbell', bodyweight: 'pushup' };

  window.exerciseIcon = ex => {
    const name = ex?.name || '';
    const hit = RULES.find(([re]) => re.test(name));
    return ICONS[hit ? hit[1] : (BY_TYPE[ex?.type] || 'stack')]();
  };
})();
