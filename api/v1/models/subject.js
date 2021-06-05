const mongoose = require("mongoose");
const {
  INSTITUTE_TEACHER_COLLECTION,
} = require("../utils/constants").collections;

const teacherSchema = new mongoose.Schema(
  {
    regId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
    },
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    photoUrl: String,

    // address
    address: String,
    district: String,
    state: String,
    country: String,
    latitude: Number,
    longitude: Number,

    contactNo: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(INSTITUTE_TEACHER_COLLECTION, teacherSchema);
