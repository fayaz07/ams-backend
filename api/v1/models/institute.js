const mongoose = require("mongoose");
const { INSTITUTE_COLLECTION } = require("../utils/constants").collections;

const instituteSchema = new mongoose.Schema(
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
    photoUrl: String,

    // address
    address: String,
    district: String,
    state: String,
    country: String,
    latitude: Number,
    longitude: Number,

    established: Number,
    principal: String,
    vicePrincipal: String,
    contactNo: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(INSTITUTE_COLLECTION, instituteSchema);
