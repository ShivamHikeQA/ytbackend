import mongoose, {Schema} from "mongoose";

const paymentMethodSchema = new Schema({
owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
},
stripePaymentMethodId: {
    type: String,
    required: true,
    unique: true,
    index: true
},
brand: {
    type: String,
},
last4: {
    type: String,
},
expiryMonth: {
    type: Number,
},
expiryYear: {
    type: Number
},
isDefault: {
    type: Boolean,
    default: false
}
}, {timestamps: true})

export const PaymentMethod = new mongoose.model("PaymentMethod", paymentMethodSchema)