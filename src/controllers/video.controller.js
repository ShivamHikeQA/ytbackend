import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";

const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoLocalPath = req.files?.videoFile?.[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is required");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!(videoFile && thumbnail)) {
    throw new ApiError(
      500,
      "Failed to upload video or thumbnail on cloudinary",
    );
  }

  const video = await Video.create({
    title: title.trim(),
    description: description.trim(),
    duration: videoFile.duration,
    videoFile: {
      url: videoFile.secure_url,
      public_id: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnail.secure_url,
      public_id: thumbnail.public_id,
    },
    owner: req.user._id,
  });

  const uploadedVideo = await Video.findById(video._id).populate(
    "owner",
    "-password -refreshToken",
  );

  if (!uploadedVideo) {
    throw new ApiError(500, "Failed to upload video");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, uploadedVideo, "Video uploaded successfully"));
});


const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // video Id validation via mongoose
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "fullName, username, avatar",
  );

  if (!video) {
    throw new ApiError(404, "video is not available");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});


const getAllVideo = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  if (
    Number.isNaN(pageNumber) ||
    Number.isNaN(limitNumber) ||
    pageNumber < 1 ||
    limitNumber < 1
  ) {
    throw new ApiError(400, "Invalid page or limit");
  }

  if (limitNumber > 100) {
    throw new ApiError(400, "Limit can not exceed 100");
  }

  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user Id");
    }
  }

  // filter logic
  const filter = {};
  if (userId) {
    filter.owner = userId;
  }

  if (query?.trim()) {
    filter.title = {
      $regex: query.trim(),
      $options: "i",
    };
  }

  // sort logic
  const sort = {};
  // user can send request with these sortBy values only otherwise invalid
  const allowedSortByFields = ["views", "createdAt", "title", "duration"];

  if (sortBy && !allowedSortByFields.includes(sortBy)) {
    throw new ApiError(400, "Invalid sort field");
  }

  if (sortType && !["asc", "desc"].includes(sortType)) {
    throw new ApiError(400, "Invalid sort Type");
  }

  if (sortBy) {
    sort[sortBy] = sortType === "asc" ? 1 : -1;
  } else {
    sort.createdAt = -1; // newest video first
  }

  // skip data logic
  const skip = (pageNumber - 1) * limitNumber;

  const videos = await Video.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limitNumber)
    .populate("owner", "username fullName avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "videos fetched successfully"));
});


const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // objectId(videoId) validation
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video is not available");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "you are not authorized to update this video");
  }

  const { title, description } = req.body;

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  // User should be able to update only the fields they want not all fields required
  if (!title && !description && !videoFileLocalPath && !thumbnailLocalPath) {
    throw new ApiError(400, "Atleast one field is required");
  }

  let updatedVideoFile;
  if (videoFileLocalPath) {
    updatedVideoFile = await uploadOnCloudinary(videoFileLocalPath);
  }

  let updatedThumbnail;
  if (thumbnailLocalPath) {
    updatedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  }

  if (
    (videoFileLocalPath && !updatedVideoFile) ||
    (thumbnailLocalPath && !updatedThumbnail)
  ) {
    throw new ApiError(
      500,
      "updated videoFile or thumbnail is not uploded on Cloudinary",
    );
  }

  const updatedData = {}; // create a new empty object

  // add all the updated fields in this object
  if (title?.trim()) {
    updatedData.title = title.trim();
  }

  if (description?.trim()) {
    updatedData.description = description.trim();
  }

  if (updatedVideoFile) {
    updatedData.videoFile = {
      url: updatedVideoFile.secure_url,
      public_id: updatedVideoFile.public_id,
    };
  }

  if (updatedThumbnail) {
    updatedData.thumbnail = {
      url: updatedThumbnail.secure_url,
      public_id: updatedThumbnail.public_id,
    };
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: updatedData, // here added new object directly that stored all the updated value
    },
    {
      new: true,
    },
  ).populate("owner", "username fullName avatar");

  if (!updatedVideo) {
    throw new ApiError(500, "Failed to update video");
  }

  if (updatedVideoFile) {
    try {
      await deleteFromCloudinary(video.videoFile.public_id, "video");
    } catch (error) {
      console.error(error);
    }
  }

  if (updatedThumbnail) {
    try {
      await deleteFromCloudinary(video.thumbnail.public_id, "image");
    } catch (error) {
      console.error(error);
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});


const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "you are not authorized to delete Video");
  }

  try {
    await deleteFromCloudinary(video.videoFile.public_id, "video");
  } catch (error) {
    throw new ApiError(500, "video deletion is failed from cloudinary");
  }

  try {
    await deleteFromCloudinary(video.thumbnail.public_id, "image");
  } catch (error) {
    throw new ApiError(500, "thumbnail deletion is failed from cloudinary");
  }

  try {
    await Video.findByIdAndDelete(videoId);
  } catch (error) {
    throw new ApiError(500, "video document deletion failed from the DB");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfull"));
});


const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "video Id is Invalid");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video is not available");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to change the status");
  }

  video.isPublished = !video.isPublished;

  await video.save({
    validateBeforeSave: false,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Status toggled successfully"));
});

export { uploadVideo, getAllVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus };
