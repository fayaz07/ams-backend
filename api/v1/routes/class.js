const router = require("express").Router();
const { internalServerError } = require("../utils/response");
const AuthMiddlewares = require("../middlewares/auth");
const ClassControllers = require("../controllers/class");

router.post(
  "/",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsAdminAccess,
  async (req, res) => {
    try {
      await ClassControllers.createClass(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

router.get(
  "/id/:id",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsTeacherAccess,
  async (req, res) => {
    try {
      await ClassControllers.fetchClassById(req, res);
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
      await ClassControllers.getAllClassesOfInstitute(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

router.post(
  "/class-teacher",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsModeratorAccess,
  async (req, res) => {
    try {
      await ClassControllers.assignClassTeacher(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

router.post(
  "/subject-teacher",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsModeratorAccess,
  async (req, res) => {
    try {
      await ClassControllers.assignSubjectTeacher(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

router.get(
  "/students/:id",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsTeacherAccess,
  async (req, res) => {
    try {
      await ClassControllers.getStudentsOfClass(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

module.exports = router;
