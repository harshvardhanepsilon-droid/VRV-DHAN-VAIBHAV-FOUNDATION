const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const { rows } = await pool.query(
    'SELECT id, entity_type, entity_id, action, summary, created_at FROM activity_log ORDER BY id DESC LIMIT $1',
    [limit]
  );
  res.json(rows.map((r) => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    action: r.action,
    summary: r.summary,
    createdAt: r.created_at
  })));
});

module.exports = router;
