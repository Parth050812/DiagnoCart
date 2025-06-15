const mongoose = require('mongoose');

const bookTestSchema = new mongoose.Schema({
  fullName: String,
  phoneNumber: String,
  email: String,
  age: Number,
  address: String,
  testType: String,
  preferredDate: String,
  timeSlot: String,
  prescription: String, // file URL or name if uploaded
  instructions: String,
  createdAt: { type: Date, default: Date.now },
  status: {
  type: String,
  enum: ['Requested', 'Sample Collected', 'Testing', 'Report Ready'],
  default: 'Requested'
},

});

module.exports = mongoose.model('BookTest', bookTestSchema);
