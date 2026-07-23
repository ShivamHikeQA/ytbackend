import mongoose, { Schema } from "mongoose";

const invoiceSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stripeInvoiceId: {
      type: String,
      required: true,
    },
    amountPaid: {
      type: Number,
    },
    currency: {
      type: String,
    },
    status: {
      type: Boolean,
    },
    invoiceDate: {
      type: Date,
    },
    subscription: {
      type: Schema.Types.ObjectId,
      ref: "BillingSubscription",
    },
  },
  {
    timestamps: true,
  },
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);
