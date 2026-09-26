# common-backend

Node.js + Express + MongoDB (Mongoose) REST API shared by `web-frontend` (public site)
and `admin-frontend` (CMS admin console) of the Top Pristine Luxury Craft corporate website.

## Stack
- Node.js 20, Express 4
- MongoDB / Mongoose
- JWT access + refresh token authentication
- Nodemailer for transactional email (invites, password resets, inquiry replies)

## Getting started

```bash
cp .env.example .env    # fill in real values before deploying
npm install
npm run seed             # creates the first super_admin user + default CMS content
npm run dev               # http://localhost:5000
```

## Environment variables

See `.env.example` for the full list. **All values shipped in this repo are dummy
placeholders** — replace `MONGODB_URI`, `JWT_*_SECRET`, `SMTP_*`, and `SEED_ADMIN_*`
with real values in your deployment's secret manager (never commit `.env`).

## API overview

| Area       | Routes                                                   | Auth        |
|------------|-----------------------------------------------------------|-------------|
| Auth       | `POST /api/auth/login`, `/refresh`, `/forgot-password`, `/reset-password`, `/accept-invite`, `GET /me` | Mixed |
| Users      | `GET /api/users`, `POST /api/users/invite`, `PATCH/DELETE /api/users/:id` | Admin |
| Inquiries  | `POST /api/inquiries`, `POST /api/inquiries/quote` (public); `GET/PATCH/DELETE /api/inquiries/:id`, `POST /api/inquiries/:id/reply` (admin) | Mixed |
| Content    | `GET /api/content/:page` (public); `GET /api/content`, `PUT /api/content/:page` (admin) | Mixed |
| Dashboard  | `GET /api/dashboard/stats` | Admin |

## Testing & linting

```bash
npm test
npm run lint
```

## Docker

```bash
docker build -t common-backend .
docker run --env-file .env -p 5000:5000 common-backend
```

## CI/CD

See `/.github/workflows/common-backend.yml` at the repo root. On push to `main`, it
installs dependencies, lints, tests, builds a Docker image, pushes it to Amazon ECR,
and updates the ECS service — all using dummy placeholder secret names that must be
configured in the GitHub repository settings before the deploy job will succeed.
