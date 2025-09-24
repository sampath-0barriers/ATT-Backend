const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb://localhost:3000/molyreporter');
const database = mongoose.connection;
database.on('error', console.error.bind(console, 'connection error:'));

const ruleSchema = new Schema({
  ruleId: {
    type: String,
    required: true,
    unique: true,
  },
  disabilitiesAffected: {
    type: [String], // Array of strings to list multiple disabilities
    required: true,
  },
  whyItMatters: {
    type: String,
    required: false,
  },
  howToFix: {
    type: String,
    required: false,
  },
  successCriteria: {
    type: [String], // Array of strings to list multiple criteria
    required: false,
  },
});

module.exports = mongoose.model('Rule', ruleSchema, 'rules');


