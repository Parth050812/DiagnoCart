const express = require('express');
const router = express.Router();
const BookTest = require('../models/BookTest');


function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized. Please login.' });
}



router.post('/book-test', async (req, res) => {
  try {
    const testData = new BookTest(req.body);
    await testData.save();
    res.status(201).json({ message: 'Test booked successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to book test' });
  }
});

module.exports = router;
