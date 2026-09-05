const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Point it at your Neon (or other Postgres) connection string.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

const DEFAULT_COMPANY = {
  name: 'VRV DHAN VAIBHAV FOUNDATION',
  tagline: 'Trusted Lending Partner',
  address: '',
  city: '',
  state: '',
  pincode: '',
  regNo: '',
  pan: '',
  phone: '',
  email: '',
  signatory: '',
  signatoryDesignation: 'Authorized Signatory',
  defaultInterestRatePct: 24,
  defaultInterestType: 'reducing',
  penaltyPct: 2,
  jurisdiction: ''
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS config (
  id INT PRIMARY KEY DEFAULT 1,
  company JSONB NOT NULL,
  logo_data BYTEA,
  logo_mime TEXT,
  CONSTRAINT config_single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  father_or_spouse_name TEXT NOT NULL DEFAULT '',
  dob TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  occupation TEXT NOT NULL DEFAULT '',
  monthly_income NUMERIC NOT NULL DEFAULT 0,
  phone TEXT NOT NULL DEFAULT '',
  alt_phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL DEFAULT '',
  aadhaar_number TEXT NOT NULL DEFAULT '',
  pan_number TEXT NOT NULL DEFAULT '',
  guarantor_name TEXT NOT NULL DEFAULT '',
  guarantor_phone TEXT NOT NULL DEFAULT '',
  guarantor_address TEXT NOT NULL DEFAULT '',
  photo_data BYTEA,
  photo_mime TEXT,
  id_front_data BYTEA,
  id_front_mime TEXT,
  id_back_data BYTEA,
  id_back_mime TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  loan_no TEXT NOT NULL,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL DEFAULT '',
  principal NUMERIC NOT NULL,
  interest_rate_pct NUMERIC NOT NULL,
  interest_type TEXT NOT NULL,
  tenure_months INT NOT NULL,
  disbursement_date TEXT NOT NULL,
  emi_amount NUMERIC NOT NULL,
  total_interest NUMERIC NOT NULL,
  total_payable NUMERIC NOT NULL,
  processing_fee NUMERIC NOT NULL DEFAULT 0,
  collateral TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  schedule JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS counters (
  key TEXT PRIMARY KEY,
  value INT NOT NULL DEFAULT 0
);
`;

let readyPromise = null;

async function ensureSchema() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await pool.query(SCHEMA);
      const { rows } = await pool.query('SELECT 1 FROM config WHERE id = 1');
      if (!rows.length) {
        await pool.query('INSERT INTO config (id, company) VALUES (1, $1)', [DEFAULT_COMPANY]);
      }
    })();
  }
  return readyPromise;
}

// Sequence numbers are per (key, year) — e.g. loan numbers restart their
// visible sequence display each calendar year but never reuse a number.
async function nextDocNumber(client, counterKey, prefix, date) {
  const year = new Date(date || Date.now()).getFullYear();
  const key = `${counterKey}:${year}`;
  const { rows } = await client.query(
    `INSERT INTO counters (key, value) VALUES ($1, 1)
     ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
     RETURNING value`,
    [key]
  );
  const seq = String(rows[0].value).padStart(4, '0');
  return `${prefix}/${year}/${seq}`;
}

module.exports = { pool, ensureSchema, nextDocNumber, DEFAULT_COMPANY };
