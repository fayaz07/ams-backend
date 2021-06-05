const router = require("express").Router();
const { internalServerError } = require("../utils/response");
const AuthMiddlewares = require("../middlewares/auth");
const InsModeratorControllers = require("../controllers/ins_moderator");

router.post(
  "/register",
  AuthMiddlewares.checkAccessToken,
  AuthMiddlewares.validateAccessToken,
  AuthMiddlewares.checkInsAdminAccess,
  async (req, res) => {
    try {
      await InsModeratorControllers.createInsModerator(req, res);
    } catch (error) {
      internalServerError(res, error);
    }
  }
);

router.post("/login", async (req, res) => {
  try {
    await InsModeratorControllers.login(req, res);
  } catch (error) {
    internalServerError(res, error);
  }
});

module.exports = router;
