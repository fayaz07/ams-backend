const router = require("express").Router();
const { internalServerError } = require("../utils/response");
const AuthMiddlewares = require("../middlewares/auth");
const InstituteAdminControllers = require("../controllers/ins_admin");

router.post(
  "/register",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkAdminAccess,
  async (req, res) => {
    try {
      await InstituteAdminControllers.createInsAdmin(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

router.get(
  "/all",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsModeratorAccess,
  async (req, res) => {
    try {
      await InstituteAdminControllers.getAdminsOfInstitute(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

module.exports = router;
