# common-backend

Node.js + Express + MongoDB (Mongoose) REST API shared by `web-frontend` (public site)
and `admin-frontend` (CMS admin console) of the Top Pristine Luxury Craft corporate website.

## Stack
- Node.js 20, Express 4
- MongoDB / Mongoose
- JWT access + refresh token authentication
- EmailJS for team invitation emails; Nodemailer for password resets and inquiry replies

## Getting started

```bash
cp .env.example .env    # fill in real values before deploying
npm install
npm run seed             # creates the first super_admin user + default CMS content
npm run dev               # http://localhost:5000
```

## Environment variables

Set the application's environment variables in your local environment or deployment
secret manager. Never commit `.env` or real credentials.

Team invites also require the EmailJS service ID, invite template ID, public key, and
private key to be set as `EMAILJS_SERVICE_ID`, `EMAILJS_INVITE_TEMPLATE_ID`,
`EMAILJS_PUBLIC_KEY`, and `EMAILJS_PRIVATE_KEY`. Keep the private key only in the
backend environment; never put it in frontend code. The private key is sent to EmailJS
as its `accessToken` server-side.

```dotenv
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_INVITE_TEMPLATE_ID=your_invite_template_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
EMAILJS_PRIVATE_KEY=your_emailjs_private_key
```

In the EmailJS invite template, set **To Email** to `{{to_email}}`. Suggested subject:
`You're invited to {{app_name}}`. Use these template variables in the message:
`{{to_name}}`, `{{role}}`, and `{{temporary_password}}`. The invitation email contains
a randomly generated six-character temporary password. The User model hashes it before
it is stored in MongoDB. Do not add an invite URL: the invite-acceptance page is not
implemented.

Example HTML content:

```html
<p>Hello {{to_name}},</p>
<p>You've been invited to {{app_name}} as {{role}}.</p>
<p>Your temporary password is: <strong>{{temporary_password}}</strong></p>
<p>Use this password to sign in.</p>
```

## API overview

| Area       | Routes                                                   | Auth        |
|------------|-----------------------------------------------------------|-------------|
| Auth       | `POST /api/auth/login`, `/refresh`, `/forgot-password`, `/reset-password`, `/accept-invite`, `GET /me` | Mixed |
| Users      | `GET /api/users`, `POST /api/users/invite`, `PATCH/DELETE /api/users/:id` | Admin |
| Inquiries  | `POST /api/inquiries`, `POST /api/inquiries/quote` (public); `GET/PATCH/DELETE /api/inquiries/:id`, `POST /api/inquiries/:id/reply` (admin) | Mixed |
| Content    | `GET /api/content/:page` (public); `GET /api/content`, `PUT /api/content/:page` (admin) | Mixed |
| Dashboard  | `GET /api/dashboard/stats` | Admin |

### Testing the public forms with Postman

Set the method to `POST`, choose **Body → raw → JSON**, and set `Content-Type: application/json`.
Use `http://localhost:5000` as the base URL when running the backend locally.

The Contact page and the General Inquiry tab both submit to `POST /api/inquiries`:

```json
{
  "fullName": "Jordan Lee",
  "companyName": "Northstar Offices",
  "email": "jordan@example.com",
  "phone": "+1 604 555 0123",
  "inquiryType": "General Inquiry",
  "message": "Please contact me about facility cleaning."
}
```

The Quote tab submits to `POST /api/inquiries/quote`:

```json
{
  "contactName": "Taylor Morgan",
  "companyName": "Example Property Group",
  "email": "taylor@example.com",
  "phone": "+1 604 555 0100",
  "serviceType": "Commercial Office Cleaning",
  "facilitySize": 5000,
  "cleaningSchedule": "Weekly",
  "startDate": "2026-11-01",
  "budgetRange": "$1,000 - $3,000/mo",
  "notes": "Please include the reception and meeting rooms."
}
```

`startDate`, `budgetRange`, `companyName`, and `notes` are optional for quote requests.
Successful submissions return HTTP `201` with `{ "success": true, "inquiry": ... }`.

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
