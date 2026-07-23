import mongoose, { Schema } from "mongoose";

const usagelogSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    action: {
    type: String,
    enum: [
        "WATCH_VIDEO",
        "DOWNLOAD_VIDEO",
        "AI_SUMMARY",
        "SEARCH"
    ]
},
    quantity: {
        type: Number,
    },
    reportedToStripe: {
        type: Boolean,
        default: false
    },
    stripeUsageRecordId: {
        type: String
    }
}, {
    timestamps: true
});

export const UsageLog = mongoose.model("UsageLog", usagelogSchema);