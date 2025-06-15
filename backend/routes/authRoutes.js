const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// ✅ Signup Route
router.post('/signup',
  [
  body('name')
    .isLength({ min: 3 }).withMessage('Name must be at least 3 characters.')
    .matches(/^[A-Za-z\s]+$/).withMessage('Name must only contain letters and spaces.'),
  
  body('phoneNumber')
    .matches(/^\d{10}$/).withMessage('Phone number must be 10 digits.'),

  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/\d/).withMessage('Password must contain at least one number.')
],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, phoneNumber, password } = req.body;
    const existing = await User.findOne({ phoneNumber });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const newUser = new User({ name, phoneNumber, password });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  }
);


router.post('/login',
  [
    body('phoneNumber').matches(/^\d{10}$/).withMessage('Phone number must be 10 digits.'),
    body('password').notEmpty().withMessage('Password is required.')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { phoneNumber, password } = req.body;
      const user = await User.findOne({ phoneNumber });

      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      req.session.user = {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber
      };

      res.json({
        message: 'Login successful',
        userId: user._id,
        name: user.name
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);


router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});


module.exports = router;
