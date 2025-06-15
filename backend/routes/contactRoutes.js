// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// POST /api/contact
router.post('/contact', async (req, res) => {
  try {
    const { fullName, email, mobileNumber, subject, message } = req.body;

    if (!fullName || !email || !mobileNumber || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newContact = new Contact({ fullName, email, mobileNumber, subject, message });
    await newContact.save();

    res.status(201).json({ message: 'Your message has been submitted successfully.' });
  } catch (err) {
    console.error('Error saving contact form:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
