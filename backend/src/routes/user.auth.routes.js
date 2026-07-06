import { Router } from "express";
import { changeUserPassword, deleteAccount, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateUserAvatarImage, updateUserDetails, verifyEmail , googleLogin} from "../controllers/auth.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(
    loginUser
)

router.route("/logout").post(
    verifyJWT,
    logoutUser
)

router.route("/refreshToken").post(
    refreshAccessToken
)

router.route("/changePassword").patch(
    verifyJWT,
    changeUserPassword
)

router.route("/userDetails").get(
    verifyJWT,
    getCurrentUser
)

router.route("/updateUserDetails").patch(
    verifyJWT,
    updateUserDetails
)

router.route("/updateImageFiles").patch(
    verifyJWT,
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }
    ]),
    updateUserAvatarImage
)

router.route("/verify-email/:token").get(
    verifyEmail
)

router.route("/deleteAccount").delete(
    verifyJWT,
    deleteAccount
)

router.route("/google-login").post(
    googleLogin
);
export default router