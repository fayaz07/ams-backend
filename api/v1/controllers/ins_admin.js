const InsAdmin = require("../models/ins_admin");
const { getInstituteById } = require("./institute");
const Errors = require("../utils/constants").errors;
const Success = require("../utils/constants").successMessages;
const {
  hashThePassword,
  comparePasswords,
  createNewRefreshTokenIfAboutToExpire,
} = require("./auth");
const AccountConstants = require("../utils/constants").account;
const Helpers = require("../../../core/helpers");
const JWTHandler = require("../../../core/jwt");
const Headers = require("../utils/constants").headers;

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

async function login(req, res) {
  // check if user exists
  var authUser = await getInsAdminByUsername(req.body.username);

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
  createInsAdmin,
  login,
};
