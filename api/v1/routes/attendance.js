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

router.post(
  "/subject/single",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsTeacherAccess,
  async (req, res) => {
    try {
      await AttendanceControllers.postAttendanceForSingleSubject(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

router.get(
  "/slots",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsTeacherAccess,
  async (req, res) => {
    try {
      await AttendanceControllers.getAttendanceSlotsForClass(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

router.get(
  "/student/report/month",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsTeacherAccess,
  async (req, res) => {
    try {
      await AttendanceControllers.getStudentAttendanceReportByMonth(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

module.exports = router;
