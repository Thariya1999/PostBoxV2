# Postbox – MERN mail & messaging app

Register, log in, write a message, pick one or many registered users, and send.
Recipients get a live notification (and see it as unread if they were offline).
When a recipient opens the message, the sender gets a "read" notification and
WhatsApp-style ticks (✓ sent, ✓✓ read).

## Stack
MongoDB + Express + React (Vite) + Node, JWT auth, Socket.IO for live notifications.

## Run it

1. Install MongoDB locally (or use a MongoDB Atlas URI).
2. Edit `server/.env` (a ready-to-use copy of `.env.example` is included):
   ```
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/mern-mail
   JWT_SECRET=put_a_long_random_string_here
   CLIENT_URL=http://localhost:5173
   ```
3. From this folder:
   ```
   npm run install-all
   npm run dev
   ```
4. Open http://localhost:5173

To test: register two users in two different browsers (or one normal + one
incognito window), send a message from one, and watch the other get notified.

## Email setup (verification, password reset, new-message emails)
Fill in the `SMTP_*` lines in `server/.env`. For Gmail: turn on 2-Step Verification,
create an App Password at https://myaccount.google.com/apppasswords, then use:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=youraddress@gmail.com
SMTP_PASS=your16characterapppassword
MAIL_FROM=Postbox <youraddress@gmail.com>
```
If `SMTP_*` is left empty, the app still works: every email (including the
verification and reset links) is printed in the server terminal instead.

## Features
- Register / Login with show/hide password buttons and live validation
- Password rules + strength meter + confirm password
- Email verification (link emailed, valid 24 hours) before first login
- Forgot / reset password by email (link valid 1 hour)
- Settings: change password, turn email notifications on/off
- Email to the recipient's address for every new message (subject only, never the body)
- Security: helmet headers, rate limiting, account lockout after 5 wrong passwords
  (15 min), NoSQL-injection protection, hashed emailed tokens, input limits, and
  all sessions logged out when a password changes
- New registered users appear instantly in everyone's "Send to" list
- Select one, several, or all users (with search) as recipients
- Inbox with unread highlighting and unread count badge
- Live toast + browser notification when a new message arrives
- Sent list with ✓ / ✓✓ status and per-person "Read at" details
- Live toast to the sender when someone reads their message

## Structure
```
server/   Express API, Mongoose models, Socket.IO
  models/  User.js, Message.js
  routes/  auth.js, users.js, messages.js
client/   React app (Vite)
  src/pages, src/components, src/context
```

## API
| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/register | Create account + send verification email |
| POST | /api/auth/verify-email | Confirm email with emailed token |
| POST | /api/auth/resend-verification | Send a new verification link |
| POST | /api/auth/login | Log in (verified accounts only) |
| POST | /api/auth/forgot-password | Email a reset link |
| POST | /api/auth/reset-password | Set a new password with emailed token |
| POST | /api/auth/change-password | Change password (logged in) |
| PATCH | /api/auth/settings | Email notifications on/off |
| GET | /api/auth/me | Current user |
| GET | /api/users | People I can send to |
| POST | /api/messages | Send to selected users |
| GET | /api/messages/inbox | My received messages |
| GET | /api/messages/sent | My sent messages + read status |
| GET | /api/messages/:id | Open message (marks read, notifies sender) |
