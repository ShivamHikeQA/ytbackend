import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model";
import { Tweet } from "../models/tweet.model";

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "content is required")
    }

    const tweet = await Tweet.create({
        content: content,
        owner: req.user._id
    })

    await tweet.populate("owner", "username fullName avatar")

    return res.status(201).json(
        new ApiResponse(
            201,
            tweet,
            "tweet created successfully"
        )
    )
})

const getUserTweet = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "tweet Id is inValid")
    }

    // Check if the user exists in the database or not
    const userExists = await User.findById(userId);
    if (!userExists) {
        throw new ApiError(404, "User not found");
    }

    const tweets = (await Tweet.find({ owner: userId }).populate("owner", "username fullName avatar")).toSorted({ createdAt: -1 })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                tweets,
                totalTweets = tweets.length
            },
            "User tweet fetched successfully"
        )
    )

})

const updateTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    const { tweetId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "tweetId is invalid")
    }

    if(!content?.trim()) {
        throw new ApiError(400, "content is required")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if(tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "you are not authorized to update the tweet")
    }

    tweet.content = content.trim()
    
    await tweet.save({
        validateBeforeSave: false,
    })

    await tweet.populate("owner", "username fullName avatar")

    return res.status(200).json(
        new ApiResponse(
            200,
            tweet,
            "Tweet is updated successfully"
        )
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "tweetId is not valid")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet) {
        throw new ApiError(404, "Tweet does not exists")
    }

    if(tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "you are not authorized to delete the tweet")
    }

    await tweet.deleteOne();

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "tweet deleted successfully"
        )
    )
})

export { createTweet, getUserTweet, updateTweet, deleteTweet }