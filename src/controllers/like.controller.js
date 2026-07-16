import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Comment } from "../models/comment.model";
import { Video } from "../models/video.model";
import mongoose from "mongoose";
import { useImperativeHandle } from "react";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "videoId is not valid")
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "video is not available")
    }

    const userId = req.user._id;

    const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

    if (existingLike) {
        await existingLike.deleteOne();
        return res.status(200).json(
            new ApiResponse(200, {}, "Video unliked successfully")
        )
    }

    const like = await Like.create({
        video: videoId,
        likedBy: userId
    })

    await like.populate("likedBy", "username fullName avatar");

    return res.status(200).json(
        new ApiResponse(200, like, "Video liked successfully")
    )

})


const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "commentId is not valid")
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "comment is not available")
    }

    const userId = req.user._id;

    const existingLike = await Like.findOne({ comment: commentId, likedBy: userId });

    if (existingLike) {
        await existingLike.deleteOne();
        return res.status(200).json(
            new ApiResponse(200, {}, "Comment unliked successfully")
        )
    }

    const like = await Like.create({
        comment: commentId,
        likedBy: userId
    })

    await like.populate("likedBy", "username fullName avatar");

    return res.status(200).json(
        new ApiResponse(200, like, "Comment liked successfully")
    )

})


const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "tweetId is not valid")
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "tweet is not available")
    }

    const userId = req.user._id;

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId });

    if (existingLike) {
        await existingLike.deleteOne();
        return res.status(200).json(
            new ApiResponse(200, {}, "Tweet unliked successfully")
        )
    }

    const like = await Like.create({
        tweet: tweetId,
        likedBy: userId
    })

    await like.populate("likedBy", "username fullName avatar");

    return res.status(200).json(
        new ApiResponse(200, like, "Tweet liked successfully")
    )
})


const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const likedVideos = await Like.find({
        likedBy: userId, video: { $ne: null } //only fetch likes that are associated with videos
    })
        .sort({ createdAt: -1 })
        .populate({
            path: "video",
            select: "title description duration views thumbnail ",
            populate: {
                path: "owner",
                select: "username fullName avatar"
            }
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            likedVideos,
            "Liked videos fetched successfully"
        )
    )
})



export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos }