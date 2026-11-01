# כושר

אפליקציית אימונים אישית לאייפון: מכשירים עם תמונות, רישום משקלים וסטים, טיימר מנוחה, תוכניות אימון והיסטוריה.

פותחים את האתר בספארי, לוחצים על כפתור השיתוף ואז "הוסף למסך הבית".
הנתונים נשמרים רק בטלפון. מומלץ לשמור גיבוי מדי פעם (בהגדרות).

## תזכורת באימון פעיל

כשיש אימון פתוח, שירות קטן בענן (`functions/`) שולח התראה לטלפון ולשעון כל 10 דקות, עד 3 שעות.
מפעילים בהגדרות, "הפעל תזכורות" (רק כשהאפליקציה פתוחה מהאייקון במסך הבית).

הקמה חד־פעמית:
1. ב־Firebase, בפרויקט `gym1-88389`: מעבר לתוכנית Blaze (תשלום לפי שימוש).
2. ב־Firebase: הגדרות הפרויקט ← Service accounts ← Generate new private key (קובץ JSON).
3. ב־Google Cloud, IAM: לתת לחשבון `firebase-adminsdk-...` רק את התפקידים הדרושים לפרסום: Cloud Functions Admin, Cloud Run Admin, Cloud Scheduler Admin, Service Account User, Artifact Registry Administrator, Firebase Rules Admin, Service Usage Admin. לא Owner.
4. בגיטהאב, במאגר: Settings ← Secrets and variables ← Actions ← New repository secret בשם `FIREBASE_SERVICE_ACCOUNT`, והתוכן הוא כל הקובץ מסעיף 2.
5. להריץ את הפעולה Cloud בלשונית Actions (או למזג שינוי בתיקייה `functions`).
