# Sammy (סמ"י) — Local Setup Guide

This guide explains how to run the app on your machine and create an account. Share this document with anyone who needs to work on or demo the project locally.

---

## What you get

**Sammy** is a learning app for summarizing study documents with an AI assistant. Locally it runs as two services:

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend (web UI) | http://localhost:5173 | React app in the browser |
| Backend (API) | http://localhost:3001 | Auth, database, file uploads |
| Database | `localhost:5432` | PostgreSQL (via Docker) |

---

## Prerequisites

Install these before you start:

1. **Node.js 18 or newer**  
   Check: `node -v`

2. **npm** (comes with Node.js)  
   Check: `npm -v`

3. **Docker Desktop** (or Docker Engine + Docker Compose)  
   Check: `docker --version` and `docker compose version`

4. **Git** (to clone the repository)  
   Check: `git --version`

> **Note:** Docker is required for the database. The app does not include a built-in database — PostgreSQL runs in a Docker container.

---

## Step 1 — Get the code

Clone the repository and open the project folder:

```bash
git clone <repository-url>
cd app
```

Replace `<repository-url>` with the actual Git URL your team provides.

---

## Step 2 — Install dependencies

From the project root (`app/`):

```bash
npm install
```

This downloads all frontend and backend packages. It may take 1–2 minutes.

---

## Step 3 — Start the database

Start PostgreSQL in Docker:

```bash
npm run db:up
```

Wait a few seconds for the container to become healthy. You can verify with:

```bash
docker ps
```

You should see a container named `sammy-postgres` running on port `5432`.

**Default database credentials** (defined in `config.json`):

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `5432` |
| User | `sammy` |
| Password | `sammy_dev` |
| Database | `sammy` |

To stop the database later:

```bash
npm run db:down
```

---

## Step 4 — Run the app

Start both the API server and the web UI:

```bash
npm run dev
```

You should see output similar to:

```
[api] Sammy API running at http://0.0.0.0:3001
[api] Dev OTP code: 123456
[api] --- Dev login (skip registration) ---
[api]   Email:    dev@sammy.local
[api]   Password: dev123456
[api] -------------------------------------
[web] (Vite dev server starting...)
```

Open the app in your browser:

**http://localhost:5173**

Keep the terminal open while you use the app. Press `Ctrl+C` to stop both servers.

---

## Default dev account (fastest way in)

For local development, a pre-seeded account is created automatically on first server start. **No registration or OTP needed.**

| Field | Value |
|-------|-------|
| **Email** | `dev@sammy.local` |
| **Password** | `dev123456` |

1. Go to **http://localhost:5173/login**
2. Enter the email and password above
3. Click **"התחברות"** (Log in)

The account is already verified and has a completed student profile. Credentials are defined in `config.json` under `auth.devUser` and printed in the API terminal when the server starts.

---

## Step 5 — Register a new account

The app uses email + password registration with a one-time verification code (OTP).

### 5.1 Open the registration page

Go to: **http://localhost:5173/register**

Or click **"הרשמה חינם"** (Free registration) from the login page.

### 5.2 Create credentials (Step 1 of 3)

Fill in:

- **כתובת אימייל** — any email address (e.g. `you@example.com`)
- **סיסמה** — at least 6 characters
- **אישור סיסמה** — same password again

Click **"צור חשבון"** (Create account).

### 5.3 Verify email with OTP (Step 2 of 3)

After registering, you will see an OTP screen: **"בדוק את תיבת הדואר שלך"**.

In **local development**, emails are not sent. Instead:

- The verification code is always **`123456`** (configured in `config.json` under `auth.devOtp`)
- The code is also printed in the **API terminal** when you register, for example:
  ```
  [auth] OTP for you@example.com: 123456
  ```

Enter `123456` in the 6-digit field and click **"אמת והמשך"** (Verify and continue).

### 5.4 Complete your profile (Step 3 of 3)

Fill in your details (only **שם מלא** / full name is required):

- Full name
- Phone (optional)
- Grade / class (optional)
- Favorite subject (optional)
- Hobbies (optional)

Click **"התחל ללמוד!"** (Start learning!).

You will be redirected to the main dashboard.

---

## Step 6 — Log in (returning users)

1. Go to **http://localhost:5173/login**
2. Enter your email and password
3. Click **"התחברות"** (Log in)

You must complete email verification (OTP) before you can log in.

---

## Configuration (`config.json`)

All local settings live in **`config.json`** at the project root. You do **not** need a `.env` file.

```json
{
  "server": { "port": 3001, "host": "0.0.0.0" },
  "database": {
    "host": "localhost",
    "port": 5432,
    "user": "sammy",
    "password": "sammy_dev",
    "database": "sammy"
  },
  "auth": {
    "jwtSecret": "sammy-local-dev-secret-change-in-production",
    "jwtExpiresIn": "7d",
    "devOtp": "123456",
    "devUser": {
      "email": "dev@sammy.local",
      "password": "dev123456",
      "fullName": "Dev User"
    }
  },
  "uploads": { "dir": "./uploads" },
  "app": { "name": "סמ\"י - סיכום מידע", "title": "Sammy" }
}
```

Change `server.port` if port `3001` is already in use. Change `auth.devOtp` if you want a different default verification code for local dev.

---

## Useful commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + frontend |
| `npm run dev:server` | Start API only |
| `npm run dev:client` | Start frontend only |
| `npm run db:up` | Start PostgreSQL (Docker) |
| `npm run db:down` | Stop PostgreSQL |
| `npm run build` | Build frontend for production |

---

## Troubleshooting

### `npm install` fails or is very slow

- Ensure you have a stable internet connection
- Try again: `npm install`
- Use Node.js 18+

### `npm run db:up` fails

- Make sure Docker is running
- Check if port `5432` is free: another PostgreSQL instance may be using it
- Try: `docker compose down` then `npm run db:up` again

### API fails to start / database connection error

1. Confirm Docker container is running: `docker ps`
2. Wait 5–10 seconds after `db:up` before running `npm run dev`
3. Verify `config.json` database settings match `docker-compose.yml`

### Port already in use

- Frontend (5173): stop other Vite/React dev servers, or change the Vite port in `vite.config.js`
- API (3001): change `server.port` in `config.json`

### OTP code does not work

- Use **`123456`** in local development
- Check the API terminal for the printed OTP line
- If you registered before changing `devOtp`, request a new code with **"שלח שוב"** (Resend) on the OTP screen

### "Please verify your email first" on login

Complete the OTP step during registration before trying to log in.

### Page loads but API calls fail

- Ensure `npm run dev` is running (both `api` and `web` processes)
- Open http://localhost:3001/api/health — you should see `{"ok":true,...}`

---

## Quick start checklist

- [ ] Node.js 18+ installed
- [ ] Docker installed and running
- [ ] `npm install` completed
- [ ] `npm run db:up` — PostgreSQL container running
- [ ] `npm run dev` — API + frontend running
- [ ] Browser open at http://localhost:5173
- [ ] Logged in with dev account **or** registered with OTP `123456`
- [ ] Dashboard visible

---

## Need help?

If something still does not work, share:

1. The exact command you ran
2. The full error message from the terminal
3. Output of `docker ps` and `node -v`
