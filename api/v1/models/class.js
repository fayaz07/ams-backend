const mongoose = require("mongoose");
const { CLASS_COLLECTION } = require("../utils/constants").collections;

var subTeacher = new mongoose.Schema(
  {
    sId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    tId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { _id: false }
);

var subjectHour = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    maxHours: {
      type: Number,
      max: 4,
      default: 0,
    },
    posted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

var attendanceSlot = new mongoose.Schema(
  {
    date: {
      type: Date,
      unique: true,
    },
    subjects: [subjectHour],
  },
  { _id: false }
);

const classSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    students: {
      type: [],
      default: [],
    },
    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    subjects: {
      type: [subTeacher],
      default: [],
    },
    attendance: {
      type: [attendanceSlot],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(CLASS_COLLECTION, classSchema);
