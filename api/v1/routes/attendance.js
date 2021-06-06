const router = require("express").Router();
const { internalServerError } = require("../utils/response");
const AuthMiddlewares = require("../middlewares/auth");
const AttendanceControllers = require("../controllers/attendance");

router.post(
  "/slot/add",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsModeratorAccess,
  async (req, res) => {
    try {
      await AttendanceControllers.createAttendanceSlot(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

router.get(
  "/",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsTeacherAccess,
  async (req, res) => {
    try {
      await AttendanceControllers.getAttendance(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

module.exports = router;