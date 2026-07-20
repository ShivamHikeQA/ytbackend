import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Playlist } from "../models/playlist.model";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name?.trim() || !description?.trim()) {
        throw new ApiError(400, "Name and description are required");
    }

    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        videos: [],
        owner: req.user._id,
    })
    await playlist.populate("owner", "-password -refreshToken");

    return res.status(201).json(
        new ApiResponse(201, playlist, "Playlist created successfully")
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Validate the userId parameter
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    // Check if the user exists in the database or not
    const userExists = await User.findById(userId);
    if (!userExists) {
        throw new ApiError(404, "User not found");
    }

    const playlists = await Playlist.find({ owner: userId }).populate("owner", "username fullName avatar");

    /*if(!playlists){
        throw new  ApiError(404, "No playlists found for this user");
    } */

    return res.status(200).json(
        new ApiResponse(200, playlists, "User playlists fetched successfully")
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findById(playlistId)
    .populate("owner", "username fullName avatar")
    .populate("videos", "title description duration views thumbnail owner");

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist fetched successfully")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID");
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to add videos to this playlist");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if the video is already in the playlist
    if (playlist.videos.some( id => id.toString() === videoId.toString())) {
        throw new ApiError(400, "Video already exists in the playlist");
    }

    playlist.videos.push(videoId)
    await playlist.save({
        validateBeforeSave: false,
    });

    return res.status(200).json(
        new ApiResponse(200, playlist, "Video added to playlist successfully")
    );

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to remove videos from this playlist");
    }

    if (!playlist.videos.some(id => id.toString() === videoId.toString()))   {
        throw new ApiError(404, "Video not found in the playlist");
    }

    playlist.videos = playlist.videos.filter(id => id.toString() !== videoId.toString());
    await playlist.save({
        validateBeforeSave: false,
    })

    return res.status(200).json(
        new ApiResponse(200, playlist, "Video removed from playlist successfully")
    );

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this playlist");
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Playlist deleted successfully")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    // not necessary to check if name and description are empty, because we can update either name or description or both. 
    if (!name?.trim() && !description?.trim()) {
        throw new ApiError(400, "At least one field is required");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this playlist");
    }

    if (name?.trim()) {
        playlist.name = name.trim();
    }
   
    if (description?.trim()) {
        playlist.description = description.trim();
    }

    await playlist.save({
        validateBeforeSave: false,
    })

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist updated successfully")
    )
})

export { createPlaylist, getUserPlaylists, getPlaylistById, addVideoToPlaylist, removeVideoFromPlaylist, deletePlaylist, updatePlaylist  }