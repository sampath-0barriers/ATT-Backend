const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb://localhost:3000/molyreporter'); // Replace with domain that will connect to scan_results collection

const database = mongoose.connection;
database.on('error', console.error.bind(console, 'connection error:'));

const scanDetailsSchema = new Schema({
  _id: mongoose.Schema.ObjectId,
  scanRequestID: mongoose.Schema.ObjectId,
  testEngine: mongoose.Object,
  testEnvironment: mongoose.Object,
  timestamp: Date,
  url: String,
  toolOptions: mongoose.Object,
  inapplicable: [String],
  passes: [String],
  violations: [String],
});

module.exports = mongoose.model('ScanDetails', scanDetailsSchema, scan_results);
