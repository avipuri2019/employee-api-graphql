const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day'],
    required: true
  },
  checkIn: Date,
  checkOut: Date,
  notes: String
});

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 65
  },
  class: {
    type: String,
    required: true
  },
  subjects: [{
    type: String,
    required: true
  }],
  attendance: [attendanceSchema],
  department: String,
  position: String,
  salary: Number,
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: String,
  address: String,
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Employee', employeeSchema);
