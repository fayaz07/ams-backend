const mongoose = require("mongoose");
const InsModerator = require("../models/ins_moderator");
// const { getInstituteById } = require("./institute");
const Errors = require("../utils/constants").errors;
const Success = require("../utils/constants").successMessages;
const {
  hashThePassword,
  comparePasswords,
  createNewRefreshTokenIfAboutToExpire,
} = require("./auth");
const Helpers = require("../../../core/helpers");
const JWTHandler = require("../../../core/jwt");
const Headers = require("../utils/constants").headers;
// const { getInsAdminById } = require("../controllers/ins_admin");

async function createInsModerator(req, res) {
  var errMsg = null;

  if (!req.body.instituteId) errMsg = "Institute id is required";
  else if (!req.body.name) errMsg = "Name of moderator is required";

  if (errMsg) {
    return res.status(400).json({
      status: Errors.FAILED,
      message: errMsg,
    });
  }

  const institute = req.institute;

  //  const insAdmin = req.authUser;

  //  console.log(insAdmin);

  const username = createUsername(req.body.name);
  const availableUsername = await findAvailableUsername(username);

  const newPassword = require("crypto").randomBytes(8).toString("hex");

  const hashedPassword = await hashThePassword(newPassword);

  const newInsModerator = new InsModerator({
    username: availableUsername,
    name: req.body.name,
    instituteId: institute._id,
    password: hashedPassword,
    createdBy: mongoose.Types.ObjectId(req.tokenData.authId.toString()),
  });

  try {
    const saved = await newInsModerator.save();
    if (!saved) {
      return res.status(400).json({
        status: Errors.FAILED,
        message: "Failed to create institute moderator",
      });
    }
    saved.password = newPassword;
    return res.status(201).json({
      status: Success.SUCCESS,
      message: "Created institute moderator",
      data: {
        instituteModerator: saved,
      },
    });
  } catch (err) {
    return res.status(403).json({
      status: Errors.FAILED,
      message: "Failed to create institute moderator",
      error: err,
    });
  }
}

async function findAvailableUsername(username) {
  const max_tries = 15;
  var tries = 0;

  const adm = await getInsModeratorByUsername(username);
  if (!adm || !adm._id) {
    return username;
  }

  while (tries < max_tries) {
    tries++;
    const adm = await getInsModeratorByUsername(username + tries);
    if (!adm || !adm._id) {
      return username + tries;
    }
  }
  return require("crypto").randomBytes(6).toString("hex");
}

function createUsername(name) {
  return name.toString().toLowerCase().replace(" ", ".");
}

async function getInsModeratorByUsername(username) {
  return await InsModerator.findOne({ username: username });
}

async function getInsModeratorById(id) {
  return await InsModerator.findById(mongoose.Types.Schema(id.toString()));
}

async function login(req, res) {
  // check if user exists
  var authUser = await getInsModeratorByUsername(req.body.username);

  //console.log(authUser);

  if (!authUser)
    return res
      .status(400)
      .json({ status: Errors.FAILED, message: Errors.INVALID_EMAIL_PASSWORD });

  // validate the password
  const validPass = await comparePasswords(
    req.body.password,
    authUser.password
  );
  if (!validPass)
    return res.status(400).json({
      status: Errors.FAILED,
      message: Errors.INCORRECT_PASSWORD,
    });

  return loginUser(authUser, Headers.EMAIL_KEY, res);
}

/* Login user   
    - check if email is verified
    - check if access is denied for the user
    - [ERROR] if user tries to login with diff route then throw error(admin)
    - generate access and refresh tokens 
    - save tokens and send back to client
*/
async function loginUser(authUser, provider, res) {
  authUser = await createNewRefreshTokenIfAboutToExpire(authUser);

  const accessToken = await JWTHandler.genAccessToken(authUser._id);

  // saving refresh-token in database
  await authUser.save(async (error, savedUser) => {
    if (savedUser) {
      return res
        .status(200)
        .header(Headers.ACCESS_TOKEN, accessToken)
        .header(Headers.REFRESH_TOKEN, authUser.refreshToken)
        .json(
          provider === Headers.EMAIL_KEY
            ? {
                status: Success.SUCCESS,
                message: Success.LOGIN_SUCCESS,
              }
            : {
                status: Success.SUCCESS,
                message: Helpers.joinWithSpace(provider, Success.LOGIN_SUCCESS),
              }
        );
    }
    // Print the error and sent back failed response
    console.log(error);
    return res.status(403).json({
      status: Errors.FAILED,
      message: Helpers.joinWithCommaSpace(
        Errors.LOGIN_FAILED,
        Errors.TRY_LATER
      ),
    });
  });
}

module.exports = {
  createInsModerator,
  login,
  getInsModeratorByUsername,
  getInsModeratorById,
};
