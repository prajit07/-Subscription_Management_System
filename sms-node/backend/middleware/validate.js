const { validationResult } = require('express-validator');
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
const validatePassword = (password) => PASSWORD_REGEX.test(password);
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: 'Validation failed', details: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};
module.exports = { validatePassword, handleValidationErrors, PASSWORD_REGEX };
