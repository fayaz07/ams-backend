const InsAdmin = require("../models/ins_admin");
const { getInstituteById } = require("./institute");
const Errors = require("../utils/constants").errors;
const Success = require("../utils/constants").successMessages;
const { hashThePassword } = require("./auth");

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

  const username = createUsername(institute.principal);

  const availableUsername = await findAvailableUsername(username);

  const newPassword = require("crypto").randomBytes(8).toString("hex");

  const hashedPassword = await hashThePassword(newPassword);

  const newInsAdmin = new InsAdmin({
    username: availableUsername,
    name: institute.principal,
    instituteId: institute._id,
    password: hashedPassword,
  });

  try {
    const saved = await newInsAdmin.save();
    if (!saved) {
      return res.status(400).json({
        status: Errors.FAILED,
        message: "Failed to create institute admin",
      });
    }
    saved.password = newPassword;
    return res.status(201).json({
      status: Success.SUCCESS,
      message: "Created institute admin",
      data: {
        instituteAdmin: saved,
      },
    });
  } catch (err) {
    return res.status(403).json({
      status: Errors.FAILED,
      message: "Failed to create institute admin",
      error: err,
    });
  }
}

async function findAvailableUsername(username) {
  const max_tries = 15;
  var tries = 0;

  const adm = await getInsAdminByUsername(username);
  if (!adm || !adm._id) {
    return username;
  }

  while (tries < max_tries) {
    tries++;
    const adm = await getInsAdminByUsername(username + tries);
    if (!adm || !adm._id) {
      return username + tries;
    }
  }
  return require("crypto").randomBytes(6).toString("hex");
}

function createUsername(name) {
  return name.toString().toLowerCase().replace(" ", ".");
}

async function getInsAdminByUsername(username) {
  return await InsAdmin.findOne({ username: username });
}

module.exports = {
  createInsAdmin,
};
