const Errors = require("../utils/constants").errors;
const Success = require("../utils/constants").successMessages;
const { getInstituteById } = require("./institute");
const { registerInstituteUser } = require("./auth");
const AccountRoles = require("../utils/constants").account;

async function createInsAdmin(req, res) {
  if (!req.body.instituteId) {
    return res.status(400).json({
      status: Errors.FAILED,
      message: "Institute id is required",
    });
  }

  const institute = await getInstituteById(req.body.instituteId);
  if (!institute || !institute._id) {
    return res.status(400).json({
      status: Errors.FAILED,
      message: "Institute not found",
    });
  }

  const adminCreated = await registerInstituteUser({
    name: institute.principal,
    instituteId: institute._id,
    createdBy: req.tokenData.authId,
    role: AccountRoles.accRoles.instituteAdmin,
  });

  //  console.log(adminCreated);

  if (adminCreated.success) {
    return res.status(200).json({
      status: Success.SUCCESS,
      message: "Institute Admin created",
      data: adminCreated.data,
    });
  } else {
    return res.status(403).json({
      status: Errors.FAILED,
      message: "Institute Admin creation failed",
    });
  }
}

module.exports = {
  createInsAdmin,
};
