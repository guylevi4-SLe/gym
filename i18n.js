'use strict';
// Language support (Hebrew / English).
// The screens are written in Hebrew. In English mode every Hebrew text the app puts on the page is
// swapped for its English version the moment it is added (a MutationObserver), so the screen code
// stays as it is. Fixed phrases come from EN; phrases with numbers or names come from PATTERNS.
// Anything inside [translate="no"] (and anything the user typed) is left alone.
(function () {
  const HEB = /[֐-׿]/;
  let lang = null;
  try { lang = localStorage.getItem('gym-lang'); } catch (_) { /* storage blocked */ }
  if (lang !== 'he' && lang !== 'en') {
    const langs = navigator.languages || [navigator.language || ''];
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) { /* old browser */ }
    lang = langs.some(l => /^(he|iw)\b/i.test(l)) || tz === 'Asia/Jerusalem' ? 'he' : 'en';
  }

  const EN = {
    // Exercise types and muscle groups
    'מכשיר': 'Machine', 'משקולות חופשיות': 'Free weights', 'משקל גוף': 'Bodyweight', 'אירובי / חימום': 'Cardio / warm-up',
    'חזה': 'Chest', 'גב': 'Back', 'כתפיים': 'Shoulders', 'יד קדמית': 'Biceps', 'יד אחורית': 'Triceps', 'רגליים': 'Legs',
    'ישבן': 'Glutes', 'בטן': 'Abs', 'כל הגוף': 'Full body', 'אירובי': 'Cardio',
    // Ready-made exercise list
    'חימום ואירובי': 'Warm-up & cardio', 'מכשירים': 'Machines',
    'ידיים': 'Arms', 'בטן / ליבה': 'Abs / core', 'משקולות': 'Weights', 'רב־תכליתי': 'Multi-purpose', 'שחרור / מתיחות': 'Release / stretching',
    'הפעם האחרונה': 'Last time',
    'היעד שלי': 'My target', '(לחץ לפתיחה)': '(tap to open)',
    'ימולא אוטומטית כשמתחילים אימון': 'Filled in automatically when you start a workout',
    'התמונה שלי': 'My photo', 'לחץ להגדלה': 'Tap to enlarge',
    'מחרתיים': 'Day after tomorrow', 'באיזו שעה?': 'What time?', 'הזמן שבחרת כבר עבר': 'That time has already passed',
    'באיזה יום?': 'Which day?', 'תאריך אחר': 'Other date', 'באיזו שעה התחלת?': 'What time did you start?',
    'כמה זמן נמשך? (דקות)': 'How long? (minutes)', 'שלשום': '2 days ago', 'אחר': 'Other',
    'הוסף אימון שכבר עשיתי': 'Add a workout I already did', 'אימון שכבר עשית': 'Past workout', 'מתי התחלת?': 'When did you start?',
    'כמה דקות?': 'Minutes?', 'מה עשית?': 'What did you do?', 'אימון ריק': 'Empty workout', 'המשך לרישום התרגילים': 'Continue to log exercises',
    'שמור אימון': 'Save workout', 'לא רשמת אף סט. לצאת בלי לשמור?': "You didn't log any set. Leave without saving?",
    'כמה דקות נמשך האימון?': 'How many minutes did the workout last?', 'האימון צריך להיות בעבר': 'The workout has to be in the past',
    'מה שרשום כאן יישמר, בלי צורך לסמן ✓. תקן את המספרים והסר תרגיל שלא עשית.': "Whatever is filled in here is saved, no need to tick ✓. Fix the numbers and remove anything you didn't do.",
    'כל הימים': 'All days', 'מתאים ליום': 'Workout day', 'ללא': 'None', 'החזר לאוטומטי': 'Back to automatic',
    'נקבע אוטומטית לפי השריר. אפשר לשנות.': 'Set automatically from the muscle. You can change it.', 'אימון לפי יום': 'Workout by day',
    'לחיצת רגליים בישיבה (Seated Leg Press)': 'Seated leg press', 'פשיטת ירך לאחור במכונה (Glute Kickback)': 'Glute kickback machine', 'גליל שחרור (פומרולר)': 'Foam roller', 'מתיחת רגליים': 'Leg stretch', 'מתיחת גב וכתפיים': 'Back & shoulder stretch',
    'הליכון': 'Treadmill', 'אליפטי': 'Elliptical', 'אופני כושר': 'Exercise bike', 'אופני כושר עם משענת': 'Recumbent bike',
    'מכונת חתירה': 'Rowing machine', 'מדרגות': 'Stair climber', 'אופני ידיים': 'Arm bike', 'קפיצה בחבל': 'Jump rope',
    'לחיצת חזה במכונה': 'Chest press machine', 'פרפר (Pec Deck)': 'Pec deck', 'לחיצת חזה בשיפוע במכונה': 'Incline chest press machine',
    'פולי עליון': 'Lat pulldown', 'חתירה בכבל בישיבה': 'Seated cable row', 'חתירה במכונה': 'Machine row', 'פשיטת גב': 'Back extension',
    'לחיצת כתפיים במכונה': 'Shoulder press machine', 'הרחקת כתפיים במכונה': 'Lateral raise machine', 'פרפר הפוך': 'Reverse fly',
    'כפיפת מרפקים במכונה': 'Biceps curl machine', 'פשיטת מרפקים בכבל': 'Triceps pushdown', 'מקבילים עם סיוע': 'Assisted dips',
    'לחיצת רגליים': 'Leg press', 'פשיטת ברכיים': 'Leg extension', 'כפיפת ברכיים בשכיבה': 'Lying leg curl',
    'כפיפת ברכיים בישיבה': 'Seated leg curl', 'מקרב ירכיים': 'Hip adduction', 'מרחיק ירכיים': 'Hip abduction',
    'תאומים במכונה': 'Calf raise machine', 'סמית׳ סקוואט': 'Smith machine squat', 'מתח עם סיוע': 'Assisted pull-up',
    'כפיפות בטן במכונה': 'Ab crunch machine', 'הצלבת כבלים': 'Cable crossover',
    'לחיצת חזה במוט': 'Barbell bench press', 'לחיצת חזה במשקולות': 'Dumbbell bench press', 'סקוואט במוט': 'Barbell squat',
    'דדליפט': 'Deadlift', 'חתירה במוט': 'Barbell row', 'חתירה במשקולת יד': 'One-arm dumbbell row',
    'לחיצת כתפיים במשקולות': 'Dumbbell shoulder press', 'הרחקה לצדדים': 'Lateral raise', 'כפיפת מרפקים במשקולות': 'Dumbbell curl',
    'פטישים': 'Hammer curl', 'פשיטת מרפקים מעל הראש': 'Overhead triceps extension', 'מכרעים (לאנג׳ים)': 'Lunges',
    'גשר ישבן (היפ תראסט)': 'Hip thrust', 'שכיבות סמיכה': 'Push-ups', 'מתח': 'Pull-ups', 'מקבילים': 'Dips',
    'כפיפות בטן': 'Crunches', 'הרמות רגליים בתלייה': 'Hanging leg raise', 'סקוואט משקל גוף': 'Bodyweight squat',
    // Dates and units
    'היום': 'Today', 'אתמול': 'Yesterday', 'מחר': 'Tomorrow',
    // Navigation and titles
    'בית': 'Home', 'תוכניות': 'Routines', 'היסטוריה': 'History', 'חזרה': 'Back',
    'המכשירים והתרגילים שלי': 'My machines & exercises', 'תוכניות האימון שלי': 'My routines',
    'הגדרות': 'Settings', 'משתמשים והגדרות': 'Users & settings',
    // Onboarding and home
    'ברוך הבא!': 'Welcome!', 'איך קוראים לך? אפשר להוסיף עוד משתמשים אחר כך, למשל את הבן.': "What's your name? You can add more people later, like your kids.",
    'השם שלך': 'Your name', 'יאללה, מתחילים': "Let's go",
    'עמדת ביעד השבועי! כל אימון נוסף הוא בונוס 🔥': 'Weekly goal reached! Every extra workout is a bonus 🔥',
    'שבוע חדש, הזדמנות חדשה. בוא נפתח אותו!': "New week, new chance. Let's kick it off!",
    'השבוע': 'This week', 'אימונים': 'workouts', 'דקות': 'minutes', 'שבועות ברצף': 'week streak',
    'המשך אימון': 'Resume workout', 'התחל אימון': 'Start workout', 'התחל מתוכנית': 'Start a routine', 'התוכניות שלי': 'My routines',
    'אימונים מתוכננים': 'Planned workouts', 'תכנן אימון': 'Plan', 'אימונים אחרונים': 'Recent workouts', 'הכל': 'All',
    'עוד לא תכננת. לחץ על "תכנן אימון" כדי לקבוע יום ושעה.': 'Nothing planned yet. Tap "Plan" to pick a day and time.',
    'עוד אין אימונים. האימון הראשון מחכה לך!': 'No workouts yet. Your first one is waiting!',
    'התחל': 'Start', 'בחר חדר כושר': 'Choose a gym',
    // Workout
    'אימון': 'Workout', 'סיים אימון': 'Finish', 'הוסף את התרגיל או המכשיר הראשון': 'Add your first exercise or machine',
    'הוסף תרגיל': 'Add exercise', 'בטל אימון': 'Cancel workout', 'פעם ראשונה על התרגיל הזה': 'First time on this exercise',
    'אפשרויות': 'Options', 'סט': 'Set', 'קודם': 'Prev', 'סיימתי': 'Done', 'מחק סט': 'Delete set',
    'ק״ג': 'kg', 'חזרות': 'Reps', 'ק״מ': 'km', 'סטים': 'Sets',
    'יאללה, סט הבא! 💪': 'Next set, go! 💪', 'דלג': 'Skip', 'אימון פעיל': 'Workout in progress', 'לחץ לחזרה': 'tap to return',
    'כבר באימון': 'already added',
    // Exercises
    'חיפוש': 'Search', 'חדש': 'New', 'הוסף מהרשימה המוכנה': 'Add from the ready-made list', 'לא נמצא': 'Nothing found',
    'עוד אין מכשירים. בחר מהרשימה המוכנה, או צלם מכשיר בחדר הכושר ותן לו שם.': 'No machines yet. Pick from the ready-made list, or take a photo of a machine at the gym and name it.',
    'שיא (ק״ג)': 'Best (kg)', 'היעד שלי (ימולא אוטומטית כשמתחילים אימון)': 'My target (filled in automatically when a workout starts)',
    'ההערות שלי (גובה מושב, מיקום ידית...)': 'My notes (seat height, handle position...)', 'למשל: מושב בחור 4, משענת 2': 'e.g. seat on hole 4, backrest 2',
    'יעד': 'Target', '(לא חובה · אם ריק, מתחילים לפי הפעם האחרונה)': '(optional · empty = start from last time)', 'פעמים': 'Times', 'עריכה': 'Edit', 'עוד לא עשית את התרגיל הזה': "You haven't done this one yet",
    'עריכת תרגיל': 'Edit exercise', 'מכשיר / תרגיל חדש': 'New machine / exercise', 'תמונה': 'Photo', 'צלם': 'Camera',
    'מהגלריה': 'Gallery', 'הסר': 'Remove', 'שם': 'Name', 'למשל: לחיצת חזה במכונה': 'e.g. Chest press machine', 'סוג': 'Type',
    'קבוצת שרירים': 'Muscle group', 'באיזה חדר כושר? (בלי סימון = בכל מקום)': 'Which gym? (none selected = everywhere)',
    'שמור': 'Save', 'מחק תרגיל': 'Delete exercise',
    // Routines
    'תוכנית היא רשימה קבועה של תרגילים, למשל "אימון א" ו"אימון ב". מתחילים אותה בלחיצה אחת.': 'A routine is a fixed list of exercises, like "Workout A" and "Workout B". Start it with one tap.',
    'אין תרגילים': 'No exercises', 'עוד אין תוכניות': 'No routines yet', 'תוכנית חדשה': 'New routine', 'עריכת תוכנית': 'Edit routine',
    'שם התוכנית': 'Routine name', 'למשל: אימון א - פלג גוף עליון': 'e.g. Workout A - upper body', 'למעלה': 'Up', 'למטה': 'Down',
    'בחר תרגילים מהרשימה למטה': 'Pick exercises from the list below', 'קודם צריך להוסיף מכשירים בלשונית "מכשירים".': 'First add machines in the "Machines" tab.',
    'מחק תוכנית': 'Delete routine',
    // History
    'החודש': 'This month', 'סה״כ': 'Total', 'כאן יופיעו האימונים שלך': 'Your workouts will show up here',
    'תרגיל שנמחק': 'Deleted exercise', 'מחק אימון': 'Delete workout',
    // Settings
    'מי מתאמן?': "Who's training?", 'פעיל': 'Active', 'שם משתמש חדש': 'New user name', 'הוסף': 'Add', 'חדרי כושר': 'Gyms',
    'שנה שם': 'Rename', 'מחק': 'Delete', 'עוד אין חדרי כושר': 'No gyms yet', 'שם חדר כושר חדש': 'New gym name',
    'זמן מנוחה בין סטים (שניות)': 'Rest between sets (seconds)', 'יעד אימונים בשבוע': 'Weekly workout goal',
    'שפה': 'Language', 'צבעים': 'Colors', 'כחול': 'Blue', 'ירוק (המקורי)': 'Green (original)', 'ירוק': 'Green', 'שחור וזהב': 'Black & gold', 'לבן וזהב': 'White & gold', 'גיבוי': 'Backup',
    'הנתונים שלך נשמרים בענן. אפשר גם לשמור עותק כקובץ.': 'Your data is saved in the cloud. You can also keep a copy as a file.',
    'שמור גיבוי': 'Save backup', 'כרגע הנתונים שמורים רק בטלפון הזה. מומלץ לשמור גיבוי מדי פעם.': 'Right now your data lives only on this phone. Save a backup now and then.',
    'שחזר מגיבוי': 'Restore backup', 'התקנה באייפון': 'Install on iPhone', 'התקנה': 'Install', 'באייפון': 'iPhone',
    'במחשב (כרום או אדג׳)': 'Computer (Chrome or Edge)', 'במק (ספארי)': 'Mac (Safari)', 'בתפריט "קובץ" בחר "הוסף ל־Dock".': 'In the File menu choose "Add to Dock".',
    'פתח את האתר בדפדפן ולחץ על סמל ההתקנה בצד שורת הכתובת. אם הוא לא מופיע: תפריט שלוש הנקודות, ואז "שמירה ושיתוף" ואז "התקנת Setou". אחרי ההתקנה אפשר להצמיד לשורת המשימות.': 'Open the site and click the install icon at the side of the address bar. If it is not there: the three-dot menu, then "Cast, save and share", then "Install Setou". After installing you can pin it to the taskbar.',
    'בספארי: לחץ על כפתור השיתוף ואז "הוסף למסך הבית". האפליקציה תיפתח במסך מלא ותעבוד גם בלי קליטה.': 'In Safari: tap the Share button, then "Add to Home Screen". The app opens full screen and works without reception too.',
    // Sheets
    'בחר תרגיל': 'Choose exercise', 'סגור': 'Close', 'עוד אין מכשירים': 'No machines yet', 'מהרשימה': 'From list',
    'רשימה מוכנה': 'Ready-made list', 'בחר את מה שיש. אפשר לשנות שם ולהוסיף תמונה אחר כך.': "Pick what's there. You can rename and add a photo later.",
    'באיזה חדר כושר יש את המכשירים?': 'Which gym has these machines?', 'משקולות חופשיות ותרגילים בלי ציוד זמינים בכל מקום.': 'Free weights and no-equipment exercises are available everywhere.',
    'בחר מה להוסיף. מה שכבר ברשימה שלך מסומן ב־✓, ולחיצה עליו מסירה אותו.': "Choose what to add. Items already in your list have a ✓; tap one to remove it.",
    'באיזה חדר כושר יש את זה? (בלי סימון = בכל מקום)': 'Which gym has it? (none selected = everywhere)', 'הסר': 'Remove',
    'בחר תרגילים': 'Choose exercises', 'אימון מתוכנן': 'Planned workout', 'תכנון אימון': 'Plan a workout', 'מתי?': 'When?',
    'איפה?': 'Where?', 'איזו תוכנית? (לא חובה)': 'Which routine? (optional)', 'הערות': 'Notes',
    'למשל: יום רגליים, להביא אוזניות': 'e.g. leg day, bring headphones', 'שמור שינויים': 'Save changes',
    'ליומן באייפון': 'iPhone calendar', 'ליומן גוגל': 'Google Calendar', 'איפה אתה מתאמן?': 'Where are you training?',
    'בלי חדר כושר מסוים': 'No specific gym', 'עוד אין חדרי כושר. הוסף את הראשון:': 'No gyms yet. Add the first one:',
    'למשל: אייקון רעננה': 'e.g. City Gym', 'שינוי שם': 'Rename', 'ביטול': 'Cancel', 'אישור': 'OK',
    'הזז למעלה': 'Move up', 'הזז למטה': 'Move down', 'הסר מהאימון': 'Remove from workout',
    // Messages
    'לא סימנת אף סט כמבוצע (✓). לסיים בלי לשמור?': "You haven't marked any set as done (✓). Finish without saving?",
    'נשמר ✓': 'Saved ✓', 'האימון נקבע ✓ אפשר להוסיף אותו ליומן': 'Workout planned ✓ You can add it to your calendar',
    'למחוק את האימון המתוכנן?': 'Delete this planned workout?', 'יש כבר אימון פעיל': 'A workout is already in progress',
    'לבטל את האימון? מה שרשמת בו לא יישמר.': "Cancel the workout? Nothing you logged in it will be saved.",
    'צריך לתת שם': 'Please give it a name', 'צריך לתת שם לתוכנית': 'Please name the routine', 'התוכנית נשמרה ✓': 'Routine saved ✓',
    'למחוק את התוכנית?': 'Delete this routine?', 'למחוק את האימון הזה מההיסטוריה?': 'Delete this workout from your history?',
    'לא הצלחתי לקרוא את התמונה': "Couldn't read that photo",
    'לשחזר מהגיבוי? כל הנתונים הנוכחיים בטלפון יוחלפו.': 'Restore from the backup? All current data on this phone will be replaced.',
    'הגיבוי שוחזר ✓': 'Backup restored ✓', 'הקובץ הזה לא נראה כמו גיבוי של האפליקציה': "That file doesn't look like an app backup",
    'לא הצלחתי לפתוח את האחסון בטלפון. נסה לפתוח שוב.': "Couldn't open the phone's storage. Try opening the app again.",
    // Account (cloud.js)
    'כתובת המייל לא תקינה': "That email address isn't valid", 'צריך להזין סיסמה': 'Please enter a password',
    'הסיסמה קצרה מדי. צריך לפחות 6 תווים': 'Password too short. At least 6 characters',
    'כבר יש חשבון עם המייל הזה. עבור ל"כניסה" למטה': 'There is already an account with this email. Switch to "Sign in" below',
    'המייל או הסיסמה לא נכונים. אם עוד לא נרשמת, עבור ל"הרשמה" למטה': 'Wrong email or password. If you have no account yet, switch to "Sign up" below',
    'אין חשבון עם המייל הזה. לחץ "הרשמה"': 'No account with this email. Tap "Sign up"',
    'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות': 'Too many attempts. Try again in a few minutes',
    'לא הצלחתי להתחבר לשרת. בדוק שיש אינטרנט ונסה שוב': "Couldn't reach the server. Check your internet and try again",
    'ההרשמה עם מייל עוד לא הופעלה ב-Firebase': "Email sign-up isn't enabled in Firebase yet",
    'הכתובת של האפליקציה לא מאושרת ב-Firebase': "The app's address isn't authorized in Firebase",
    'השרת לא ענה. בדוק את החיבור ונסה שוב': "The server didn't answer. Check your connection and try again",
    'לא הצלחתי לשמור בענן. השינוי יישמר כשהחיבור יחזור': "Couldn't save to the cloud. The change will be saved when you're back online",
    'רגע...': 'One moment...', 'צריך להזין מייל': 'Please enter your email', 'האפליקציה עוד נטענת. נסה שוב בעוד רגע': 'The app is still loading. Try again in a moment',
    'הזן קודם את כתובת המייל': 'Enter your email address first', 'שלחתי מייל לאיפוס הסיסמה': 'Password reset email sent',
    'איך קוראים לך?': "What's your name?", 'הזן את קוד ההצטרפות': 'Enter the invite code',
    'לא מצאתי קבוצה עם הקוד הזה. בדוק אותו שוב': "Couldn't find a group with that code. Please check it",
    'להתנתק מהחשבון בטלפון הזה? הנתונים נשמרים בענן ויחזרו כשתתחבר שוב.': "Sign out on this phone? Your data stays in the cloud and comes back when you sign in.",
    'התנתק': 'Sign out', 'ההזמנה הועתקה. הדבק אותה בוואטסאפ': 'Invite copied. Paste it in WhatsApp',
    'הנתונים מהטלפון הועברו לחשבון ✓': "This phone's data moved to your account ✓", 'טוען...': 'Loading...',
    'בפתיחה הראשונה צריך חיבור לאינטרנט. התחבר ונסה שוב.': 'The first launch needs an internet connection. Connect and try again.',
    'נסה שוב': 'Try again', 'הרשמה': 'Sign up', 'כניסה': 'Sign in',
    'פעם ראשונה? בחר מייל וסיסמה חדשה לאפליקציה.': 'First time? Choose an email and a new password for the app.',
    'כניסה לחשבון שכבר יצרת.': 'Sign in to the account you already created.', 'מייל': 'Email',
    'סיסמה חדשה (לפחות 6 תווים)': 'New password (at least 6 characters)', 'סיסמה': 'Password', 'צור חשבון': 'Create account',
    'כבר יש לך חשבון? כניסה': 'Already have an account? Sign in', 'אין לך חשבון? הרשמה': 'No account? Sign up',
    'שכחתי סיסמה': 'Forgot password', 'המשך בלי חשבון (נשמר רק בטלפון הזה)': 'Continue without an account (saved on this phone only)',
    'כמעט סיימנו': 'Almost done', 'יש לך קוד הצטרפות מחבר או מבן משפחה?': 'Got an invite code from a friend or family member?',
    'בקבוצה מתאמנים יחד: חדרי הכושר ורשימת המכשירים משותפים, ולא צריך להגדיר אותם מחדש. המשקלים, האימונים, היעדים וההערות שלך נשארים פרטיים.': 'A group trains together: gyms and the machine list are shared, so there is nothing to set up again. Your weights, workouts, targets and notes stay private.',
    'למשל: K7QM2XPA': 'e.g. K7QM2XPA', 'הצטרף לקבוצה': 'Join group', 'אין לך קוד?': 'No code?',
    'תיצור קבוצה חדשה ותקבל קוד שאפשר לשלוח למשפחה ולחברים.': "You'll create a new group and get a code to send to family and friends.",
    'צור קבוצה חדשה': 'Create a new group', 'חשבון': 'Account',
    'כרגע הנתונים נשמרים רק בטלפון הזה. עם חשבון הם יישמרו בענן, יופיעו בכל מכשיר, ותוכל לשתף מכשירים עם המשפחה והחברים.': 'Right now your data is saved only on this phone. With an account it is saved in the cloud, shows up on every device, and you can share machines with family and friends.',
    'קוד הצטרפות לקבוצה. מי שנרשם עם הקוד הזה משתף איתך את חדרי הכושר ורשימת המכשירים. המשקלים, האימונים, היעדים וההערות של כל אחד נשארים פרטיים.': 'Group invite code. Whoever signs up with it shares your gyms and machine list. Everyone keeps their own weights, workouts, targets and notes private.',
    'התחבר או הירשם': 'Sign in or sign up', 'מחובר בתור': 'Signed in as', 'הקבוצה שלי': 'My group', 'אני': 'Me',
    'שלח הזמנה': 'Send invite', 'נתונים מהטלפון': 'Data on this phone',
    'יש בטלפון הזה נתונים מלפני שהתחברת. של מי להעביר לחשבון שלך?': 'This phone has data from before you signed in. Whose data should move to your account?',
    'השם שלי': 'My name',
  };

  // Hebrew words that may appear next to numbers ("3 סטים", "45 דק׳")
  const UNITS = { 'סטים': 'sets', 'סט': 'set', 'חזרות': 'reps', 'ק״ג': 'kg', 'דק׳': 'min', 'ק״מ': 'km', 'שע׳': 'h',
    'תרגילים': 'exercises', 'אימונים': 'workouts', 'אימון': 'workout', 'פעמים': 'times' };
  const UNIT_RE = new RegExp(`(?<![\\u0590-\\u05FF])(${Object.keys(UNITS).join('|')})(?![\\u0590-\\u05FF])`, 'g');

  const plural = (n, one, many) => `${n} ${+n === 1 ? one : many}`;
  const PATTERNS = [
    [/^שלום (.+?)(!?)$/, (n, x) => `Hi ${n}${x}`],
    [/^עוד (\d+) (אימון|אימונים) ליעד השבועי$/, n => `${plural(n, 'more workout', 'more workouts')} to your weekly goal`],
    [/^בפעם הקודמת \((.+?)\): (.+)$/, (d, s) => `Last time (${tr(d)}): ${tr(s)}`],
    [/^יעד: (.+)$/, s => `Target: ${tr(s)}`],
    [/^תרגילים בתוכנית \((\d+)\)$/, n => `Exercises in routine (${n})`],
    [/^גרסה (.+)$/, v => `Version ${v}`],
    [/^מחק את המשתמש (.+)$/, n => `Delete user ${n}`],
    [/^בחר את מה שיש ב(.+)\. אפשר לשנות שם ולהוסיף תמונה אחר כך\.$/, g => `Pick what's at ${g}. You can rename and add a photo later.`],
    [/^הוסף (\d+)$/, n => `Add ${n}`],
    [/^(.+) נוסף\. לחץ על השם כדי לעבור אליו\.$/, n => `${n} added. Tap the name to switch.`],
    [/^למחוק את (.+) ואת כל האימונים שלו\? אי אפשר לבטל\.$/, n => `Delete ${n} and all their workouts? This can't be undone.`],
    [/^(.+) נוסף ✓$/, n => `${n} added ✓`],
    [/^למחוק את (.+)\? המכשירים שלו יישארו ויופיעו בכל המקומות\.$/, n => `Delete ${n}? Its machines stay and will show at every gym.`],
    [/^נוספו (\d+) ✓$/, n => `Added ${n} ✓`],
    [/^אימון שכבר עשית · (.+) · (.+) · (\d+) דק׳$/, (d, t, m) => `Past workout · ${tr(d)} · ${t} · ${m} min`],
    [/^מוצג לפי (.+)\. המשקלים, היעד וההערות נשמרים בנפרד לכל חדר כושר\.$/, g => `Showing ${g}. Weights, target and notes are kept separately for each gym.`],
    [/^יום (Push|Pull|Legs|Core|Full body)$/, d => `${d} day`],
    [/^הוכנו (\d+) תרגילים\. אפשר להסיר או להוסיף\.$/, n => `${n} exercises ready. You can remove or add more.`],
    [/^להסיר את "(.+)" מהרשימה שלך\? ההיסטוריה שלו תישאר באימונים שכבר נשמרו\.$/, n => `Remove "${tr(n)}" from your list? Its history stays in saved workouts.`],
    [/^למחוק את "(.+)"\? ההיסטוריה שלו תישאר באימונים שכבר נשמרו\.$/, n => `Delete "${tr(n)}"? Its history stays in saved workouts.`],
    [/^כל הכבוד! 💪 (.+?), (\d+) סטים\.(.*)$/, (d, n, extra) => `Well done! 💪 ${tr(d)}, ${plural(n, 'set', 'sets')}.` +
      (/עמדת ביעד/.test(extra) ? ' Weekly goal reached! 🏆' : (extra.match(/\d+/) ? ` ${extra.match(/\d+/)[0]} more to your weekly goal.` : ''))],
    [/^משהו השתבש \((.+)\)\. צלם את ההודעה ושלח לי$/, c => `Something went wrong (${c}). Take a screenshot and send it to me`],
    [/^לא הצלחתי לשמור \((.+)\)\. בדוק את החיבור ונסה שוב$/, c => `Couldn't save (${c}). Check your connection and try again`],
    [/^הקוד: (.+)$/, c => `Code: ${c}`],
    [/^העבר את הנתונים של (.+)$/, n => `Move ${n}'s data`],
    [/^המשפחה של (.+)$/, n => `${n}'s family`],
  ];

  function lookup(t) {
    if (Object.prototype.hasOwnProperty.call(EN, t)) return EN[t];
    for (const [re, f] of PATTERNS) { const m = t.match(re); if (m) return f(...m.slice(1)); }
    return null;
  }
  function core(t) {
    let r = lookup(t);
    if (r != null) return r;
    // Ignore symbols and emoji at the edges ("+ חדש", "ברוך הבא!")
    const e = t.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u);
    if (e[2] && e[2] !== t && (r = lookup(e[2])) != null) return e[1] + r + e[3];
    // Lists joined with " · " or ", "
    if (/ · |, /.test(t)) {
      const out = t.split(/( · |, )/).map((x, i) => i % 2 ? x : tr(x)).join('');
      if (out !== t) return out;
    }
    // Numbers with units
    const u = t.replace(UNIT_RE, w => UNITS[w]);
    if (!HEB.test(u)) return u;
    return null;
  }
  function tr(text) {
    if (lang !== 'en' || text == null || !HEB.test(text)) return text;
    const m = String(text).match(/^(\s*)([\s\S]*?)(\s*)$/);
    const out = core(m[2]);
    return out == null ? text : m[1] + out + m[3];
  }

  // Swap Hebrew text inside a node that was just added to the page
  const ATTRS = ['placeholder', 'aria-label', 'title'];
  const skip = (el, text) => !el || !!el.closest(text ? '[translate="no"], textarea, script, style' : '[translate="no"]');
  function fixText(n) {
    if (!HEB.test(n.data) || skip(n.parentElement, true)) return;
    const t = tr(n.data);
    if (t !== n.data) n.data = t;
  }
  function fixEl(el) {
    if (skip(el)) return;
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v && HEB.test(v)) el.setAttribute(a, tr(v)); }
  }
  function translateTree(root) {
    if (lang !== 'en') return;
    if (root.nodeType === 3) return fixText(root);
    if (root.nodeType !== 1) return;
    fixEl(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? fixText(n) : fixEl(n);
  }
  new MutationObserver(muts => {
    if (lang !== 'en') return;
    for (const m of muts) {
      if (m.type === 'characterData') fixText(m.target);
      else m.addedNodes.forEach(translateTree);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  function apply() {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'he' ? 'rtl' : 'ltr';
  }
  apply();

  window.tr = tr;
  Object.defineProperty(window, 'LANG', { get: () => lang });
  window.setLang = v => {
    lang = v === 'en' ? 'en' : 'he';
    try { localStorage.setItem('gym-lang', lang); } catch (_) { /* storage blocked */ }
    apply();
  };
})();
