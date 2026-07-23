import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model";
import { createCustomerOnStripe, createSetupIntentOnStripe } from "../utils/stripe";

const createStripeCustomer = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if(!user) {
        throw new ApiError(404, "user not found");
    }

    if(user.stripeCustomerId) {
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    stripeCustomerId: user.stripeCustomerId
                },
                "Stripe customer already exists"
            )
        );
    }

    const stripeCustomer = await createCustomerOnStripe({
        name: user.fullName,
        email: user.email
    });

    user.stripeCustomerId = stripeCustomer.id;

    await user.save({
        validateBeforesave: false
    });

    return res.status(201).json(
        new ApiResponse(
            201,
            user,
            "stripeCustomer created successfully"
        )
    )
});


// this controller Generate a Setup Intent and then Return client_secret to frontend
const createSetupIntent = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if(!user){
        throw new ApiError(404, "User not found")
    }

    if(!user.stripeCustomerId) {
        throw new ApiError(404, "Stripe customer doesn't exist")
    }

    const setupIntent = await createSetupIntentOnStripe(user.stripeCustomerId);

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                clientSecret: setupIntent.client_secret
            },
            "Setup intent created"
        )
    )
})


export { createStripeCustomer }