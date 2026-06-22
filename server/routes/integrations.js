import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './auth.js';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(path.join(__dirname, '..', '..', config.uploads.dir));

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({ storage });
const router = express.Router();

const GLOSSARY = {
  גלוקוז: 'גלוקוז הוא סוכר פשוט שהצמח מייצר בפוטוסינתזה ומשמש כמקור האנרגיה העיקרי לצמיחה.',
  חמצן: 'חמצן הוא גז שמשתחרר כתוצר לוואי של פיצול מולקולות המים בתגובות האור.',
  כלורופיל: 'כלורופיל הוא הפיגמנט הירוק שסופג אור שמש ומאפשר לצמח להתחיל את תהליך הפוטוסינתזה.',
  ATP: 'ATP הוא מולקולה שמאחסנת אנרגיה זמנית שהצמח משתמש בה לבניית גלוקוז.',
  NADPH: 'NADPH מספק אלקטרונים ואנרגיה לשלב קיבוע הפחמן במחזור קלווין.',
  'מחזור קלווין': 'מחזור קלווין הוא סדרת תגובות כימיות שבהן CO₂ מומר לגלוקוז בעזרת ATP ו-NADPH.',
  סטרומה: 'הסטרומה היא הנוזל שבתוך הכלורופלסט שבו מתרחש מחזור קלווין.',
  כלורופלסט: 'כלורופלסט הוא אברון בתוך תא הצמח שבו מתרחשת הפוטוסינתזה.',
};

router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const file_url = `/uploads/${req.file.filename}`;
  res.json({ file_url });
});

router.post('/extract', authMiddleware, (req, res) => {
  const { file_url } = req.body;
  const fileName = file_url?.split('/').pop() || 'document';
  const title = fileName.replace(/\.[^/.]+$/, '');

  res.json({
    status: 'success',
    output: {
      sections: [
        {
          heading: `1. סיכום: ${title}`,
          body: 'מסמך זה עוסק בנושאי לימוד מרכזיים. התוכן הועלה בהצלחה וניתן לעבור עליו בעזרת עוזר ה-AI בצד ימין.',
        },
        {
          heading: '2. נקודות עיקריות',
          body: 'המסמך מכיל מושגים חשובים, הגדרות ודוגמאות. השתמשו במונחים המסומנים לקבלת הסברים מותאמים.',
        },
        {
          heading: '3. המלצות ללמידה',
          body: 'קראו את הסיכום, נסו את טאב המשחק, והשוו בין הסבר פשוט לאנלוגיה כדי לחזק את ההבנה.',
        },
      ],
    },
  });
});

router.post('/llm', authMiddleware, (req, res) => {
  const { prompt } = req.body;
  const termMatch = prompt?.match(/term "([^"]+)"/i);
  const term = termMatch?.[1];

  if (term && GLOSSARY[term]) {
    return res.json(GLOSSARY[term]);
  }

  if (term) {
    return res.json(
      `${term} הוא מושג מרכזי בביולוגיה של הצמחים. בפוטוסינתזה, מושגים כמו ${term} עוזרים להבין איך אור הופך לאנרגיה כימית.`
    );
  }

  res.json('הסבר קצר: פוטוסינתזה היא תהליך שבו צמחים ממירים אור, מים ו-CO₂ לגלוקוז וחמצן.');
});

export { uploadsDir };
export default router;
