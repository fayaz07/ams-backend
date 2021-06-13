const mongoose = require("mongoose");
const Institute = require("../models/institute");
const Errors = require("../utils/constants").errors;
const Success = require("../utils/constants").successMessages;
const AccountRoles = require("../utils/constants").account;
const UserControllers = require("./user");
const StudentControllers = require("./student");
const Student = require("../models/student");

async function addInstitute(req, res) {
  const data = req.body;

  var errMsg = null;

  if (!data.regId) errMsg = "Institute Registration id is required";
  else if (!data.name) errMsg = "Institute Name is required";
  else if (!data.principal) errMsg = "Principal name is required";

  if (errMsg) {
    return res.status(400).json({
      status: Errors.FAILED,
      message: errMsg,
    });
  }

  // check if institute registration id is already taken
  const exists = await getInstituteByRegId(data.regId);
  //console.log(exists);
  if (exists && exists._id) {
    return res.status(409).json({
      status: Errors.FAILED,
      message: "Institute Registration Id is already taken",
    });
  }

  // create institute profile
  const newInstitute = new Institute(data);
  try {
    const result = await newInstitute.save();
    console.log(result);
    if (!result) {
      return res.status(403).json({
        status: Errors.FAILED,
        message: "Institute can't be created",
      });
    } else {
      return res.status(200).json({
        status: Success.SUCCESS,
        message: "Institute has been created",
        data: result,
      });
    }
  } catch (err) {
    return res.status(403).json({
      status: Errors.FAILED,
      message: "Institute can't be created",
      error: err,
    });
  }
}

async function getInstituteByRegId(instituteId) {
  return await Institute.findOne({ regId: instituteId });
}

async function getInstituteById(instituteId) {
  return await Institute.findById(
    mongoose.Types.ObjectId(instituteId.toString())
  );
}

async function getInstitutes(req, res) {
  const institutes = await Institute.find();
  return res.status(200).json({
    status: Success.SUCCESS,
    message: "Fetched institutes",
    data: {
      institutes: institutes,
    },
  });
}

async function getCurrentInstitute(req, res) {
  const institute = await Institute.findOne({
    _id: mongoose.Types.ObjectId(req.authUser.instituteId.toString()),
  });
  const teachersCount = await UserControllers.getCountOfUsersByInstituteAndRole(
    institute._id,
    AccountRoles.accRoles.teacher
  );
  const studentsCount = await StudentControllers.getStudentsCountByInstituteId(
    institute._id
  );
  return res.status(200).json({
    status: Success.SUCCESS,
    message: "Fetched your institute",
    data: {
      institute: institute,
      noOfTeachers: teachersCount,
      noOfStudents: studentsCount,
    },
  });
}

async function getStudentsOfInstitute(req, res) {
  const students = await Student.find(
    { instituteId: req.institute._id },
    { attendance: 0, createdAt: 0, updatedAt: 0, __v: 0 }
  );

  return res.status(200).json({
    status: Success.SUCCESS,
    message: "Fetched students of institute",
    data: {
      students: students,
    },
  });
}

module.exports = {
  addInstitute,
  getInstituteByRegId,
  getInstituteById,
  getInstitutes,
  getCurrentInstitute,
  getStudentsOfInstitute,
};
