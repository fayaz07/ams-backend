const router = require("express").Router();
const { internalServerError } = require("../utils/response");
const AuthMiddlewares = require("../middlewares/auth");
const SubjectControllers = require("../controllers/subject");

router.post(
  "/",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsAdminAccess,
  async (req, res) => {
    try {
      await SubjectControllers.createSubject(req, res);
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
      await SubjectControllers.getAllSubjectsOfInstitute(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

module.exports = router;
