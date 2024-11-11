// models/Patient.js
const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true, enum: ['male', 'female'] },
  medicalHistory: [{ type: String }],
  location: { type: String, required: true }
});

module.exports = mongoose.model('Patient', patientSchema);
