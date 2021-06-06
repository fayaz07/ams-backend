const User = require("../models/user");
const Errors = require("../utils/constants").errors;
const Success = require("../utils/constants").successMessages;
const crypto = require("crypto");
const mongoose = require("mongoose");

async function createUser(userData) {
  var user = new User({
    userId: userData._id,
    email: userData.email,
    username: userData.firstName + "_" + crypto.randomBytes(3).toString("hex"),
    firstName: userData.firstName,
    lastName: userData.lastName,
    photoUrl: userData.photoUrl,
    role: userData.role,
    instituteId: userData._id,
    createdBy: userData._id,
  });
  try {
    const saved = await user.save();
    return { success: true, data: saved };
  } catch (err) {
    return { success: false, error: err };
  }
}

async function createInstituteUser(userData) {
  var user = new User(userData);
  try {
    const saved = await user.save();
    return { success: true, data: saved };
  } catch (err) {
    return { success: false, error: err };
  }
}

async function getUser(req, res) {
  await User.findOne(
    { userId: req.tokenData.authId },
    {
      _id: 0,
      createdAt: 0,
      updatedAt: 0,
      __v: 0,
    },
    (error, user) => {
      if (error || !user) {
        return res.status(403).json({
          status: Errors.FAILED,
          message: Errors.USER_NOT_EXISTS,
        });
      }
      return res.status(200).json({
        status: Success.SUCCESS,
        message: Success.FETCHED_USER_DATA,
        user: user,
      });
    }
  );
}

async function updateUser(req, res) {
  var user = await User.findOne(
    { userId: req.tokenData.authId },
    {
      createdAt: 0,
      updatedAt: 0,
      __v: 0,
    }
  );
  user = _updateUserModel(user, req.body);
  await user.save((error, updated) => {
    if (error || !updated)
      return res.status(403).json({
        status: Errors.FAILED,
        message: Errors.USER_DATA_UPDATE_FAILED,
      });
    return res.status(200).json({
      status: Success.SUCCESS,
      message: Success.UPDATED_USER_DATA,
      user: updated,
    });
  });
}

async function checkUsernameAvailability(req, res) {
  const user = await User.findOne(
    { username: req.params.username },
    { _id: 1 }
  );
  if (user) {
    return res.status(409).json({
      status: Errors.FAILED,
      message: Errors.USERNAME_IN_USE,
    });
  } else {
    return res.status(200).json({
      status: Success.SUCCESS,
      message: Success.USERNAME_AVAILABLE,
    });
  }
}

async function deleteUser(authId) {
  await User.deleteOne({ userId: authId });
}

function _updateUserModel(userData, updated) {
  for (const [key, value] of Object.entries(updated)) {
    if (value && _isAllowed(key)) {
      userData[key] = updated[key];
    }
  }

  return userData;
}

const _immutableFields = [
  "email",
  "userId",
  "_id",
  "__v",
  "createdAt",
  "updatedAt",
];

function _isAllowed(key) {
  return !_immutableFields.includes(key);
}

async function fetchNameOfUser(email) {
  var name = " ";
  await User.findOne({ email: email }, { firstName: 1, lastName: 1 })
    .then((document) => {
      if (!document) {
        name = " ";
      }
      name = document.firstName + " " + document.lastName;
    })
    .catch((err) => {
      console.log(err);
      name = " ";
    });
  return name;
}

async function fetchUserIdByUsername(username) {
  return User.findOne({ username: username }, { _id: 1, userId: 1 });
}

async function fetchInstituteIdByUserId(userId) {
  return User.findOne(
    { userId: mongoose.Types.ObjectId(userId) },
    { _id: 1, instituteId: 1, userId: 1 }
  );
}

async function fetchUsersByInstitute(instituteId) {
  return User.find(
    {
      instituteId: mongoose.Types.ObjectId(instituteId.toString()),
    },
    { _id: 0 }
  );
}

async function fetchUsersByInstituteAndRole(instituteId, role) {
  return User.find(
    {
      instituteId: mongoose.Types.ObjectId(instituteId.toString()),
      role: role,
    },
    { _id: 0 }
  );
}

module.exports = {
  fetchUsersByInstituteAndRole,
  fetchUsersByInstitute,
  fetchInstituteIdByUserId,
  fetchUserIdByUsername,
  fetchNameOfUser,
  deleteUser,
  checkUsernameAvailability,
  createUser,
  getUser,
  updateUser,
  createInstituteUser,
};
