const mongoose = require('mongoose');

const testRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  phoneNumber: String,
  address: {
    village: String,
    district: String,
    pincode: String,
  },
  testType: String,
  preferredDate: Date,
  status: {
    type: String,
    enum: ['Requested', 'Scheduled', 'Collected', 'Report Ready'],
    default: 'Requested',
  },
  prescriptionFileURL: String,
  reportFileURL: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TestRequest', testRequestSchema);
