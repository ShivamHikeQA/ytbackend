import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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
const existedUser = User.findOne({
    $or: [{ username }, {email}]
})

if( existedUser ){
    throw new ApiError(409, "User with email or username is already exist")
}

// ===> Step-4
const avatarLocalPath = req.files?.avatar[0]?.path;
const coverImageLocalPath = req.files?.coverImage[0]?.path;

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
    username: username.toLowercase()
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

export { registerUser };