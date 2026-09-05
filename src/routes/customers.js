const express = require('express');
const multer = require('multer');
const router = express.Router();
const { pool, logActivity } = require('../db');
const { compressPhoto, compressDocument } = require('../utils/image');

const imageFilter = (req, file, cb) => {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};
const upload = multer({ storage: multer.memoryStorage(), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

function toCustomerDTO(row) {
  return {
    id: row.id,
    name: row.name,
    fatherOrSpouseName: row.father_or_spouse_name,
    dob: row.dob,
    gender: row.gender,
    occupation: row.occupation,
    monthlyIncome: Number(row.monthly_income) || 0,
    phone: row.phone,
    altPhone: row.alt_phone,
    email: row.email,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    aadhaarNumber: row.aadhaar_number,
    panNumber: row.pan_number,
    guarantorName: row.guarantor_name,
    guarantorPhone: row.guarantor_phone,
    guarantorAddress: row.guarantor_address,
    photoPath: row.photo_data ? `/api/customers/${row.id}/photo` : '',
    idFrontPath: row.id_front_data ? `/api/customers/${row.id}/document/front` : '',
    idBackPath: row.id_back_data ? `/api/customers/${row.id}/document/back` : '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*,
      COUNT(l.id) FILTER (WHERE l.id IS NOT NULL) AS loan_count,
      COUNT(l.id) FILTER (WHERE l.status = 'active') AS active_loan_count,
      COALESCE(SUM(
        (SELECT SUM((inst->>'emi')::numeric) FROM jsonb_array_elements(l.schedule) inst WHERE inst->>'status' != 'paid')
      ) FILTER (WHERE l.status != 'closed'), 0) AS total_outstanding
    FROM customers c
    LEFT JOIN loans l ON l.customer_id = c.id
    GROUP BY c.id
    ORDER BY c.id DESC
  `);
  res.json(rows.map((row) => ({
    ...toCustomerDTO(row),
    loanCount: Number(row.loan_count),
    activeLoanCount: Number(row.active_loan_count),
    totalOutstanding: Number(row.total_outstanding)
  })));
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
  const { rows: loanRows } = await pool.query('SELECT * FROM loans WHERE customer_id = $1 ORDER BY id DESC', [req.params.id]);
  const loans = loanRows.map((l) => ({
    id: l.id,
    loanNo: l.loan_no,
    customerId: l.customer_id,
    purpose: l.purpose,
    principal: Number(l.principal),
    interestRatePct: Number(l.interest_rate_pct),
    interestType: l.interest_type,
    tenureMonths: l.tenure_months,
    disbursementDate: l.disbursement_date,
    emiAmount: Number(l.emi_amount),
    totalInterest: Number(l.total_interest),
    totalPayable: Number(l.total_payable),
    processingFee: Number(l.processing_fee),
    collateral: l.collateral,
    status: l.status,
    schedule: l.schedule,
    createdAt: l.created_at,
    updatedAt: l.updated_at
  }));
  res.json({ ...toCustomerDTO(rows[0]), loans });
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  if (!body.name || !body.name.trim()) return res.status(400).json({ error: 'Customer name is required' });
  const { rows } = await pool.query(
    `INSERT INTO customers (
      name, father_or_spouse_name, dob, gender, occupation, monthly_income, phone, alt_phone, email,
      address, city, state, pincode, aadhaar_number, pan_number, guarantor_name, guarantor_phone, guarantor_address
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING *`,
    [
      body.name.trim(), body.fatherOrSpouseName || '', body.dob || '', body.gender || '', body.occupation || '',
      Number(body.monthlyIncome) || 0, body.phone || '', body.altPhone || '', body.email || '',
      body.address || '', body.city || '', body.state || '', body.pincode || '',
      body.aadhaarNumber || '', body.panNumber || '', body.guarantorName || '', body.guarantorPhone || '', body.guarantorAddress || ''
    ]
  );
  logActivity('customer', rows[0].id, 'created', `Added customer ${rows[0].name}`);
  res.status(201).json(toCustomerDTO(rows[0]));
});

router.put('/:id', async (req, res) => {
  const body = req.body || {};
  if (!body.name || !body.name.trim()) return res.status(400).json({ error: 'Customer name is required' });
  const { rows } = await pool.query(
    `UPDATE customers SET
      name=$1, father_or_spouse_name=$2, dob=$3, gender=$4, occupation=$5, monthly_income=$6,
      phone=$7, alt_phone=$8, email=$9, address=$10, city=$11, state=$12, pincode=$13,
      aadhaar_number=$14, pan_number=$15, guarantor_name=$16, guarantor_phone=$17, guarantor_address=$18,
      updated_at=now()
    WHERE id=$19 RETURNING *`,
    [
      body.name.trim(), body.fatherOrSpouseName || '', body.dob || '', body.gender || '', body.occupation || '',
      Number(body.monthlyIncome) || 0, body.phone || '', body.altPhone || '', body.email || '',
      body.address || '', body.city || '', body.state || '', body.pincode || '',
      body.aadhaarNumber || '', body.panNumber || '', body.guarantorName || '', body.guarantorPhone || '', body.guarantorAddress || '',
      req.params.id
    ]
  );
  if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
  logActivity('customer', rows[0].id, 'updated', `Updated KYC details for ${rows[0].name}`);
  res.json(toCustomerDTO(rows[0]));
});

router.delete('/:id', async (req, res) => {
  const { rows: loanCheck } = await pool.query('SELECT 1 FROM loans WHERE customer_id = $1 LIMIT 1', [req.params.id]);
  if (loanCheck.length) return res.status(400).json({ error: 'Cannot delete a customer with loan records. Close their loans first.' });
  const { rows: existing } = await pool.query('SELECT name FROM customers WHERE id = $1', [req.params.id]);
  const { rowCount } = await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Customer not found' });
  logActivity('customer', Number(req.params.id), 'deleted', `Deleted customer ${existing[0] ? existing[0].name : ''}`.trim());
  res.status(204).end();
});

router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const compressed = await compressPhoto(req.file.buffer);
  const { rows } = await pool.query(
    'UPDATE customers SET photo_data=$1, photo_mime=$2, updated_at=now() WHERE id=$3 RETURNING *',
    [compressed, 'image/jpeg', req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
  logActivity('customer', rows[0].id, 'photo_uploaded', `Uploaded photo for ${rows[0].name}`);
  res.json(toCustomerDTO(rows[0]));
});

router.post('/:id/documents', upload.fields([{ name: 'idFront', maxCount: 1 }, { name: 'idBack', maxCount: 1 }]), async (req, res) => {
  const files = req.files || {};
  const sets = [];
  const values = [];
  let i = 1;
  if (files.idFront && files.idFront[0]) {
    const compressed = await compressDocument(files.idFront[0].buffer);
    sets.push(`id_front_data=$${i++}`, `id_front_mime=$${i++}`);
    values.push(compressed, 'image/jpeg');
  }
  if (files.idBack && files.idBack[0]) {
    const compressed = await compressDocument(files.idBack[0].buffer);
    sets.push(`id_back_data=$${i++}`, `id_back_mime=$${i++}`);
    values.push(compressed, 'image/jpeg');
  }
  if (!sets.length) return res.status(400).json({ error: 'No file uploaded' });
  sets.push('updated_at=now()');
  values.push(req.params.id);
  const { rows } = await pool.query(`UPDATE customers SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`, values);
  if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
  logActivity('customer', rows[0].id, 'documents_uploaded', `Uploaded ID document(s) for ${rows[0].name}`);
  res.json(toCustomerDTO(rows[0]));
});

async function serveImage(req, res, dataCol, mimeCol) {
  const { rows } = await pool.query(`SELECT ${dataCol} AS data, ${mimeCol} AS mime FROM customers WHERE id = $1`, [req.params.id]);
  if (!rows.length || !rows[0].data) return res.status(404).end();
  res.setHeader('Content-Type', rows[0].mime || 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(rows[0].data);
}

router.get('/:id/photo', (req, res) => serveImage(req, res, 'photo_data', 'photo_mime'));
router.get('/:id/document/front', (req, res) => serveImage(req, res, 'id_front_data', 'id_front_mime'));
router.get('/:id/document/back', (req, res) => serveImage(req, res, 'id_back_data', 'id_back_mime'));

module.exports = router;
