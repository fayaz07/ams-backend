const router = require("express").Router();
const { internalServerError } = require("../utils/response");
const AuthMiddlewares = require("../middlewares/auth");
const InsTeacherControllers = require("../controllers/ins_teacher");

router.post(
  "/register",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsAdminAccess,
  async (req, res) => {
    try {
      await InsTeacherControllers.createInsTeacher(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

router.get(
  "/all",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsTeacherAccess,
  async (req, res) => {
    try {
      await InsTeacherControllers.getTeachersOfInstitute(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

module.exports = router;
