const Subject = require("../models/subject");
const { errors } = require("../utils/constants");
const success = require("../utils/constants").successMessages;

async function createSubject(req, res) {
  var errMsg = null;
  if (!req.body.name) errMsg = "Subject name is required";

  if (errMsg)
    return res.status(400).json({
      status: errors.FAILED,
      message: errMsg,
    });

  const subject = new Subject({
    name: req.body.name,
    instituteId: req.authUser.instituteId,
    createdBy: req.authUser._id,
  });

  try {
    const saved = await subject.save();
    return res.status(201).json({
      status: success.SUCCESS,
      message: "Created new suject",
      data: {
        subject: saved,
      },
    });
  } catch (err) {
    return res.status(403).json({
      status: errors.FAILED,
      message: "Unable to create subject",
    });
  }
}

async function getAllSubjectsOfInstitute(req, res) {
  const subjects = await Subject.find({
    instituteId: req.authUser.instituteId,
  });
  return res.status(200).json({
    status: success.SUCCESS,
    message: "Fetched all subjects of your institute",
    data: {
      subjects: subjects,
    },
  });
}

module.exports = {
  getAllSubjectsOfInstitute,
  createSubject,
};