import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.auth.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import crypto from "crypto";
import { Resend } from 'resend';
import { sendVerificationEmail } from "../services/email.services.js";
import { verifyGoogleToken } from "../services/google.services.js";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return {
            refreshToken,
            accessToken,
        }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const { fullname, email, username, password } = req.body

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.secure_url,
        email,
        password,
        username: username.toLowerCase()
    })

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = new Date(
        Date.now() + 30 * 60 * 1000
    );
    await user.save({
        validateBeforeSave: false
    });
    await sendVerificationEmail(
        user.email,
        verificationToken
    );

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }



    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
    const user = await User.findOne({

        emailVerificationToken: hashedToken,

        emailVerificationExpiry: {
            $gt: new Date()
        }

    });
    if (!user) throw new ApiError(400, "User can't be verified")
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save({
        validateBeforeSave: false
    });
    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "Email verified successfully"
        )
    )
})

const loginUser = asyncHandler(async (req, res) => {
    //req body -> data
    //enter username and password
    //check that an user with the provided deets is present in the database or not
    //if present -> user verified and login
    //generate access and refresh token
    // send these tokens as cookies 
    //if not present -> error-> provide valid credentials
    const { email, username, password } = req.body
    if (!username && !email) throw new ApiError(400, "username or email is required")
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) throw new ApiError(404, "User not found")
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) throw new ApiError(401, "Password is incorrect")
    if (!user.isEmailVerified) {
        throw new ApiError(
            401,
            "Please verify your email first."
        );
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure: true,
    }
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(
            200, {
            user: loggedInUser, accessToken, refreshToken
        },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, {
        $set: {
            refreshToken: undefined
        }
    }, {
        new: true
    }
    )
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken ?? req.body?.refreshToken
    if (!incomingRefreshToken) throw new ApiError(401, "unauthorized request")
    try {
        const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken._id);
        if (!user) throw new ApiError(401, "Invalid refresh token")
        if (incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Refresh token is expired or used")
        const options = {
            httpOnly: true,
            secure: true,
        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(
            new ApiResponse(
                200,
                { accessToken, refreshToken: newRefreshToken },
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confNewPassword } = req.body
    if (!(newPassword === confNewPassword)) throw new ApiError(400, "New passwords doesn't match")
    const user = await User.findOne(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) throw new ApiError(400, "Invalid old password")
    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed succesfully")
    )

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            req.user,
            "Current user fetched successfully")
    )
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const { username, email, fullname } = req.body
    if (!username && !email && !fullname) throw new ApiError(400, "All the fields are empty")
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email,
                username
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res.status(200).json(
        new ApiResponse(200, user, "Account details updated successfully")
    )
})

const updateUserAvatarImage = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(
            400,
            "Please provide avatar image"
        );
    }
    let avatar;
    if (avatarLocalPath) {
        avatar = await uploadOnCloudinary(avatarLocalPath);
    }
    if (avatarLocalPath && !avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }
    const updateData = {};
    if (avatar) {
        updateData.avatar = avatar.url;
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id, {
        $set: updateData
    }, {
        new: true
    }
    ).select("-password")
    return res.status(200).json(
        new ApiResponse(200, user, "File updated successfully")
    )
})

const deleteAccount = asyncHandler(async (req, res) => {

    const { password } = req.body;

    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid password");
    }

    await User.findByIdAndDelete(user._id);

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "Account deleted successfully"
            )
        );

});

const googleLogin = asyncHandler(async (req, res) => {

    const { idToken } = req.body;

    if (!idToken) {
        throw new ApiError(400, "Google ID Token is required");
    }

    const googleUser = await verifyGoogleToken(idToken);

    let user = await User.findOne({
        email: googleUser.email
    });

    if (!user) {

        user = await User.create({

            fullname: googleUser.fullname,

            email: googleUser.email,

            avatar: googleUser.avatar,

            googleId: googleUser.googleId,

            provider: "google",

            isEmailVerified: true,

        });

    }

    else {

        if (!user.googleId) {

            user.googleId = googleUser.googleId;

            user.provider = "google";

            user.isEmailVerified = true;

            await user.save({ validateBeforeSave: false });

        }

    }

    const { accessToken, refreshToken } =
        await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "Google login successful"
            )
        );

});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeUserPassword,
    updateUserDetails,
    updateUserAvatarImage,
    getCurrentUser,
    verifyEmail,
    deleteAccount,
    googleLogin
}