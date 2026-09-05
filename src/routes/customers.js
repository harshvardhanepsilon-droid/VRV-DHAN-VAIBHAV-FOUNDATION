const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { readDB, writeDB, nextId } = require('../db');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

function storageFor(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_ROOT, subdir)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  });
}

const imageFilter = (req, file, cb) => {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};

const uploadPhoto = multer({ storage: storageFor('photos'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadDocs = multer({ storage: storageFor('documents'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

function deleteUploadedFile(relPath) {
  if (!relPath) return;
  const full = path.join(UPLOAD_ROOT, '..', relPath);
  fs.unlink(full, () => {});
}

router.get('/', (req, res) => {
  const db = readDB();
  const customers = db.customers.map((c) => {
    const loans = db.loans.filter((l) => l.customerId === c.id);
    return {
      ...c,
      loanCount: loans.length,
      activeLoanCount: loans.filter((l) => l.status === 'active').length,
      totalOutstanding: loans
        .filter((l) => l.status !== 'closed')
        .reduce((sum, l) => sum + l.schedule.filter((s) => s.status !== 'paid').reduce((s2, i) => s2 + i.emi, 0), 0)
    };
  }).sort((a, b) => b.id - a.id);
  res.json(customers);
});

router.get('/:id', (req, res) => {
  const db = readDB();
  const customer = db.customers.find((c) => c.id === Number(req.params.id));
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const loans = db.loans.filter((l) => l.customerId === customer.id);
  res.json({ ...customer, loans });
});

router.post('/', (req, res) => {
  const db = readDB();
  const body = req.body || {};
  if (!body.name || !body.name.trim()) return res.status(400).json({ error: 'Customer name is required' });
  const now = new Date().toISOString();
  const customer = {
    id: nextId(db, 'customers'),
    name: body.name.trim(),
    fatherOrSpouseName: body.fatherOrSpouseName || '',
    dob: body.dob || '',
    gender: body.gender || '',
    occupation: body.occupation || '',
    monthlyIncome: Number(body.monthlyIncome) || 0,
    phone: body.phone || '',
    altPhone: body.altPhone || '',
    email: body.email || '',
    address: body.address || '',
    city: body.city || '',
    state: body.state || '',
    pincode: body.pincode || '',
    aadhaarNumber: body.aadhaarNumber || '',
    panNumber: body.panNumber || '',
    guarantorName: body.guarantorName || '',
    guarantorPhone: body.guarantorPhone || '',
    guarantorAddress: body.guarantorAddress || '',
    photoPath: '',
    idFrontPath: '',
    idBackPath: '',
    createdAt: now,
    updatedAt: now
  };
  db.customers.push(customer);
  writeDB(db);
  res.status(201).json(customer);
});

router.put('/:id', (req, res) => {
  const db = readDB();
  const customer = db.customers.find((c) => c.id === Number(req.params.id));
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const body = req.body || {};
  if (!body.name || !body.name.trim()) return res.status(400).json({ error: 'Customer name is required' });
  const fields = [
    'name', 'fatherOrSpouseName', 'dob', 'gender', 'occupation', 'phone', 'altPhone', 'email',
    'address', 'city', 'state', 'pincode', 'aadhaarNumber', 'panNumber',
    'guarantorName', 'guarantorPhone', 'guarantorAddress'
  ];
  fields.forEach((f) => { if (body[f] !== undefined) customer[f] = body[f]; });
  if (body.monthlyIncome !== undefined) customer.monthlyIncome = Number(body.monthlyIncome) || 0;
  customer.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(customer);
});

router.delete('/:id', (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const hasLoans = db.loans.some((l) => l.customerId === id);
  if (hasLoans) return res.status(400).json({ error: 'Cannot delete a customer with loan records. Close their loans first.' });
  const idx = db.customers.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
  const [removed] = db.customers.splice(idx, 1);
  [removed.photoPath, removed.idFrontPath, removed.idBackPath].forEach(deleteUploadedFile);
  writeDB(db);
  res.status(204).end();
});

router.post('/:id/photo', uploadPhoto.single('photo'), (req, res) => {
  const db = readDB();
  const customer = db.customers.find((c) => c.id === Number(req.params.id));
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (customer.photoPath) deleteUploadedFile(customer.photoPath);
  customer.photoPath = `/uploads/photos/${req.file.filename}`;
  customer.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(customer);
});

router.post('/:id/documents', uploadDocs.fields([{ name: 'idFront', maxCount: 1 }, { name: 'idBack', maxCount: 1 }]), (req, res) => {
  const db = readDB();
  const customer = db.customers.find((c) => c.id === Number(req.params.id));
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const files = req.files || {};
  if (files.idFront && files.idFront[0]) {
    if (customer.idFrontPath) deleteUploadedFile(customer.idFrontPath);
    customer.idFrontPath = `/uploads/documents/${files.idFront[0].filename}`;
  }
  if (files.idBack && files.idBack[0]) {
    if (customer.idBackPath) deleteUploadedFile(customer.idBackPath);
    customer.idBackPath = `/uploads/documents/${files.idBack[0].filename}`;
  }
  customer.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(customer);
});

module.exports = router;
