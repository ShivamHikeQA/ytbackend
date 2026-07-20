import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import mongoose from "mongoose";
import { User } from "../models/user.model";
import { Subscription } from "../models/subscription.model";
import { Video } from "../models/video.model";
import { Like } from "../models/like.model";

// TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
const getChannelStats = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if(!mongoose.Types.ObjectId.isValid( channelId )){
        throw new ApiError(400, "channel Id is not valid")
    }

    const channel = await User.findById(channelId)
    if(!channel) {
        throw new ApiError(404, "Channel does not exist")
    }

    const totalSubscriber = await Subscription.countDocuments({
        channel: channelId
    })

    const totalVideos = await Video.countDocuments({ owner: channelId })

    const totalViews = await Video.aggregate([
        {
            $match: {
                owner: channel._id
            }
        },
        {
            $group: {
                _id: null,
                views: {
                    $sum: "$views"
                }
            }
        }
    ])

    const totalLikes = await Video.aggregate([
        {
            $match: {
                owner: channel._id
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $group: {
                _id: null,
                likes: {
                    $sum: {
                        $size: "$likes"
                    }
                }
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalSubscriber,
                totalVideos,
                totalViews: totalViews[0]?.views || 0,
                totalLikes: totalLikes[0]?.likes || 0
            },
            "all the channel details fetched successfully"
        )
    )
})


//Get all the videos uploaded by a channel
const getChannelVideos = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "channelId is not valid")
    }

    const channel = await User.findById(channelId)
    if(!channel) {
        throw new ApiError(404, "channel not found")
    }

    const allChannelVideos = await Video.find({
                owner: channelId
            }).populate("owner", "username fullName avatar")

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                allChannelVideos,
                total: allChannelVideos.length
            },
            "all videos of a channel fetched successfully"
        )
    )
})

export { getChannelStats, getChannelVideos}