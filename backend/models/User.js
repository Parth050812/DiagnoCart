const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
  password: String,
  languagePreference: String,
  isHealthWorker: Boolean,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
