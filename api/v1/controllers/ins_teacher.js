const Errors = require("../utils/constants").errors;
const Success = require("../utils/constants").successMessages;
const { registerInstituteUser } = require("./auth");
const AccountRoles = require("../utils/constants").account;
const { getSubjectsIdsFromIdsArray } = require("./subject");

async function createInsTeacher(req, res) {
  var errMsg = null;

  if (!req.body.name) errMsg = "Name of moderator is required";
  else if (!req.body.subjects) errMsg = "Subjects are required";
  else if (!Array.isArray(req.body.subjects))
    errMsg = "Subjects must be an array";
  else if (req.body.subjects.length < 1)
    errMsg = "Atleast one subject is required";

  if (errMsg) {
    return res.status(400).json({
      status: Errors.FAILED,
      message: errMsg,
    });
  }

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
      status: Errors.FAILED,
      message: "Sujects must be valid",
    });
  }

  const moderatorCreated = await registerInstituteUser({
    name: req.body.name,
    instituteId: instituteId,
    createdBy: req.tokenData.authId,
    role: AccountRoles.accRoles.teacher,
    subjects: subIds,
  });

  if (moderatorCreated.success) {
    return res.status(200).json({
      status: Success.SUCCESS,
      message: "Institute Teacher created",
      data: moderatorCreated.data,
    });
  } else {
    return res.status(403).json({
      status: Errors.FAILED,
      message: "Institute Teacher creation failed",
    });
  }
}

module.exports = {
  createInsTeacher,
};
