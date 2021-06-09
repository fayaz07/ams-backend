const router = require("express").Router();
const { internalServerError } = require("../utils/response");
const AuthMiddlewares = require("../middlewares/auth");
const StudentControllers = require("../controllers/student");

router.post(
  "/",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsModeratorAccess,
  async (req, res) => {
    try {
      await StudentControllers.createStudent(req, res);
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
      await StudentControllers.getAllSubjectsOfInstitute(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

module.exports = router;
