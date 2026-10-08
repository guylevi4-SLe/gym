/* Setou – which muscles each exercise works, drawn on a front and back body figure.
   Primary muscles are filled gold, secondary ones a softer gold. */
(() => {
  const NAMES = {
    chest: 'חזה', fdelt: 'כתף קדמית', sdelt: 'כתף צדדית', rdelt: 'כתף אחורית', traps: 'טרפז',
    biceps: 'יד קדמית (דו־ראשי)', triceps: 'יד אחורית (תלת־ראשי)', forearms: 'אמות',
    abs: 'בטן', obliques: 'בטן אלכסונית', lats: 'גב רחב', midback: 'גב עליון', lowerback: 'גב תחתון',
    glutes: 'ישבן', abductors: 'ישבן צדדי (מרחיקים)', quads: 'ארבע־ראשי', hams: 'המסטרינג',
    adductors: 'מקרבים', calves: 'תאומים',
  };

  // [primary, secondary] for every built-in exercise (standard exercise anatomy references)
  const T = (p, s = '') => [p.split(' '), s ? s.split(' ') : []];
  const BUILTIN = {
    'הליכון': T('quads hams glutes calves'),
    'אליפטי': T('quads glutes hams', 'calves chest triceps'),
    'אופני כושר': T('quads', 'glutes hams calves'),
    'אופני כושר עם משענת': T('quads', 'glutes hams calves'),
    'מכונת חתירה': T('lats midback quads', 'biceps rdelt glutes hams lowerback'),
    'מדרגות': T('glutes quads', 'hams calves'),
    'אופני ידיים': T('fdelt triceps biceps', 'chest forearms'),
    'קפיצה בחבל': T('calves', 'quads fdelt forearms'),
    'לחיצת רגליים': T('quads glutes', 'hams adductors'),
    'לחיצת רגליים בישיבה (Seated Leg Press)': T('quads glutes', 'hams adductors'),
    'פשיטת ברכיים': T('quads'),
    'כפיפת ברכיים בשכיבה': T('hams', 'calves'),
    'כפיפת ברכיים בישיבה': T('hams', 'calves'),
    'מקרב ירכיים': T('adductors'),
    'מרחיק ירכיים': T('abductors', 'glutes'),
    'פשיטת ירך לאחור במכונה (Glute Kickback)': T('glutes', 'hams'),
    'תאומים במכונה': T('calves'),
    'סקוואט משקל גוף': T('quads glutes', 'hams adductors abs'),
    'פולי עליון': T('lats', 'biceps midback rdelt'),
    'חתירה בכבל בישיבה': T('midback lats', 'biceps rdelt lowerback'),
    'חתירה במכונה': T('midback lats', 'biceps rdelt'),
    'פשיטת גב': T('lowerback', 'glutes hams'),
    'מתח': T('lats', 'biceps midback forearms'),
    'לחיצת חזה במכונה': T('chest', 'fdelt triceps'),
    'פרפר (Pec Deck)': T('chest', 'fdelt'),
    'לחיצת חזה בשיפוע במכונה': T('chest fdelt', 'triceps'),
    'שכיבות סמיכה': T('chest', 'triceps fdelt abs'),
    'לחיצת כתפיים במכונה': T('fdelt sdelt', 'triceps traps'),
    'הרחקת כתפיים במכונה': T('sdelt', 'traps'),
    'פרפר הפוך': T('rdelt', 'midback traps'),
    'כפיפת מרפקים במכונה': T('biceps', 'forearms'),
    'פשיטת מרפקים בכבל': T('triceps'),
    'מקבילים': T('triceps chest', 'fdelt'),
    'כפיפות בטן במכונה': T('abs', 'obliques'),
    'כפיפות בטן': T('abs', 'obliques'),
    'הרמות רגליים בתלייה': T('abs', 'obliques forearms'),
    'לחיצת חזה במוט': T('chest', 'triceps fdelt'),
    'לחיצת חזה במשקולות': T('chest', 'triceps fdelt'),
    'סקוואט במוט': T('quads glutes', 'hams adductors lowerback'),
    'דדליפט': T('glutes hams lowerback', 'quads traps forearms lats'),
    'חתירה במוט': T('lats midback', 'biceps rdelt lowerback'),
    'חתירה במשקולת יד': T('lats midback', 'biceps rdelt'),
    'לחיצת כתפיים במשקולות': T('fdelt sdelt', 'triceps traps'),
    'הרחקה לצדדים': T('sdelt', 'traps'),
    'כפיפת מרפקים במשקולות': T('biceps', 'forearms'),
    'פטישים': T('biceps forearms'),
    'פשיטת מרפקים מעל הראש': T('triceps'),
    'מכרעים (לאנג׳ים)': T('quads glutes', 'hams adductors calves'),
    'גשר ישבן (היפ תראסט)': T('glutes', 'hams'),
    'הצלבת כבלים': T('chest', 'fdelt'),
    'סמית׳ סקוואט': T('quads glutes', 'hams'),
    'מתח עם סיוע': T('lats', 'biceps midback'),
    'מקבילים עם סיוע': T('triceps chest', 'fdelt'),
    // Stretches: the muscles being released or stretched
    'גליל שחרור (פומרולר)': T('quads hams calves lats'),
    'מתיחת רגליים': T('hams quads calves'),
    'מתיחת גב וכתפיים': T('lats midback lowerback rdelt'),
  };
  // Custom exercises: guess from the chosen muscle group
  const BY_MUSCLE = {
    'חזה': T('chest', 'fdelt triceps'), 'גב': T('lats midback', 'biceps rdelt'), 'כתפיים': T('fdelt sdelt rdelt', 'traps triceps'),
    'יד קדמית': T('biceps', 'forearms'), 'יד אחורית': T('triceps'), 'רגליים': T('quads glutes hams', 'calves adductors'),
    'ישבן': T('glutes', 'hams abductors'), 'בטן': T('abs', 'obliques'), 'אירובי': T('quads hams glutes calves'),
  };
  const targetsOf = ex => BUILTIN[ex.name] || BY_MUSCLE[ex.muscle] || null;

  // Left half of each figure (x 0–50); the right half is the same shapes mirrored around x = 50.
  const BODY = 'M45 26 L44 32 C40 35 34 36 30 38 C25 40 22 46 22 54 L20 76 C18 86 16 96 15 106 C13 112 12 118 13 124 C15 126 17 124 18 120 L20 108 C22 98 25 88 27 78 L30 62 L32 58 C33 66 34 76 34 88 C33 96 31 102 31 110 C30 124 31 138 33 148 C32 160 33 172 35 184 C33 189 31 193 33 195 L43 195 C44 191 43 188 43 184 C45 172 46 160 45 148 C47 136 48 124 50 114 L50 26 Z';
  const FRONT = {
    traps: 'M45 31 C42 34 38 36 35 37 L44 38 Z',
    fdelt: 'M34 39 C30 40 28 44 28 50 C30 49 32 48 34 46 Z',
    sdelt: 'M32 38.5 C26 40 23 45 23 52 C25 51 26.5 50.5 27.5 50 C27.5 45 29.5 41 32 38.5 Z',
    chest: 'M36 39.5 L49 40 L49 56 C44 58.5 38.5 57.5 34.5 53 C34 48 34.5 43 36 39.5 Z',
    biceps: 'M24 55 C22.5 61 22.5 68 24.5 74 C27.5 70 29.5 63 29.5 57 C28 55.5 26 55 24 55 Z',
    forearms: 'M20.5 80 C18.5 88 17 96 16.5 104 L19.5 105 C22 97 24.5 88 26 80 C24 78.5 22 78.5 20.5 80 Z',
    abs: 'M42 60 L49 60.5 L49 97 C45.5 97 43 93 42 88 Z',
    obliques: 'M35 59 L40.5 61 L40.5 91 C37.5 87 35.5 80 35 71 Z',
    abductors: 'M32.5 99 C31 104 31 109 32.5 113 C34 109 35.5 105 37 102 C35.5 100.5 34 99.5 32.5 99 Z',
    quads: 'M33.5 110 C32 122 32.5 135 36 146 L43.5 146 C45.5 136 46.5 122 46 112 C42 109 37.5 108.5 33.5 110 Z',
    adductors: 'M47 113 L49.5 115 L48.5 128 C47.5 132 46.5 135 45.5 137 C46.5 128 47 120 47 113 Z',
    calves: 'M34.5 153 C32.5 162 33 172 35.5 181 L40 181 C42 171 43.5 161 43.5 153 C40.5 151 37.5 151 34.5 153 Z',
  };
  const BACK = {
    traps: 'M50 28 L45 30 C41 34 37 36 33 38.5 L42 44 L50 60 Z',
    rdelt: 'M32 39 C26 40.5 23 45 23 52 C26.5 50 29.5 48 33 45.5 Z',
    triceps: 'M23.5 55 C21.5 62 22 70 24.5 76 C27.5 70 29.5 63 30 56 C28 55 25.5 54.5 23.5 55 Z',
    forearms: 'M20.5 80 C18.5 88 17 96 16.5 104 L19.5 105 C22 97 24.5 88 26 80 C24 78.5 22 78.5 20.5 80 Z',
    midback: 'M41 46 L49 61 L49 72 C45 68 41 62 37.5 54 Z',
    lats: 'M33.5 50 C33.5 60 35.5 72 40.5 85 L47 81 C45 73 42 64 37.5 56 Z',
    lowerback: 'M43 84 L49 81 L49 100 C46 100 43.5 96 43 91 Z',
    abductors: 'M31.5 93 C30.5 98 31 102.5 33 105 C36 102 39.5 100 42.5 99.5 C40 96 35.5 93.5 31.5 93 Z',
    glutes: 'M33 104 C31.5 111 33.5 119 40.5 121 C45 121 48.5 117.5 49.5 113 L49.5 103 C44 99.5 38 100 33 104 Z',
    hams: 'M33.5 124 C32.5 133 34 142 37 148 L44 148 C46 139 47 130 47 124 C42 122.5 37.5 122.5 33.5 124 Z',
    adductors: 'M47.5 122 L49.5 120 L49 132 C48 136 46.5 139 45.5 140 C46.5 133 47.5 127 47.5 122 Z',
    calves: 'M34.5 151 C31.5 159 32.5 168 36 176 C38 172 39 166 39.5 160 C40.5 166 41.5 172 43.5 176 C45.5 168 46 159 44 151 C41 149.5 37.5 149.5 34.5 151 Z',
  };

  function figure(shapes, x, pri, sec) {
    const cls = k => pri.includes(k) ? 'mm on' : sec.includes(k) ? 'mm on2' : 'mm';
    const half = `<path class="mb" d="${BODY}"/>${Object.entries(shapes).map(([k, d]) => `<path class="${cls(k)}" d="${d}"/>`).join('')}`;
    return `<g transform="translate(${x} 0)"><ellipse class="mb" cx="50" cy="15" rx="8.5" ry="10.5"/>${half}<g transform="matrix(-1 0 0 1 100 0)">${half}</g></g>`;
  }

  // Card for the machine page; empty when nothing is known about the exercise
  window.musclesCard = function (ex) {
    const t = targetsOf(ex);
    if (!t) return '';
    const [pri, sec] = t;
    const names = l => l.map(k => `<span>${NAMES[k]}</span>`).join(', ');
    return `<div class="card muscles">
      <div class="label">${ex.type === 'stretch' ? 'שרירים שמשתחררים' : 'שרירים עובדים'}</div>
      <div class="m-names"><b>${names(pri)}</b>${sec.length ? `<div class="muted small"><span>גם:</span> ${names(sec)}</div>` : ''}</div>
      <svg class="m-fig" viewBox="0 0 210 200" role="img" aria-label="${pri.map(k => NAMES[k]).join(', ')}">${figure(FRONT, 0, pri, sec)}${figure(BACK, 110, pri, sec)}</svg>
      <div class="m-legend muted small"><span>מלפנים</span><span>מאחור</span></div>
    </div>`;
  };
  window.MUSCLE_NAMES = NAMES;
})();
