# סמ"י - סיכום מידע (Sammy)

אפליקציית למידה חכמה לסיכום מסמכים עם עוזר AI.

**מדריך מלא להרצה מקומית והרשמה:** [docs/LOCAL_SETUP.md](./docs/LOCAL_SETUP.md)  
*(Share this guide with teammates who need to run the project locally.)*

## דרישות

- Node.js 18+
- Docker (למסד הנתונים PostgreSQL)

## התקנה והרצה

1. התקנת תלויות:

```bash
npm install
```

2. הפעלת מסד הנתונים:

```bash
npm run db:up
```

3. הרצת האפליקציה (API + פרונט):

```bash
npm run dev
```

הפרונט זמין ב-[http://localhost:5173](http://localhost:5173)  
ה-API זמין ב-[http://localhost:3001](http://localhost:3001)

## קובץ הגדרות

הגדרות האפליקציה נמצאות ב-[`config.json`](./config.json):

- `server` — פורט ו-host של ה-API
- `database` — חיבור PostgreSQL
- `auth` — JWT וקוד OTP לפיתוח (`devOtp`: `123456`)
- `uploads` — תיקיית קבצים מועלים
- `app` — שם האפליקציה

## הרשמה בפיתוח

1. הירשם עם אימייל וסיסמה
2. השתמש בקוד OTP מהקונסול של השרת (ברירת מחדל: `123456`)
3. השלם את פרופיל הסטודנט

## פקודות נוספות

```bash
npm run build      # בניית פרונט לייצור
npm run db:down    # עצירת PostgreSQL
```
