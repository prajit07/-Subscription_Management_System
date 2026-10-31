const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1', [decoded.id]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const requireOwnerOrStaff = (getEntityOwnerId) => async (req, res, next) => {
  if (['admin', 'staff'].includes(req.user.role)) return next();
  try {
    const ownerId = await getEntityOwnerId(req);
    if (!ownerId || ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this resource' });
    }
    next();
  } catch (err) { next(err); }
};

module.exports = { authenticate, requireRole, requireOwnerOrStaff };
