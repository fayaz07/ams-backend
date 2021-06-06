const mongoose = require("mongoose");
const { CLASS_COLLECTION } = require("../utils/constants").collections;

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
    },
    subjects: {
      type: [
        {
          sub_id: {
            type: mongoose.Schema.Types.ObjectId,
            unique: true,
          },
          teacher_id: {
            type: mongoose.Schema.Types.ObjectId,
            unique: true,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(CLASS_COLLECTION, classSchema);
