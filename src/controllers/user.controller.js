import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";

// defined a method to get access and refresh token
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Somthing went wrong while generating refresh and access token")
    }
}
// register user controller logic
const registerUser = asyncHandler( async (req, res) =>{
    // these are the steps we will follow to register a user ==>>
 // Step 1: get user data from frontend
 // Step 2: validate user data - not empty
 // Step 3: check if user already exists via email or username
 // Step 4: check for images and avatar
 // Step 5: upload images to cloudinary
 // Step 6: create user-object and save to database
 // Step 7: remove password and refreshToken from response
 // Step 8: check for user creation success
 // Step 9: return response to frontend

 // ===> Step-1
 const {fullName, email, username, password } = req.body;
 console.log("fullName: ", fullName);
  
//    if( fullName === ""){
//     throw new ApiError("FullName is required", 400);
//    }

// ===> Step-2
if([fullName, email, username, password].some((field) => field?.trim() === "")){
    throw new ApiError(400, "All fields are required");
}

// ===> Step-3
const existedUser = await User.findOne({
    $or: [{ username }, {email}]
})

if( existedUser ){
    throw new ApiError(409, "User with email or username is already exist")
}

// ===> Step-4
const avatarLocalPath = req.files?.avatar[0]?.path;
// const coverImageLocalPath = req.files?.coverImage[0]?.path;

let coverImageLocalPath;
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
}

if( !avatarLocalPath ){
    throw new ApiError(400, "Avatar file is required")
}

// ===> Step-5
const avatar = await uploadOnCloudinary(avatarLocalPath);
const coverImage = await uploadOnCloudinary(coverImageLocalPath);

if(!avatar){
    throw new ApiError(400, "Avatar file is required")
}

// Step-6 
const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
})

// Step-7
const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)

// Step-8
if(!createdUser) {
    throw new ApiError(500, "Somthing went wrong, while registering the user ")
}

// Step-9
return res.status(201).json(
    new ApiResponse(200, createdUser, "registered successfully")
)

})

// <== Controllers ==>>

// login user controller logic
const loginUser = asyncHandler( async (req, res) => {
    // these are the steps we will follow to login a user 
    // step-1 take the data from req.body
    // step-2 check the username or email for login the user via username or email
    // step-3 find the user
    // step-4 if user exist check the password
    // step-5 and generate the access token and refresh token
    // step-6 send the tokens via cookie

    //step-1
    const {email, username, password} = req.body

    // step-2
    if(!(username || email)){
        throw new ApiError(400, "username or email is required")
    }

    // step-3
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    // step-4

    console.log("Password entered:", password)
    console.log("Password on DB:", user.password)

    console.log( await bcrypt.compare(password, user.password))

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    // step-5

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // step-6
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken,
                refreshToken
            },
            "User logged In Successfully"
        )
    )
})

// logout user controller logic
const logoutUser = asyncHandler ( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

// refresh access token controller logic
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if(!user) {
        throw new ApiError(401, "Invalid refresh token")
    }

    if(incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token has expired or has already been used")
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
        new ApiResponse(
            200,
            {accessToken, refreshToken: newRefreshToken},
            "Access token refreshed"
        )
    )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

// change current password controller logic
const changeCurrentPassword = asyncHandler( async (req, res) => {
    const { oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json( new ApiResponse(200, {}, "Password changed successfully"))
})

// get current user controller logic
const getCurrentUser = asyncHandler( async (req, res) => {
    return res.status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})

// get update account details controller logic
const updateAccountDetails = asyncHandler( async (req, res) => {
    const {fullName, email} = req.body

    if(!(fullName || email)){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account detailse updated Successfully"))
})

// update user avatar controller logic
const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            avatar: avatar.url
        },
        { new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar updated successfully"))
})

// update user coverImage controller logic
const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.Path

    if(!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading the coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"))
})
// get user channel profile detail controller logic
const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if(!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length) {
        throw new ApiError(400, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

// get user watch history controller logic
const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        }, {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    if(!user.length){
        throw new ApiError(404, "User not found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
 };