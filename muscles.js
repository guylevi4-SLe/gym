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
  // Keys that are not muscle ids (tib, neck) are drawn grey and never highlighted.
  const BODY = 'M45 25 L45 31 C41 33 35 34 30 36 C25 38 22 43 22 50 C21 58 21 66 20 74 C19 82 17 92 15 100 C14 105 13 108 12 112 C11 116 11 121 13 124 C15 125 16 122 17 119 C17 123 18 125 19 124 C20 120 20 115 21 110 C23 102 25 94 27 86 C28 78 29 70 30 62 C31 60 32 58 33 57 C33 64 34 72 35 80 C35 88 34 96 32 102 C30 110 30 122 31 134 C32 142 33 148 33 154 C32 164 33 176 35 188 C34 192 32 196 33 199 L42 199 C43 196 43 193 43 190 C44 178 46 166 46 154 C46 146 47 138 48 128 C49 120 50 116 50 114 L50 25 Z';
  const FOREARM = ['M21.2 80 C19.4 86 17.8 93 16.2 101 C15.6 104 15 106 14.6 108 L17.6 108.8 C19.2 102 21.2 95 23.2 89 C24.2 86 24.8 83 25 80.6 C23.8 80 22.4 79.8 21.2 80 Z',
    'M25.6 81.4 C24.4 86 22.6 93 20.6 100 C19.8 103 19.2 106 18.6 108.8 L20.8 109.2 C22.2 103 24.2 96 26.2 90 C27.2 87 27.8 84 27.9 81.8 C27.1 81.4 26.4 81.3 25.6 81.4 Z'];
  const box = (y1, y2) => `M43.4 ${y1} H49.2 V${y2} H43.4 C42.9 ${y2} 42.6 ${y2 - 0.4} 42.6 ${y2 - 1} V${y1 + 1} C42.6 ${y1 + 0.4} 42.9 ${y1} 43.4 ${y1} Z`;
  const FRONT = {
    neck: 'M46 25.5 C46.5 28 47.6 31 49.5 34 L48 35 C46.6 32 45.6 29 45.4 26 Z',
    traps: 'M45 31 C42 33 38 35 34 36 L44 37.5 C45 35 45.5 33 45 31 Z',
    sdelt: 'M29 36.6 C25 37.8 22.6 41.5 22.4 46.5 C22.4 50 23.4 53 25.5 55 C25 50 25.6 44 29 36.6 Z',
    fdelt: 'M29.6 36.6 C26.4 44 25.8 50 26.3 55 C29 52.4 31.2 49.6 32.6 46.6 C34 43.6 34.6 40.2 34 37.2 C32.6 36.7 31.1 36.5 29.6 36.6 Z',
    chest: 'M35.2 38.2 C39.4 38.7 44.2 38.8 49.2 39 L49.2 56 C45 58.6 40 58.6 36.5 56.6 C34.5 55.1 33.2 52.2 33 48.8 C33.8 45.2 34.8 41.8 35.2 38.2 Z',
    biceps: 'M25.8 57 C24 62 23.4 68 24.2 74 C24.8 77 26 79 27.2 80 C28.6 76 29.6 70 30 64 C30.2 61 30 58.5 29.5 56.5 C28.2 56.4 27 56.5 25.8 57 Z',
    forearms: FOREARM,
    obliques: 'M34.4 59 C36 60 38.4 61 41 61.6 L41 91 C38.4 88.6 36.6 85 35.6 80 C35 74 34.6 66 34.4 59 Z',
    abs: [box(60, 67.6), box(69, 76.6), box(78, 85.6), 'M42.8 87 H49.2 V103 C46.4 101.6 44 97.6 42.8 92.4 Z'],
    abductors: 'M32.6 100 C31.6 104 31.4 108 31.8 112 C33.2 109 34.6 106 36 103.5 C35 102 33.8 101 32.6 100 Z',
    quads: ['M32 112.6 C31 122 31.6 134 33.6 144 C34.2 147 35 149 36 150 C36.4 141 36.2 130 35.6 120 C35.2 116 34 113.8 32 112.6 Z',
      'M36.8 105.6 C35.8 114 36.6 126 37.8 136 C38.4 141 39.8 145 41.4 147.4 C42.6 141 43.2 133 43.2 125 C43.2 117 42.2 110.6 40.2 106.4 C39 105.8 37.8 105.5 36.8 105.6 Z',
      'M43.8 133.4 C42.8 138 42.2 143 42.6 147 C43.6 149 45.2 149.6 46.3 149 C46.8 145 46.6 140 45.5 136 C45 134.8 44.4 133.9 43.8 133.4 Z'],
    adductors: 'M46.2 112.6 C44.4 116 43.8 121 44.2 126 C44.4 128 44.8 130 45.2 131.6 C46.6 127 47.9 121 48.7 116 C48.9 115 49 114.5 49.1 114.1 C48.1 113.3 47.2 112.9 46.2 112.6 Z',
    tib: 'M37 156 C36.6 166 37 176 38 186 L39.6 186 C40 176 40.4 166 40.2 156 C39.2 155.4 38 155.4 37 156 Z',
    calves: ['M33.8 158 C33 166 33.6 174 35 182 L36.4 182 C36.4 174 36.2 166 35.6 158.4 C35 158 34.4 157.9 33.8 158 Z',
      'M42 156 C43.6 162 44.6 169 44.4 176 C44.2 179 43.6 182 43 184 C41.6 178 41 170 41 162 C41 159.5 41.4 157.6 42 156 Z'],
  };
  const BACK = {
    traps: 'M50 26 L50 62 C47.6 58 44.6 52 41.6 47 C39.4 44 36.4 40.5 32 38.2 C36.6 36.2 41.4 34 44.4 31.2 C45.4 29.4 46 27.6 46.2 26 C47.4 25.8 48.8 25.8 50 26 Z',
    rdelt: 'M31.6 38.6 C27 39 23.6 42 22.6 47 C22.2 50 22.6 53 23.6 55.4 C26.6 52.4 29.6 49 32.6 45.6 C33.6 44.4 34.2 43 34 41.8 C33.4 40.6 32.6 39.4 31.6 38.6 Z',
    triceps: 'M23 57 C21.8 63 21.8 70 23.4 76 C24.4 78 25.6 79.4 27 80 C28.4 75 29.6 69 30.2 63 C30.4 61 30.4 58.8 30 57 C27.6 56.4 25.2 56.4 23 57 Z',
    forearms: FOREARM,
    midback: 'M34.6 43 C33.2 46.4 33.2 50.2 34.6 53.4 C37.4 52.2 40.4 51.6 43.4 51.8 C42.2 48.6 40.4 45.8 38 43.8 C36.8 43.2 35.7 43 34.6 43 Z',
    lats: 'M34.2 54.6 C33.8 61 34.4 68 36.2 75 C37.6 80 39.8 84.4 42.6 88 C44.6 85 46.4 81 47.6 76.6 C44.6 73 42.4 68.6 41.2 63.6 C40.6 60.2 40.4 56.8 40.8 53.6 C38.6 53.4 36.4 53.8 34.2 54.6 Z',
    lowerback: 'M48.8 74.6 C46.8 80.4 44.8 85.8 43.8 90.8 C43.6 94.2 44.8 97.6 46.8 100 C47.7 100.4 48.6 100.6 49.4 100.6 L49.4 75.4 Z',
    obliques: 'M35.8 80.6 C35.2 86.4 34.6 92 33.6 96.2 C36.6 95 39.6 93.2 41.8 90.6 C39.4 87.6 37.4 84.2 35.8 80.6 Z',
    abductors: 'M33.4 98.6 C32.4 101.8 32.2 105 32.8 108 C35.8 105.2 39.8 103.2 44 102.4 C42.6 99.8 40.6 98.3 38 97.8 C36.4 97.6 34.8 97.8 33.4 98.6 Z',
    glutes: 'M32.8 110.2 C32 115.2 33 120.8 36.4 124.4 C40 127.8 45.4 127.6 49.4 124.6 L49.4 104.4 C46.6 103.6 43.2 103.8 40 104.8 C37 106 34.6 107.8 32.8 110.2 Z',
    hams: ['M32.2 128.2 C31.8 135 32.8 142 35 148.6 C36 149.6 37.2 150 38.4 149.8 C38.4 142 38 134.6 37.2 128.8 C35.6 128.2 34 128 32.2 128.2 Z',
      'M38.6 128.6 C39.4 135.6 40.2 142.4 41.6 149.2 C43.2 149.6 44.8 149.4 46 148.6 C46.6 141.6 46.4 134.4 45.4 129 C43 128.2 40.8 128.2 38.6 128.6 Z'],
    adductors: 'M46.4 128 C47.1 133 47.3 138.6 46.9 144 C48.1 140 49 134 49.4 128 L49.4 126.8 C48.4 127.4 47.4 127.8 46.4 128 Z',
    calves: ['M34.2 156 C32.6 162 32.8 169 34.8 175 C36 177 37.4 177.6 38.6 177 C39.2 170 39.2 163 38.6 156.6 C37.2 155.6 35.6 155.6 34.2 156 Z',
      'M39.6 156.4 C40.2 163 40.2 170 39.8 177 C41.4 178.4 43.2 178 44.4 176 C45.8 170 46 163 44.6 157 C43 155.8 41.2 155.8 39.6 156.4 Z',
      'M36.2 180.4 C36.6 184.4 37.1 188 37.6 191 L41.6 191 C42.1 188 42.5 184.4 42.7 180.4 C40.6 181.4 38.3 181.4 36.2 180.4 Z'],
  };

  function figure(shapes, x, pri, sec) {
    const cls = k => pri.includes(k) ? 'mm on' : sec.includes(k) ? 'mm on2' : 'mm';
    const half = `<path class="mb" d="${BODY}"/>${Object.entries(shapes).map(([k, d]) => [].concat(d).map(x => `<path class="${cls(k)}" d="${x}"/>`).join('')).join('')}`;
    return `<g transform="translate(${x} 0)"><ellipse class="mb" cx="50" cy="14" rx="7.6" ry="9.6"/>${half}<g transform="matrix(-1 0 0 1 100 0)">${half}</g></g>`;
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
      <svg class="m-fig" viewBox="8 2 194 200" role="img" aria-label="${pri.map(k => NAMES[k]).join(', ')}">${figure(FRONT, 0, pri, sec)}${figure(BACK, 110, pri, sec)}</svg>
      <div class="m-legend muted small"><span>מלפנים</span><span>מאחור</span></div>
    </div>`;
  };
  window.MUSCLE_NAMES = NAMES;
})();
