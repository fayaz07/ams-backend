const mongoose = require("mongoose");
const { STUDENT_COLLECTION } = require("../utils/constants").collections;

const studentSchema = new mongoose.Schema(
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
    rollNumber: {
      type: String,
      required: true,
    },
    photoUrl: {
      type: String,
      required: false,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    attendance: {
      type: [
        {
          date: {
            type: Date,
            unique: true,
          },
          classId: { type: mongoose.Schema.Types.ObjectId, unique: true },
          attendance: [
            {
              subId: { type: mongoose.Schema.Types.ObjectId, unique: true },
              hours: Number,
            },
          ],
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(STUDENT_COLLECTION, studentSchema);
