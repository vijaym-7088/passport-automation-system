# Passport Automation System

A full-stack application for applying for a passport online and moving that application
through review, police verification and issue.

**Stack:** React 18 + Vite (client) · Node.js + Express (API) · MongoDB + Mongoose (database) ·
JWT authentication · Multer file uploads.

---

## Who does what

| Role | Can do |
| --- | --- |
| **Applicant** | Register, fill the application form, attach documents, submit, track progress |
| **Verification officer** | See files at the police-verification stage, record a clear or adverse report |
| **Passport officer (admin)** | See every file, take up for review, route to verification, issue or reject |

## How an application moves

```
DRAFT --submit--> SUBMITTED --take up--> UNDER_REVIEW --route--> POLICE_VERIFICATION
                                                                        |
                                                    +-------------------+-------------------+
                                                    v                                       v
                                          VERIFICATION_PASSED                   VERIFICATION_FAILED
                                                    |                                       |
                                                 approve                                 reject
                                                    v                                       v
                                               APPROVED                                REJECTED
                                        (passport number issued)
```

Every transition is appended to the application's `timeline`, so the applicant sees exactly
which desk the file is on and when it got there.

---

## Running it locally

### 1. Prerequisites

- Node.js 18 or newer
- MongoDB running locally (`mongod`) or a MongoDB Atlas connection string

### 2. Start the API

```bash
cd server
npm install
cp .env.example .env          # then edit JWT_SECRET
npm run seed                  # creates demo accounts and one draft application
npm run dev                   # http://localhost:5000
```

### 3. Start the client

```bash
cd client
npm install
npm run dev                   # http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:5000`, so there is nothing else to configure.

### 4. Sign in

| Role | Email | Password |
| --- | --- | --- |
| Applicant | `vijay@example.com` | `user1234` |
| Passport officer | `admin@pas.gov` | `admin123` |
| Verification officer | `verifier@pas.gov` | `verify123` |

These are also printed on the sign-in screen.

### A quick end-to-end run

1. Sign in as the applicant, open the seeded draft, attach a photo, a proof of address and a
   proof of date of birth (any JPG or PDF), then submit.
2. Sign in as the passport officer, open the file from the queue, take it up for review, then
   send it for police verification.
3. Sign in as the verification officer and record the report as clear.
4. Back as the passport officer, issue the passport. The applicant now sees the passport number.

---

## API reference

All routes are prefixed with `/api`. Everything except `/auth/register` and `/auth/login`
needs an `Authorization: Bearer <token>` header.

### Authentication

| Method | Route | Notes |
| --- | --- | --- |
| POST | `/auth/register` | Creates an applicant account, returns a token |
| POST | `/auth/login` | Returns a token and the user record |
| GET | `/auth/me` | The signed-in user |

### Applications (applicant)

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/applications` | Own applications (all of them, for staff) |
| POST | `/applications` | Creates a draft |
| GET | `/applications/:id` | One application; owner or staff only |
| PUT | `/applications/:id` | Edit - drafts only |
| DELETE | `/applications/:id` | Delete a draft |
| POST | `/applications/:id/submit` | Validates required documents, then locks the file |
| POST | `/applications/:id/documents` | `multipart/form-data` with `file` and `docType` |
| GET | `/applications/:id/documents/:docId` | Streams the stored file |
| DELETE | `/applications/:id/documents/:docId` | Remove an attachment from a draft |

### Staff

| Method | Route | Role | Notes |
| --- | --- | --- | --- |
| GET | `/staff/applications` | admin, verifier | Supports `?status=` and `?q=` |
| GET | `/staff/stats` | admin, verifier | Counts per stage for the dashboard |
| POST | `/staff/applications/:id/review` | admin | `SUBMITTED` to `UNDER_REVIEW` |
| POST | `/staff/applications/:id/send-for-verification` | admin | `UNDER_REVIEW` to `POLICE_VERIFICATION` |
| POST | `/staff/applications/:id/verdict` | verifier, admin | Body `{ verdict: 'clear' or 'adverse', remarks }` |
| POST | `/staff/applications/:id/approve` | admin | Issues a passport number |
| POST | `/staff/applications/:id/reject` | admin | Body `{ reason }` |

---

## Project layout

```
server/
  server.js              Express app and startup
  db.js                  Mongoose connection
  seed.js                Demo accounts and a sample draft
  models/                User, Application (with the status enum and timeline)
  routes/                auth, applications, staff
  middleware/            auth (JWT + role guard), upload (Multer), error handling
  uploads/               Stored documents (git-ignored)

client/
  src/
    api.js               fetch wrapper that attaches the token
    AuthContext.jsx      Session state and login/register/logout
    constants.js         Status labels, document labels, date formatting
    components/          Layout, ProtectedRoute, StatusBadge, Timeline, Notice
    pages/               Login, Register, MyApplications, ApplicationForm,
                         ApplicationDetail, StaffQueue
    styles.css           All styling, no CSS framework
```

## Design decisions worth knowing

- **Passwords** are hashed with bcrypt in a Mongoose `pre('save')` hook and the field is
  `select: false`, so it never leaves the database by accident.
- **Role checks** live in one place - `allow(...roles)` in `middleware/auth.js` - rather than
  being repeated inside each handler.
- **Status transitions are guarded server-side.** A request to issue a passport on a file that
  has not cleared verification is rejected by the API, not just hidden in the UI.
- **Uploads** are capped at 5 MB and restricted to JPG, PNG, WEBP and PDF. Files are served
  through an authenticated route, so a stored document cannot be fetched by guessing its URL.
- **Application numbers** (`APP-2026-000001`) are generated in a `pre('validate')` hook.

## Things you could add next

- Email or SMS notification on each status change (Nodemailer, Twilio)
- A downloadable PDF acknowledgement slip on submission
- Appointment slot booking at a passport office
- Rate limiting on the auth routes (`express-rate-limit`)
- Jest + Supertest coverage for the status-transition rules
