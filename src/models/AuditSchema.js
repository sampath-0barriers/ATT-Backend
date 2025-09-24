const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb://localhost:3000/molyreporter');
const database = mongoose.connection;
database.on('error', console.error.bind(console, 'connection error:'));

const auditSchema = new Schema({
  client: {
    type: String,
    required: true,
    unique: true,
  },
  contact_name: {
    type: String,
    required: true,
  },
  contact_email: {
    type: String,
    required: true,
  },
  company_address: {
    type: String,
    required: false,
  },
  auditor: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Audit', auditSchema, 'audit_data');


