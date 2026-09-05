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

CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INT,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

// Loan numbers are one more than the highest number currently in use for
// that prefix/year — not a permanent monotonic counter — so deleting the
// most recently created loan frees its number back up for the next one
// instead of burning it forever. Must be called on a client already inside
// a transaction (see loans.js): the advisory lock is transaction-scoped, so
// it only actually serializes concurrent creates against each other when
// held for the lifetime of the surrounding INSERT.
async function nextLoanNumber(client, prefix, date) {
  const year = new Date(date || Date.now()).getFullYear();
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${prefix}:${year}`]);
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(NULLIF(regexp_replace(loan_no, '^.*/', ''), '')::int), 0) AS max_seq
     FROM loans WHERE loan_no LIKE $1`,
    [`${prefix}/${year}/%`]
  );
  return `${prefix}/${year}/${Number(rows[0].max_seq) + 1}`;
}

// Fire-and-forget: a logging failure should never break the action it's
// describing, so errors here are swallowed rather than propagated.
function logActivity(entityType, entityId, action, summary) {
  pool.query(
    'INSERT INTO activity_log (entity_type, entity_id, action, summary) VALUES ($1,$2,$3,$4)',
    [entityType, entityId, action, summary]
  ).catch((err) => console.error('activity log failed:', err.message));
}

module.exports = { pool, ensureSchema, nextLoanNumber, logActivity, DEFAULT_COMPANY };
