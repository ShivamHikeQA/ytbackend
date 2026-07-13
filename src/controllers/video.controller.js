import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";


const uploadVideo = asyncHandler( async (req, res) => {

    const { title, description } = req.body;

    if ([title, description].some((field) => !field?.trim() === "")) {
        throw new ApiError(400, "Title and description are required");
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path;

    if(!videoLocalPath){
        throw new ApiError(400, "Video file is required");
    }

    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail file is required");
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!(videoFile && thumbnail)){
        throw new ApiError(500, "Failed to upload video or thumbnail on cloudinary");
    }

    const video = await Video.create({
        title: title.trim(),
        description: description.trim() ,
        duration: videoFile.duration,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user._id,
    })

    const uploadedVideo = await Video.findById(video._id).populate("owner", "-password -refreshToken");

    if(!uploadedVideo){
        throw new ApiError(500, "Failed to upload video")
    }

    return res.status(201).json(
        new ApiResponse(201, uploadedVideo, "Video uploaded successfully")
    )
})

export { uploadVideo };