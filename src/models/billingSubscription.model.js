import mongoose, { Schema } from "mongoose";

const BillingSubscriptionSchema = new Schema({
    stripeSubscriptionId: {
        type: String,
        required: true,
        unique: true
    },
    stripePriceId: {
        //stripePriceId stores id of user's premium type => monthely , yearly, family or student etc...
        type: String
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    plan: {
        type: String,
        enum: ["FREE", "PREMIUM", "FAMILY", "STUDENT"],
        default: "FREE"
    },
    status: {
        type: String,
        enum: ["active", "trialing", "past_due", "cancelled", "expired"],
        default: "active"
    },
    currentPeriodStart: {
        type: Date,
    },
    currentPeriodEnd: {
        type: Date,
    },
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

export const BillingSubscription = mongoose.model("BillingSubscription", BillingSubscriptionSchema)
