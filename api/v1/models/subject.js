const mongoose = require("mongoose");
const { SUBJECT_COLLECTION } = require("../utils/constants").collections;

const subjectSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(SUBJECT_COLLECTION, subjectSchema);
