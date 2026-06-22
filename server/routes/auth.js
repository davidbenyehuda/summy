import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../db.js';
import { config } from '../config.js';

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ sub: userId }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(header.slice(7), config.auth.jwtSecret);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function formatUser(row) {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    email_verified: row.email_verified,
    created_date: row.created_at,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email.toLowerCase(), passwordHash]
    );
    const user = result.rows[0];
    const otp = config.auth.devOtp || String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await query(
      'INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), otp, expiresAt]
    );
    console.log(`[auth] OTP for ${email}: ${otp}`);
    res.json({ ok: true, user_id: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    const otpResult = await query(
      'SELECT * FROM otp_codes WHERE email = $1 AND code = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email.toLowerCase(), otpCode]
    );
    if (!otpResult.rows.length) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }
    const userResult = await query(
      'UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE email = $1 RETURNING *',
      [email.toLowerCase()]
    );
    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userResult.rows[0];
    const access_token = signToken(user.id);
    res.json({ access_token, user: formatUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verification failed' });
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const otp = config.auth.devOtp || String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await query(
      'INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), otp, expiresAt]
    );
    console.log(`[auth] OTP for ${email}: ${otp}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to resend code' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!result.rows.length) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.email_verified) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }
    const access_token = signToken(user.id);
    res.json({ access_token, user: formatUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(formatUser(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { full_name } = req.body;
    const result = await query(
      'UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [full_name, req.userId]
    );
    res.json(formatUser(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userResult.rows.length) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userResult.rows[0].id, token, expiresAt]
      );
      console.log(`[auth] Password reset link token for ${email}: ${token}`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Request failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    const tokenResult = await query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [resetToken]
    );
    if (!tokenResult.rows.length) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      tokenResult.rows[0].user_id,
    ]);
    await query('DELETE FROM password_reset_tokens WHERE id = $1', [tokenResult.rows[0].id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Reset failed' });
  }
});

export default router;
