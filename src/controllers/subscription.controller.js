import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "channelId is not valid")
    }

    //checking channel exist or not
    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    const userId = req.user._id;
    // 
    if (channelId === userId.toString()) {
        throw new ApiError(400, "You can subscribe your own channel")
    }

    const existingSubscription = await Subscription.findOne({ channel: channelId, subscriber: userId });

    if (existingSubscription) {
        await existingSubscription.deleteOne();
        return res.status(200).json(
            new ApiResponse(200, {}, "Unsubscribed from the channel successfully")
        )
    }

    const subscription = await Subscription.create({
        channel: channelId,
        subscriber: userId
    })
    await subscription.populate("channel", "username fullName avatar ");

    return res.status(200).json(
        new ApiResponse(200, subscription, "Subscribed to the channel successfully")
    )
})


// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Channel Id is not valid")
    }

    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, "channel not found")
    }

    const allSubscribers = await Subscription.find({ channel: channelId }).populate("subscriber", "username fullName avatar")

    return res.status(200).json(
        new ApiResponse(
            200,
            allSubscribers,
            'all Subscriber list fetched successfully'
        )
    )
})


// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError(400, "subscriberId is not valid")
    }

    const subscriber = await User.findById(subscriberId)
    if (!subscriber) {
        throw new ApiError(404, "subscriber not found")
    }

    const channelsSubscribedByUser = (await Subscription.find({ subscriber: subscriberId })
        .populate("channel", "username avatar"))
        .sort({
            createdAt: -1
        })

    return res.status(200).json(
        new ApiResponse(
            200,
            channelsSubscribedByUser,
            "all channels subscribed by a user fetched successfully"
        )
    )
})

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels }

