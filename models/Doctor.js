// models/Doctor.js
const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  age: { type: Number, required: true },
  workExperience: { type: Number, required: true },
  speciality: { type: String, required: true },
  location: { type: String, required: true },
  timeSlot: { type: String, required: true }
});

module.exports = mongoose.model('Doctor', doctorSchema);
