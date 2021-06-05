const mongoose = require("mongoose");
const { USER_COLLECTION } = require("../utils/constants").collections;
const account = require("../utils/constants").account;

const userSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    role: {
      type: String,
      default: account.accRoles.normalUser,
      enum: account.accRolesList,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      unique: true,
    },
    username: {
      type: String,
      unique: true,
      required: true,
    },
    subjects: {
      type: [],
      default: {},
    },
    firstName: String,
    lastName: String,
    gender: String,
    age: Number,
    knownLanguages: {
      type: String,
    },
    profession: String,
    location: Object,
    latitude: Number,
    longitude: Number,
    photoUrl: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(USER_COLLECTION, userSchema);
