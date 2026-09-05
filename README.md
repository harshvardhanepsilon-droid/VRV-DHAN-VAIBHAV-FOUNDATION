# VRV Dhan Vaibhav Foundation — Loan CRM

![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-4.x-000000?logo=express&logoColor=white)
![Last commit](https://img.shields.io/github/last-commit/harshvardhanepsilon-droid/VRV-DHAN-VAIBHAV-FOUNDATION)
![Status](https://img.shields.io/badge/status-active--development-blue)

A local loan-management CRM: customer KYC (with photo and ID document uploads), loan creation with automatic EMI/interest calculation (reducing balance or flat rate), repayment schedule tracking, and downloadable PDF loan agreements.

## Stack

Plain Node.js + Express backend, a JSON file as the database (`src/data/db.json`, auto-created on first run), and a vanilla HTML/CSS/JS frontend — no build step, no framework.

## Running it

```bash
npm install
npm start
```

Then open `http://localhost:4100`.

## Notes

- `src/data/db.json` and everything under `uploads/` (except the company logo) are gitignored — this app stores real customer KYC data (photos, Aadhaar/PAN, ID scans) and that must never end up in a public repository. On a fresh clone, the app creates an empty database automatically.
- Company branding (name, address, logo, default interest terms) is configured from the **Settings** page and feeds directly into the generated loan agreement PDFs.
