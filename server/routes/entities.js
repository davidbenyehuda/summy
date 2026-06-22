import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from './auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/student-profiles', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (user_id !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const result = await query(
      'SELECT * FROM student_profiles WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id]
    );
    res.json(result.rows.map(formatProfile));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch profiles' });
  }
});

router.post('/student-profiles', async (req, res) => {
  try {
    const { user_id, full_name, grade, subjects, learning_goal, onboarding_complete } = req.body;
    if (user_id !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const result = await query(
      `INSERT INTO student_profiles (user_id, full_name, grade, subjects, learning_goal, onboarding_complete)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, full_name, grade, JSON.stringify(subjects || []), learning_goal, onboarding_complete ?? false]
    );
    res.json(formatProfile(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create profile' });
  }
});

router.patch('/student-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM student_profiles WHERE id = $1', [id]);
    if (!existing.rows.length || existing.rows[0].user_id !== req.userId) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    const { full_name, grade, subjects, learning_goal, onboarding_complete } = req.body;
    const result = await query(
      `UPDATE student_profiles SET
        full_name = COALESCE($1, full_name),
        grade = COALESCE($2, grade),
        subjects = COALESCE($3, subjects),
        learning_goal = COALESCE($4, learning_goal),
        onboarding_complete = COALESCE($5, onboarding_complete),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [
        full_name ?? null,
        grade ?? null,
        subjects ? JSON.stringify(subjects) : null,
        learning_goal ?? null,
        onboarding_complete ?? null,
        id,
      ]
    );
    res.json(formatProfile(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.get('/summary-history', async (req, res) => {
  try {
    const { user_id, limit = '50' } = req.query;
    if (user_id !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const result = await query(
      'SELECT * FROM summary_history WHERE user_id = $1 ORDER BY created_date DESC LIMIT $2',
      [user_id, parseInt(limit, 10)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

router.post('/summary-history', async (req, res) => {
  try {
    const { user_id, file_name, file_url, title, summary_text } = req.body;
    if (user_id !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const result = await query(
      `INSERT INTO summary_history (user_id, file_name, file_url, title, summary_text)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, file_name, file_url, title, summary_text]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save summary' });
  }
});

router.delete('/summary-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM summary_history WHERE id = $1', [id]);
    if (!existing.rows.length || existing.rows[0].user_id !== req.userId) {
      return res.status(404).json({ message: 'Not found' });
    }
    await query('DELETE FROM summary_history WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete summary' });
  }
});

function formatProfile(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    grade: row.grade,
    subjects: typeof row.subjects === 'string' ? JSON.parse(row.subjects) : row.subjects,
    learning_goal: row.learning_goal,
    onboarding_complete: row.onboarding_complete,
    created_date: row.created_at,
  };
}

export default router;
