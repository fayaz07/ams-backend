const Class = require("../models/class");
const { errors } = require("../utils/constants");
const success = require("../utils/constants").successMessages;
const { getSubjectsIdsFromIdsArray } = require("./subject");

async function createClass(req, res) {
  var errMsg = null;
  if (!req.body.name) errMsg = "Class name is required";
  else if (!req.body.subjects) errMsg = "Subjects are required";
  else if (!Array.isArray(req.body.subjects))
    errMsg = "Subjects must be an array";
  else if (req.body.subjects.length < 1)
    errMsg = "Atleast one subject is required";

  if (errMsg)
    return res.status(400).json({
      status: errors.FAILED,
      message: errMsg,
    });

  const instituteId = req.authUser.instituteId;

  // fetch subjects
  const subjects = await getSubjectsIdsFromIdsArray(
    req.body.subjects,
    instituteId
  );
  var subIds = [];

  subjects.forEach((e) => {
    subIds.push(e._id);
  });

  //  console.log(subIds);

  if (subIds.length < 1) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Sujects must be valid",
    });
  }

  const subject = new Class({
    name: req.body.name,
    instituteId: req.authUser.instituteId,
    createdBy: req.authUser._id,
    subjects: subIds,
  });

  try {
    const saved = await subject.save();
    return res.status(201).json({
      status: success.SUCCESS,
      message: "Created new class",
      data: {
        class: saved,
      },
    });
  } catch (err) {
    return res.status(403).json({
      status: errors.FAILED,
      message: "Unable to create class",
    });
  }
}

async function getAllClassesOfInstitute(req, res) {
  const classes = await Class.find({
    instituteId: req.authUser.instituteId,
  });
  return res.status(200).json({
    status: success.SUCCESS,
    message: "Fetched all classes of your institute",
    data: {
      classes: classes,
    },
  });
}

module.exports = {
  createClass,
  getAllClassesOfInstitute,
};
