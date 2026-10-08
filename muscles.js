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

  // Where each muscle id sits on the body map (body.js): [view, slug, path indexes (all when omitted)]
  const WHERE = {
    chest: [['front', 'chest']], fdelt: [['front', 'deltoids']], sdelt: [['front', 'deltoids'], ['back', 'deltoids']],
    rdelt: [['back', 'deltoids']], traps: [['front', 'trapezius'], ['back', 'trapezius']], biceps: [['front', 'biceps']],
    triceps: [['front', 'triceps'], ['back', 'triceps']], forearms: [['front', 'forearm'], ['back', 'forearm']],
    abs: [['front', 'abs']], obliques: [['front', 'obliques']], lats: [['back', 'upper-back', [1, 5]]],
    midback: [['back', 'upper-back', [0, 2, 3, 4]]], lowerback: [['back', 'lower-back']],
    glutes: [['back', 'gluteal', [1, 3]]], abductors: [['back', 'gluteal', [0, 2]]],
    quads: [['front', 'quadriceps']], hams: [['back', 'hamstring']],
    adductors: [['front', 'adductors'], ['back', 'adductors']], calves: [['front', 'calves'], ['back', 'calves']],
  };
  const SKIN = ['head', 'hair', 'hands', 'feet', 'ankles', 'knees', 'neck'];

  function bodySvg(pri, sec, label) {
    const B = window.BODY_MAP;
    const level = (view, slug, i) => {
      const hit = ids => ids.some(id => (WHERE[id] || []).some(([v, s, idx]) => v === view && s === slug && (!idx || idx.includes(i))));
      return hit(pri) ? ' on' : hit(sec) ? ' on2' : '';
    };
    const view = v => `<path class="mb" d="${B.outline[v]}"/>` + B[v].map(([slug, paths]) => paths.map((d, i) =>
      `<path class="${SKIN.includes(slug) ? 'ms' : 'mm' + level(v, slug, i)}" d="${d}"/>`).join('')).join('');
    return `<svg class="m-fig" viewBox="20 60 1408 1310" role="img" aria-label="${label}">${view('front')}${view('back')}</svg>`;
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
      ${window.BODY_MAP ? bodySvg(pri, sec, pri.map(k => NAMES[k]).join(', ')) : ''}
      <div class="m-legend muted small"><span>מלפנים</span><span>מאחור</span></div>
    </div>`;
  };
  window.MUSCLE_NAMES = NAMES;
})();
