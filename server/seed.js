import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { config } from './config.js';

export async function seedDevUser() {
  const devUser = config.auth?.devUser;
  if (!devUser?.email || !devUser?.password) return;

  const email = devUser.email.toLowerCase();
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);

  if (existing.rows.length) {
    console.log(`[seed] Dev user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(devUser.password, 10);
  const userResult = await query(
    `INSERT INTO users (email, password_hash, full_name, email_verified)
     VALUES ($1, $2, $3, TRUE) RETURNING id`,
    [email, passwordHash, devUser.fullName || 'Dev User']
  );
  const userId = userResult.rows[0].id;

  await query(
    `INSERT INTO student_profiles (user_id, full_name, grade, subjects, learning_goal, onboarding_complete)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [
      userId,
      devUser.fullName || 'Dev User',
      'י׳12',
      JSON.stringify(['ביולוגיה']),
      'פיתוח מקומי',
    ]
  );

  console.log(`[seed] Dev user created: ${email}`);
}

export function logDevCredentials() {
  const devUser = config.auth?.devUser;
  if (!devUser?.email || !devUser?.password) return;

  console.log('--- Dev login (skip registration) ---');
  console.log(`  Email:    ${devUser.email}`);
  console.log(`  Password: ${devUser.password}`);
  console.log('-------------------------------------');
}
