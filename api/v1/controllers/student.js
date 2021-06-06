const Student = require("../models/student");
const { errors } = require("../utils/constants");
const success = require("../utils/constants").successMessages;
const mongoose = require("mongoose");
const ClassControllers = require("./class");

async function createStudent(req, res) {
  var errMsg = null;
  if (!req.body.name) errMsg = "Student name is required";
  else if (!req.body.classId) errMsg = "Class Id is required";
  else if (!req.body.rollNumber) errMsg = "Roll Number Id is required";

  if (errMsg)
    return res.status(400).json({
      status: errors.FAILED,
      message: errMsg,
    });

  const classInstance = await ClassControllers.getClassById(req.body.classId);

  if (!classInstance || !classInstance._id) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Class not found",
    });
  }

  const student = new Student({
    name: req.body.name,
    instituteId: req.authUser.instituteId,
    createdBy: req.authUser.userId,
    classId: classInstance._id,
    rollNumber: req.body.rollNumber,
  });

  try {
    const saved = await student.save();
    const addToClass = await ClassControllers.addStudentToClass(
      classInstance._id,
      student._id
    );
    console.log(addToClass);
    return res.status(201).json({
      status: success.SUCCESS,
      message: "Created new Student",
      data: {
        student: saved,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(403).json({
      status: errors.FAILED,
      message: "Unable to create student",
      error: err,
    });
  }
}

async function getStudentsCountByInstituteId(instituteId) {
  return Student.find({ instituteId: instituteId }).countDocuments();
}

module.exports = {
  createStudent,
  getStudentsCountByInstituteId,
};
