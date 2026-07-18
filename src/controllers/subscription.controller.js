import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "channelId is not valid")
    }

    const userId = req.user._id;

    const existingSubscription = await Subscription.findOne({ channel: channelId, subscriber: userId });

    if(existingSubscription) {
        await existingSubscription.deleteOne();
        return res.status(200).json(
            new ApiResponse(200, {}, "Unsubscribed from the channel successfully")
        )
    }

    const subscription = await Subscription.create({
        channel: channelId,
        subscriber: userId
    })
    await subscription.populate("channel", "username fullName avatar");

    return res.status(200).json(
        new ApiResponse(200, subscription, "Subscribed to the channel successfully")
    )
})

export {  toggleSubscription }

