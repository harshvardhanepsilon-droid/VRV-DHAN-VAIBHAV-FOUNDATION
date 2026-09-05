const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

const DEFAULT_DB = {
  config: {
    company: {
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
      logoDataUrl: '',
      defaultInterestRatePct: 24,
      defaultInterestType: 'reducing',
      penaltyPct: 2,
      jurisdiction: ''
    }
  },
  customers: [],
  loans: [],
  counters: { customer: 0, loan: 0 }
};

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const db = JSON.parse(raw);
  Object.keys(DEFAULT_DB).forEach((key) => {
    if (db[key] === undefined) db[key] = Array.isArray(DEFAULT_DB[key]) ? [] : DEFAULT_DB[key];
  });
  // Backfill nested config keys added after some installs already have a db.json.
  Object.keys(DEFAULT_DB.config.company).forEach((key) => {
    if (db.config.company[key] === undefined) db.config.company[key] = DEFAULT_DB.config.company[key];
  });
  return db;
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(db, collectionName) {
  const items = db[collectionName];
  return items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

function nextDocNumber(db, counterKey, prefix, date) {
  db.counters[counterKey] = (db.counters[counterKey] || 0) + 1;
  const seq = String(db.counters[counterKey]).padStart(4, '0');
  const y = new Date(date || Date.now()).getFullYear();
  return `${prefix}/${y}/${seq}`;
}

module.exports = { readDB, writeDB, nextId, nextDocNumber, DB_PATH, DEFAULT_DB };
