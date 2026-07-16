import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Comment } from "../models/comment.model";
import { Video } from "../models/video.model";
import mongoose from "mongoose";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (Number.isNaN(pageNumber) || Number.isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
        throw new ApiError(400, "Invalid page or limit");
    }

    if(limitNumber > 100) {
        throw new ApiError(400, "Limit can not exceed 100");
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video is not available")
    }

    const skip = (pageNumber - 1)*limitNumber
    const totalComments = await Comment.countDocuments({video: videoId})
    const totalPages = Math.ceil(totalComments/limitNumber)

    const comments = await Comment.find({video: videoId})
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limitNumber)
    .populate("owner", "username fullName")

    return res.status(200).json(
        new ApiResponse(200, { comments, totalPages, totalComments }, "Video comment fetched successfully")
    )
})


const addComment = asyncHandler(async (req, res) => {
    const { videoId, content } = req.body;

    if(!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    if(!content?.trim()) {
        throw new ApiError(400, "Comment content is required");
    }

    const video = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404, "Video is not available");  
    }

    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    })

    await comment.populate("owner", "username fullName")

    return res.status(201).json(
        new ApiResponse(201, comment, "Comment added successfully")         
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId, content } = req.body;
})


export { getVideoComments, addComment, updateComment }