const Auth = require("../models/auth");
const bcrypt = require("bcryptjs");
const JWTHandler = require("../../../core/jwt");
const TokenControllers = require("./token");
const Headers = require("../utils/constants").headers;
const Errors = require("../utils/constants").errors;
const Success = require("../utils/constants").successMessages;
const UserControllers = require("../controllers/user");
const Helpers = require("../../../core/helpers");
const AccountConstants = require("../utils/constants").account;
const PasswordGenerator = require("generate-password");
const StringUtils = require("../utils/string");
const emailSuffix = "@a-m-s.com";

/* User registration with email   
    - check if email is existing/email being used by another provider
    - if existing then send conflict response
    - if not existing, create a hashed password using [bcrypt]
    - save the user in the database
    - send an account verification email to the respective email
    - [ERROR] if failed to save user in db, send an error response
*/
module.exports.registerWithEmail = async (req, res, registerRole) => {
  var usersRole;
  // TODO: Add your custom roles here
  switch (registerRole) {
    case AccountConstants.accRoles.normalUser:
      usersRole = AccountConstants.accRoles.normalUser;
      break;
    default:
      usersRole = AccountConstants.accRoles.normalUser;
  }

  // check if user exists
  var authUser = await getAuthUserByEmail(req.body.email);

  if (authUser)
    return res
      .status(409)
      .json({ status: Errors.FAILED, message: Errors.EMAIL_IN_USE });

  const hashedPassword = await hashThePassword(req.body.password);

  // create user form data
  const newAuthUser = new Auth({
    email: req.body.email,
    password: hashedPassword,
    role: usersRole,
    provider: Headers.EMAIL_KEY,
  });

  // creating user in database
  await newAuthUser.save(async (error, savedUser) => {
    if (savedUser) {
      savedUser.firstName = req.body.name.toString().split(" ")[0];
      savedUser.lastName = req.body.name.toString().split(" ").slice(1);
      await TokenControllers.sendVerificationMail(
        savedUser._id,
        savedUser.email,
        savedUser.firstName + " " + savedUser.lastName
      );
      await _createUserDocument(savedUser);
      return res.status(201).json({
        status: Success.SUCCESS,
        message: Success.VERIFY_MAIL_SENT,
      });
    }
    // Print the error and sent back failed response
    // console.log(error);
    return res.status(403).json({
      status: Errors.FAILED,
      message: Errors.REGISTER_FAILED,
    });
  });
};

module.exports.registerAsAdmin = async (req, res) => {
  // check if user exists
  var authUser = await getAuthUserByEmail(req.body.email);

  if (authUser)
    return res
      .status(409)
      .json({ status: Errors.FAILED, message: Errors.EMAIL_IN_USE });

  const hashedPassword = await hashThePassword(req.body.password);

  // create user form data
  const newAuthUser = new Auth({
    email: req.body.email,
    password: hashedPassword,
    role: AccountConstants.accRoles.admin,
    provider: Headers.EMAIL_KEY,
  });

  // creating user in database
  await newAuthUser.save(async (error, savedUser) => {
    if (savedUser) {
      savedUser.firstName = req.body.name.toString().split(" ")[0];
      savedUser.lastName = req.body.name.toString().split(" ")[1];
      await TokenControllers.sendVerificationMail(
        savedUser._id,
        savedUser.email,
        savedUser.firstName + " " + savedUser.lastName
      );
      await _createUserDocument(savedUser);
      return res.status(201).json({
        status: Success.SUCCESS,
        message: Success.VERIFY_MAIL_SENT,
      });
    }
    // Print the error and sent back failed response
    console.log(error);
    return res.status(403).json({
      status: Errors.FAILED,
      message: Errors.REGISTER_FAILED,
    });
  });
};

module.exports.registerInstituteUser = async (data) => {
  const username = StringUtils.createUsername(data.name);
  // console.log(username);

  const availableUsername = await findAvailableUsername(username);

  // console.log(availableUsername);

  data.email = availableUsername + emailSuffix;

  // check if user exists
  var authUser = await getAuthUserByEmail(data.email);

  // console.log(data);
  // console.log(authUser);

  // never comes to this stage
  if (authUser) return { success: false, message: Errors.EMAIL_IN_USE };

  var newPassword = PasswordGenerator.generate({
    length: 9,
    numbers: true,
    uppercase: true,
    lowercase: true,
    symbols: true,
    strict: true,
    exclude: "%&()/\\[]{}-+=~?|@#<>,.:;\"'*!`",
  });

  const hashedPassword = await hashThePassword(newPassword);

  // create user form data
  const newAuthUser = new Auth({
    email: data.email,
    password: hashedPassword,
    role: data.role,
    provider: Headers.USERNAME_KEY,
    status: AccountConstants.accountStatus.active,
  });

  // creating user in database
  try {
    const savedUser = await newAuthUser.save();

    if (savedUser) {
      console.log("looks like saved");
      // console.log(savedUser);
      const nameArr = data.name.toString().split(" ");
      const firstName = nameArr[0];
      nameArr.shift();
      const lastName = nameArr.join(" ");
      // console.log(savedUser);
      const userSaved = await UserControllers.createInstituteUser({
        email: data.email,
        firstName: firstName,
        lastName: lastName,
        username: availableUsername,
        instituteId: data.instituteId,
        createdBy: data.createdBy,
        role: data.role,
        userId: newAuthUser._id,
        subjects: data.subjects,
        regId: data.regId,
        phone: data.phone,
      });
      // console.log(userSaved);
      if (userSaved.success) {
        return {
          success: true,
          message: "Institute user created",
          data: {
            user: userSaved.data,
            password: newPassword,
          },
        };
      } else {
        return {
          success: false,
          message: "Failed to create institute user",
        };
      }
    }
    // Print the error and sent back failed response
    // console.log(error);
    return {
      success: false,
      message: Errors.REGISTER_FAILED,
    };
  } catch (err) {
    // console.log(err);
    return {
      success: false,
      message: Errors.REGISTER_FAILED,
    };
  }
};

async function findAvailableUsername(username) {
  const max_tries = 15;
  var tries = 0;

  const adm = await UserControllers.fetchUserIdByUsername(username);
  if (!adm || !adm._id) {
    return username;
  }

  while (tries < max_tries) {
    tries++;
    const adm = await UserControllers.fetchUserIdByUsername(username + tries);
    if (!adm || !adm._id) {
      return username + tries;
    }
  }
  return require("crypto").randomBytes(6).toString("hex");
}

/* User login with email   
    - fetch user data
    - [ERROR] if user not found in db, send an error response
    - compare password and hashedpassword using bcrypt
    - try login
*/
module.exports.loginWithEmail = async (req, res) => {
  // check if user exists
  var authUser = await getAuthUserByEmail(req.body.email);

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

  // normal user no need for approval of user
  if (authUser.role == AccountConstants.accRoles.normalUser) {
    // check for account active
    if (authUser.status == AccountConstants.accountStatus.active) {
      return loginUser(authUser, Headers.EMAIL_KEY, res, false);
    } else {
      // account status is different than approval
      return res.status(401).json({
        status: Errors.FAILED,
        message:
          authUser.status ==
          AccountConstants.accountStatus.emailVerificationPending
            ? Errors.ACCOUNT_NOT_VERIFIED
            : `Your account is ${authUser.status}, contact support for more information`,
      });
    }
  } else {
    // check if role is custom user (normal user)
    // check if admin has got approval
    if (authUser.status == AccountConstants.accountStatus.adminApproved) {
      return loginUser(authUser, Headers.EMAIL_KEY, res, false);
    } else {
      // account status is different than approval
      return res.status(401).json({
        status: Errors.FAILED,
        message:
          authUser.status == AccountConstants.accountStatus.pending
            ? Errors.ACC_VERIFICATION_PENDING_BY_TEAM
            : `Your account is ${authUser.status}`,
      });
    }
  }
};

/* User login with email   
    - fetch user data
    - [ERROR] if user not found in db, send an error response
    - compare password and hashedpassword using bcrypt
    - try login
*/
module.exports.loginWithUsername = async (req, res) => {
  // check if user exists
  var authUser = await getAuthUserByUsername(req.body.username);

  if (!authUser)
    return res.status(400).json({
      status: Errors.FAILED,
      message: "Username or Password is invalid",
    });

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

  // normal user no need for approval of user
  if (
    authUser.role == AccountConstants.accRoles.instituteAdmin ||
    authUser.role == AccountConstants.accRoles.instituteModerator ||
    authUser.role == AccountConstants.accRoles.teacher
  ) {
    // check for account active
    if (authUser.status == AccountConstants.accountStatus.active) {
      return loginUser(authUser, Headers.EMAIL_KEY, res);
    } else {
      // account status is different than approval
      return res.status(401).json({
        status: Errors.FAILED,
        message:
          authUser.status ==
          AccountConstants.accountStatus.emailVerificationPending
            ? Errors.ACCOUNT_NOT_VERIFIED
            : `Your account is ${authUser.status}, contact support for more information`,
      });
    }
  } else {
    return res.status(401).json({
      status: Errors.FAILED,
      message: "You are not allowed to login here",
    });
  }
};

/* 
  Admin login with email   
*/
module.exports.loginAsAdmin = async (req, res) => {
  // check if user exists
  var authUser = await getAuthUserByEmail(req.body.email);

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

  // check if role is admin
  if (
    authUser.role == AccountConstants.accRoles.admin ||
    authUser.role == AccountConstants.accRoles.superAdmin
  ) {
    // check if admin has got approval
    if (authUser.status == AccountConstants.accountStatus.adminApproved) {
      return loginUser(authUser, Headers.EMAIL_KEY, res, false);
    } else {
      // account status is different than approval
      return res.status(401).json({
        status: Errors.FAILED,
        message:
          authUser.status == AccountConstants.accountStatus.pending
            ? Errors.ACC_VERIFICATION_PENDING_BY_TEAM
            : `Your account is ${authUser.status}`,
      });
    }
  } else {
    return res.status(401).json({
      status: Errors.FAILED,
      message: Errors.LOGIN_NOT_ALLOWED,
    });
  }
};

/* Verify user's account   
    - get the token from query
    - [ERROR] if not found, send an error response
    - send the token for verification
    - if verified, then update the status in db
    - [ERROR] if not verified, send an error response
*/
module.exports.verifyAccByToken = async (req, res) => {
  const token = req.query.t;

  if (!token)
    return res
      .status(400)
      .json({ status: Errors.FAILED, message: Errors.INVALID_TOKEN });

  const verified = await TokenControllers.verifyUser(token);

  if (!verified)
    return res.status(400).json({
      status: Errors.FAILED,
      message: Errors.INVALID_EXPIRED_VERIFY_TOKEN,
    });

  const authUser = await Auth.findOne({ _id: verified._userId });

  if (authUser.role == AccountConstants.accRoles.normalUser) {
    authUser.status = AccountConstants.accountStatus.active;
  } else {
    authUser.status = AccountConstants.accountStatus.pending;
  }

  await authUser.save(async (error, savedUser) => {
    if (savedUser)
      return res.status(200).json({
        status: Success.SUCCESS,
        message: Success.ACC_VERIFIED,
      });

    // Print the error and sent back failed response
    console.log(error);
    return res.status(403).json({
      status: Errors.FAILED,
      message: Success.ACC_VERIFIED,
    });
  });
};

/* Resending account verification token
    - check if user exists  
    - [ERROR] if not found, send an error response
    - [ERROR] if already verified, send an error response
    - compare passwords
    - [ERROR] passwords do not match, send an error response
    - send new token for verification
*/
module.exports.resendAccVerificatinToken = async (req, res) => {
  const authUser = await getAuthUserByEmail(req.body.email);

  if (!authUser)
    return res
      .status(401)
      .send({ status: Errors.FAILED, message: Errors.USER_NOT_EXISTS });

  if (authUser.emailVerified)
    return res.status(400).send({
      status: Errors.FAILED,
      message: Errors.ACCOUNT_ALREADY_VERIFIED,
    });

  // validate the password
  const validPass = await comparePasswords(
    req.body.password,
    authUser.password
  );

  if (!validPass)
    return res.status(401).send({
      status: Errors.FAILED,
      message: Errors.INCORRECT_PASSWORD,
    });

  const name = await UserControllers.fetchNameOfUser(req.body.email);

  await TokenControllers.sendNewVerificationMail(
    authUser._id,
    authUser.email,
    name
  );

  res.status(200).json({
    status: Success.SUCCESS,
    message: Success.RESENT_VERIFY_EMAIL,
  });
};

/* Update account's password
    - check if user exists  
    - [ERROR] if not found, send an error response
    - compare passwords
    - [ERROR] passwords do not match, send an error response
    - [ERROR] old and new passwords are same, send an error response
    - hash new password
    - update password
*/
module.exports.updatePassword = async (req, res) => {
  var authUser = await getAuthUser(req.tokenData.authId);

  if (!authUser)
    return res
      .status(400)
      .json({ status: Errors.FAILED, message: Errors.USER_NOT_EXISTS });

  // validate the password
  const validPass = await comparePasswords(
    req.body.oldPassword,
    authUser.password
  );

  if (!validPass)
    return res.status(400).json({
      status: Errors.FAILED,
      message: Errors.INCORRECT_PASSWORD,
    });

  const samePassword = await comparePasswords(
    req.body.newPassword,
    authUser.password
  );

  if (samePassword)
    return res.status(400).json({
      status: Errors.FAILED,
      message: Errors.OLD_PASSWORD_IS_SAME,
    });

  authUser.password = await hashThePassword(req.body.newPassword);

  await authUser.save(async (error, savedUser) => {
    if (savedUser)
      return res.status(200).json({
        status: Success.SUCCESS,
        message: Success.PASSWORD_UPDATED,
      });

    // Print the error and sent back failed response
    console.log(error);
    return res.status(403).json({
      status: Errors.FAILED,
      message: Helpers.joinWithCommaSpace(
        Errors.PASSWORD_CHANGE_FAILED,
        Errors.TRY_LATER
      ),
    });
  });
};

/* Sending password reset code
    - check if user exists  
    - [ERROR] if not found, send an error response
    - send new password reset otp to email
*/
module.exports.sendPasswordResetCode = async (req, res) => {
  const authUser = await getAuthUserByEmail(req.body.email);

  if (!authUser)
    return res
      .status(400)
      .json({ status: Errors.FAILED, message: Errors.USER_NOT_EXISTS });

  const result = await TokenControllers.sendOTPForPasswordReset(
    authUser._id,
    authUser.email
  );
  if (result)
    return res.status(200).json({
      status: Success.SUCCESS,
      message: Success.OTP_SENT,
    });
  return res.status(400).json({
    status: Errors.FAILED,
    message: Errors.OTP_ALREADY_SENT,
  });
};

/* Resending password reset code
    - check if user exists  
    - [ERROR] if not found, send an error response
    - send new password reset otp to email
*/
module.exports.resendPasswordResetCode = async (req, res) => {
  const authUser = await getAuthUserByEmail(req.body.email);

  if (!authUser)
    return res
      .status(400)
      .json({ status: Errors.FAILED, message: Errors.USER_NOT_EXISTS });

  await TokenControllers.resendOTPForPasswordReset(
    authUser._id,
    authUser.email
  );

  res.status(200).json({
    status: Success.SUCCESS,
    message: Success.OTP_RESENT,
  });
};

/* Reset password 
    - verify otp
    - check if user exists  
    - [ERROR] if not found/invalid, send an error response
    - check if new and old passwords are same
    - delete the otp form database
    - hash the password
    - update the password
*/
module.exports.resetPassword = async (req, res) => {
  const verificationToken = await TokenControllers.verifyOTP(req.body.otp);
  if (!verificationToken)
    return res.status(400).json({
      status: Errors.FAILED,
      message: Errors.INVALID_EXPIRED_OTP,
    });

  const authUser = await Auth.findOne({ _id: verificationToken._userId });

  if (!authUser || authUser.email != req.body.email)
    return res.status(400).json({
      status: Errors.FAILED,
      message: Errors.USER_NOT_EXISTS,
    });

  const samePassword = await comparePasswords(
    req.body.password,
    authUser.password
  );

  if (samePassword)
    return res.status(400).json({
      status: Errors.FAILED,
      message: Errors.OLD_PASSWORD_IS_SAME,
    });

  authUser.password = await hashThePassword(req.body.password);

  await TokenControllers.deleteOldToken(verificationToken._userId);

  await authUser.save(async (error, savedUser) => {
    if (savedUser)
      return res.status(200).json({
        status: Success.SUCCESS,
        message: Success.PASSWORD_RESET,
      });

    // Print the error and sent back failed response
    console.log(error);
    return res.status(403).json({
      status: Errors.FAILED,
      message: Helpers.joinWithCommaSpace(
        Errors.PASSWORD_CHANGE_FAILED,
        Errors.TRY_LATER
      ),
    });
  });
};

/* Create new access token
    - check if user exists  
    - [ERROR] if not found/invalid, send an error response
    - check if refresh token sent by user and the one present in db are same
    - [ERROR] if not same, send an error response
    - generate new tokens, verifying  provider access
*/
module.exports.refreshTokens = async (req, res) => {
  var authUser = await Auth.findOne({
    _id: req.tokenData.userId,
  });

  if (!authUser)
    return res.status(400).json({
      status: Errors.FAILED,
      message: Errors.USER_NOT_EXISTS,
    });

  // check if refresh token is equal to what we have in the database
  if (authUser.refreshToken === req.refreshToken) {
    if (
      authUser.provider === Headers.EMAIL_KEY ||
      authUser.provider === Headers.USERNAME_KEY
    ) {
      _generateNewTokensAndSendBackToClient(authUser, res);
    } else {
      console.log(`Invalid provider type ${authUser.provider}`);
      return res.status(403).json({
        status: Errors.FAILED,
        message: Helpers.joinWithCommaSpace(
          Errors.TOKEN_REFRESH_FAILED,
          Errors.TRY_LATER
        ),
      });
    }
  } else {
    return res.status(400).json({
      status: Errors.FAILED,
      message: Errors.INVALID_MALFORMED_REFRESH_TOKEN,
    });
  }
};

// Helper method
module.exports.verifyAccessToken = (refreshToken) => {
  return JWTHandler.verifyAccessToken(refreshToken);
};

// Helper method
function verifyRefreshToken(refreshToken) {
  return JWTHandler.verifyRefreshToken(refreshToken);
}

/* Delete's user account
    - check if user exists  
    - [ERROR] if not found/invalid, send an error response
    - delete account
*/
module.exports.deleteAccount = async (req, res) => {
  const authUser = await getAuthUser(req.tokenData.authId);
  if (!authUser)
    return res.status(403).json({
      status: Errors.FAILED,
      message: Helpers.joinWithCommaSpace(
        Errors.ACC_DELETE_FAILED,
        Errors.TRY_LATER
      ),
    });
  await Auth.deleteOne({ email: authUser.email }, async (error) => {
    if (error)
      return res.status(403).json({
        status: Errors.FAILED,
        message: Helpers.joinWithCommaSpace(
          Errors.ACC_DELETE_FAILED,
          Errors.TRY_LATER
        ),
      });
    await UserControllers.deleteUser(req.tokenData.authId);
    return res.status(200).json({
      status: Success.SUCCESS,
      message: Success.ACC_DELETED,
    });
  });
};

/* Fetch all users
    - fetch users and send in resposne
*/
module.exports.getAllUsers = async (res) => {
  await Auth.find(
    { role: { $ne: AccountConstants.accRoles.admin } },
    { email: 1 },
    (error, users) => {
      if (error)
        return res
          .status(403)
          .json({ status: Errors.FAILED, message: Errors.FETCH_USERS_FAILED });
      return res.status(200).json({
        status: Success.SUCCESS,
        message: Success.FETCHED_USERS,
        data: { users: users },
      });
    }
  );
};

/* Fetch all admins
    - fetch admins and send in resposne
*/
module.exports.getAllAdmins = async (res) => {
  await Auth.find({ admin: true }, { email: 1 }, (error, admins) => {
    if (error)
      return res
        .status(403)
        .json({ status: Errors.FAILED, message: Errors.FETCH_ADMINS_FAILED });
    return res.status(200).json({
      status: Success.SUCCESS,
      message: Success.FETCHED_ADMINS,
      data: { adming: admins },
    });
  });
};

/* 
  Disable user account
*/
module.exports.disableUser = async (req, res) => {
  await _disableOrEnableUser(req, res, true);
};

/* 
  Enable user account
*/
module.exports.enableUser = async (req, res) => {
  await _disableOrEnableUser(req, res, false);
};

/*
  -------------------------------------------------------------------------------------
  Helper functions
  -------------------------------------------------------------------------------------
*/
/* Disable or enable user   
    - check if user exists
    - check already disabled/enabled
    - update status in db
*/
async function _disableOrEnableUser(req, res, disable) {
  var authUser = await getAuthUserById(req.body.userId);
  if (!authUser)
    return res.status(403).json({
      status: Errors.FAILED,
      message: Errors.USER_NOT_EXISTS,
    });

  if (disable) {
    if (authUser.status == AccountConstants.accountStatus.disabled)
      return res.status(403).json({
        status: Errors.FAILED,
        message: Helpers.joinWithSpace(
          Errors.USER_ACCESS_ALREADY,
          Errors.DISABLED
        ),
      });

    authUser.status = AccountConstants.accountStatus.disabled;
  } else {
    // enable
    if (
      authUser.status == AccountConstants.accountStatus.adminApproved ||
      authUser.status == AccountConstants.accountStatus.active
    )
      return res.status(403).json({
        status: Errors.FAILED,
        message: Helpers.joinWithSpace(
          Errors.USER_ACCESS_ALREADY,
          Success.ENABLED
        ),
      });

    if (authUser.role == AccountConstants.accRoles.normalUser) {
      authUser.status = AccountConstants.accountStatus.active;
    } else {
      authUser.status = AccountConstants.accountStatus.adminApproved;
    }
  }

  authUser.save((error, saved) => {
    if (error)
      return res.status(403).json({
        status: Errors.FAILED,
        message: disable
          ? Errors.ACCESS_DISABLE_FAILED
          : Errors.ACCESS_ENABLE_FAILED,
      });

    return res.status(200).json({
      status: Success.SUCCESS,
      message: disable ? Success.ACCESS_DISABLED : Success.ACCESS_ENABLED,
      data: { userId: saved._id },
    });
  });
}

/* 
  Fetches authUser instance from db by userId
*/
async function getAuthUserById(userId) {
  const emailExist = await Auth.findById(userId);
  return emailExist;
}

/* 
  Fetches authUser instance from db by email only specified fields
*/
async function getAuthUserWithProjection(authId, project) {
  const emailExist = await Auth.findById(authId, project);
  return emailExist;
}

/* 
  Fetches authUser instance from db by authId
*/
async function getAuthUser(authId) {
  const authUser = await getAuthUserWithProjection(authId, {
    createdAt: 0,
    updatedAt: 0,
  });
  return authUser;
}

/* 
  Fetches authUser instance from db by email
*/
async function getAuthUserByEmail(email) {
  const authUser = await Auth.findOne(
    { email: email },
    {
      createdAt: 0,
      updatedAt: 0,
    }
  );
  return authUser;
}

/* 
  Fetches authUser instance from db by email
*/
async function getAuthUserByUsername(username) {
  const authUser = await Auth.findOne(
    { email: username + emailSuffix },
    {
      createdAt: 0,
      updatedAt: 0,
    }
  );
  return authUser;
}

/* 
  Encrypt password and return the hashed password
*/
async function hashThePassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);
  return hashPassword;
}

/* 
  Compare encrypted password and plain password
*/
async function comparePasswords(password, hashedPassword) {
  const validPass = await bcrypt.compare(password, hashedPassword);
  return validPass;
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
        .header("Access-Control-Expose-Headers", "access_token, refresh_token")
        .header(Headers.ACCESS_TOKEN, accessToken)
        .header(Headers.REFRESH_TOKEN, authUser.refreshToken)
        .json({
          status: Success.SUCCESS,
          message: Success.LOGIN_SUCCESS,
        });
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

/* 
  Creates new access and refresh tokens and send back to client
*/
async function _generateNewTokensAndSendBackToClient(authUser, res) {
  const newAccessToken = await JWTHandler.genAccessToken(authUser._id);

  authUser = await createNewRefreshTokenIfAboutToExpire(authUser);

  await authUser.save(async (error, savedUser) => {
    if (savedUser) {
      return res
        .status(200)
        .header("Access-Control-Expose-Headers", "access_token, refresh_token")
        .header(Headers.ACCESS_TOKEN, newAccessToken)
        .header(Headers.REFRESH_TOKEN, authUser.refreshToken)
        .json({
          status: Success.SUCCESS,
          message: Success.TOKENS_REFRESHED,
        });
    }
    // Print the error and sent back failed response
    console.log(error);
    return res.status(403).json({
      status: Errors.FAILED,
      message: Errors.TOKEN_REFRESH_FAILED,
    });
  });
}

/*
  Verifies if the refreshToken is about to expire in less than a day
  if true : creates new refreshToken
  else : send the old token
*/
async function createNewRefreshTokenIfAboutToExpire(authUser) {
  if (authUser.refreshToken) {
    const refreshTokenVerification = verifyRefreshToken(authUser.refreshToken);
    if (refreshTokenVerification.valid) {
      const refreshTokenData = refreshTokenVerification.data;
      var timeToExpiry = refreshTokenData.exp - Date.now() / 1000;

      // looks like we have still more days for our refresh token to expire
      if (timeToExpiry > 0) {
        if (timeToExpiry / 86400 > 2) {
          return authUser;
        }
      }
    }
  }
  // token might expire soon, so creating new token
  authUser.refreshToken = await JWTHandler.genRefreshToken(authUser._id);
  return authUser;
}

/*
  Create user document(only done while registration)
*/
async function _createUserDocument(userData) {
  await UserControllers.createUser(userData);
}

module.exports.getAuthUser = getAuthUser;
module.exports.getAuthUserWithProjection = getAuthUserWithProjection;
module.exports.verifyRefreshToken = verifyRefreshToken;
module.exports.hashThePassword = hashThePassword;
module.exports.comparePasswords = comparePasswords;
module.exports.createNewRefreshTokenIfAboutToExpire = createNewRefreshTokenIfAboutToExpire;
