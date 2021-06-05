const mongoose = require("mongoose");
const Institute = require("../models/institute");
const Errors = require("../utils/constants").errors;
const Success = require("../utils/constants").successMessages;

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
  return res.status(200).json({
    status: Success.SUCCESS,
    message: "Fetched your institute",
    data: {
      institute: institute,
    },
  });
}

module.exports = {
  addInstitute,
  getInstituteByRegId,
  getInstituteById,
  getInstitutes,
  getCurrentInstitute,
};
