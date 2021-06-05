const Errors = require("../utils/constants").errors;
const Success = require("../utils/constants").successMessages;
const { registerInstituteUser } = require("./auth");
const AccountRoles = require("../utils/constants").account;

async function createInsModerator(req, res) {
  var errMsg = null;

  if (!req.body.name) errMsg = "Name of moderator is required";

  if (errMsg) {
    return res.status(400).json({
      status: Errors.FAILED,
      message: errMsg,
    });
  }
  const instituteId = req.authUser.instituteId;

  const moderatorCreated = await registerInstituteUser({
    name: req.body.name,
    instituteId: instituteId,
    createdBy: req.tokenData.authId,
    role: AccountRoles.accRoles.instituteModerator,
  });

  if (moderatorCreated.success) {
    return res.status(200).json({
      status: Success.SUCCESS,
      message: "Institute Moderator created",
      data: moderatorCreated.data,
    });
  } else {
    return res.status(403).json({
      status: Errors.FAILED,
      message: "Institute Moderator creation failed",
    });
  }
}

module.exports = {
  createInsModerator,
};
