const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { body } = require('express-validator');
const db = require('../config/database');
const { validatePassword, handleValidationErrors } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('full_name').trim().notEmpty(),
  body('password').custom((val) => { if (!validatePassword(val)) throw new Error('Password must be 8+ chars with upper, lower, special'); return true; }),
  handleValidationErrors,
], async (req, res) => {
  const { email, full_name, password } = req.body;
  try {
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already exists' });
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(`INSERT INTO users (email, password_hash, full_name, role) VALUES ($1,$2,$3,'customer') RETURNING id, email, full_name, role`, [email, hash, full_name]);
    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({ user: rows[0], token });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Registration failed' }); }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidationErrors,
], async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await db.query('SELECT id, email, full_name, role, password_hash, is_active FROM users WHERE email = $1', [email]);
    if (!rows.length || !rows[0].is_active) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const { password_hash, ...user } = rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ user, token });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Login failed' }); }
});

router.post('/forgot-password', [body('email').isEmail().normalizeEmail(), handleValidationErrors], async (req, res) => {
  const { email } = req.body;
  try {
    const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (rows.length) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000);
      await db.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [token, expiry, rows[0].id]);
      console.log(`[DEV] Reset token for ${email}: ${token}`);
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) { res.status(500).json({ error: 'Request failed' }); }
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

router.post('/staff', authenticate, requireRole('admin'), [
  body('email').isEmail().normalizeEmail(),
  body('full_name').trim().notEmpty(),
  body('password').custom((val) => { if (!validatePassword(val)) throw new Error('Password does not meet policy'); return true; }),
  handleValidationErrors,
], async (req, res) => {
  const { email, full_name, password } = req.body;
  try {
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already in use' });
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(`INSERT INTO users (email, password_hash, full_name, role) VALUES ($1,$2,$3,'staff') RETURNING id, email, full_name, role`, [email, hash, full_name]);
    res.status(201).json({ user: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Staff creation failed' }); }
});

module.exports = router;
