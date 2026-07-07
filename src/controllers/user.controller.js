import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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
    if(!username || !email){
        throw new ApiError(400, "username or email is required")
    }

    // step-3
    const user = await User.findOne({
        $or: [{username, email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    // step-4

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    // step-5

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password refreshToken")

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

const logoutUser = asyncHandler ( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
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

export { 
    registerUser,
    loginUser,
    logoutUser
 };