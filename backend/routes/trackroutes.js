const express = require('express');
const router = express.Router();
const BookTest = require('../models/BookTest');
const path = require('path');
const generateReport = require('../utils/generateReport');
const sendReportEmail = require('../utils/sendEmail');


// GET /api/track?phone=9876543210
router.get('/track',async (req, res) => {
  const { phone } = req.query;

  if (!phone || phone.length !== 10) {
    return res.status(400).json({ message: 'Invalid phone number' });
  }

  try {
    const booking = await BookTest.findOne({ phoneNumber: phone });

    if (!booking) {
      return res.status(404).json({ message: 'No booking found for this number' });
    }

    // ✅ Calculate current status
    const now = new Date();
    const created = new Date(booking.createdAt);
    const timePassed = (now - created) / (1000 * 60); // in minutes

console.log("🕓 createdAt:", booking.createdAt);
console.log("🕓 Now:", now);
console.log("🕓 Time passed (min):", timePassed);


let currentStatus = 'Requested';
if (timePassed >= 60 && timePassed < 120) {
  currentStatus = 'Pickup Scheduled';
} else if (timePassed >= 120 && timePassed < 180) {
  currentStatus = 'Sample Collected';
} else if (timePassed >= 180 && timePassed < 600) {
  currentStatus = 'Report in Process';
} else if (timePassed >= 600) {
  currentStatus = 'Report Ready';
}

console.log("🩺 Computed status:", currentStatus);

    // ✅ Send response immediately
    res.json({
      ...booking.toObject(),
      currentStatus,
      reportSent: booking.reportSent || false
    });

    // ✅ Then handle report + email in background
   if (currentStatus === 'Report Ready' && !booking.reportSent) {
  try {
    const filePath = path.join(__dirname, `../reports/${booking._id}.pdf`);
    await generateReport(booking, filePath);
    console.log("✅ Report generated");

    await sendReportEmail(booking.email, booking.fullName, filePath);
    console.log(`✅ Email sent to ${booking.email}`);

    booking.reportSent = true;
    await booking.save();
  } catch (err) {
    console.error("❌ Error sending report:", err.message);
    // Do not send res here — we’ll send res.json below no matter what
  }
}


  } catch (err) {
    console.error('❌ Tracking route error:', err.message);
    res.status(500).json({ message: 'Error retrieving booking' });
  }
});

// POST /api/admin/update-status
router.post('/admin/update-status', async (req, res) => {
  const { phone, newStatus } = req.body;

  if (!phone || !newStatus) {
    return res.status(400).json({ message: 'Missing phone or newStatus' });
  }

  const allowed = ['Requested', 'Pickup Scheduled', 'Sample Collected', 'Report in Process', 'Report Ready'];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const booking = await BookTest.findOne({ phoneNumber: phone });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = newStatus;
    await booking.save();

    res.json({ message: `✅ Status updated to ${newStatus}` });
  } catch (err) {
    console.error('❌ Admin status update failed:', err.message);
    res.status(500).json({ message: 'Error updating status' });
  }
});


module.exports = router;

