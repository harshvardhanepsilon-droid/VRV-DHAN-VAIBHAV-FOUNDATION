# VRV Dhan Vaibhav Foundation — Loan CRM

![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-4.x-000000?logo=express&logoColor=white)
![Postgres](https://img.shields.io/badge/database-postgresql-4169E1?logo=postgresql&logoColor=white)
![Last commit](https://img.shields.io/github/last-commit/harshvardhanepsilon-droid/VRV-DHAN-VAIBHAV-FOUNDATION)
![Status](https://img.shields.io/badge/status-active--development-blue)

A loan-management CRM: customer KYC (with photo and ID document uploads), loan creation with automatic EMI/interest calculation (reducing balance or flat rate), repayment schedule tracking, and downloadable PDF loan agreements.

## Stack

Node.js + Express backend, PostgreSQL (deployed on [Neon](https://neon.tech)) as the database, and a vanilla HTML/CSS/JS frontend — no build step, no framework. Deployed on [Render](https://render.com).

Uploaded photos and ID documents are stored directly in Postgres (as binary columns) rather than on local disk, so nothing is lost between deploys or server restarts.

## Running it locally

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL with your Postgres connection string
npm start
```

Then open `http://localhost:4100`. The database schema is created automatically on first run — no separate migration step.

## Deploying

1. **Database**: create a Neon project, copy its connection string.
2. **Web service**: create a Render Web Service from this repo — build command `npm install`, start command `npm start` — and set the `DATABASE_URL` environment variable to the Neon connection string. Render sets `PORT` automatically.

## Notes

- Company branding (name, address, logo, default interest terms) is configured from the **Settings** page and feeds directly into the generated loan agreement PDFs.
- `.env` is gitignored — `DATABASE_URL` holds real database credentials and must never be committed.
