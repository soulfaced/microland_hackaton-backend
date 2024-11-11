const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  patientEmail: {
    type: String,
    required: true,
    index: true
  },
  chatSessions: [
    {
      sessionId: {
        type: String,
        required: true,
        unique: true
      },
      date: {
        type: Date,
        default: Date.now
      },
      messages: [
        {
          question: String,
          answer: String
        }
      ]
    }
  ]
});

const PatientChatHistory = mongoose.model('PatientChatHistory', chatHistorySchema);
module.exports = PatientChatHistory;
