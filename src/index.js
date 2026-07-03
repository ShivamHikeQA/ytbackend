// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";

import connectDB from "./db/index.js";

dotenv.config({ path: "./env" });

connectDB()


/*
first method to connect to mongodb
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import expess from "express";

const app = express();

( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)
        app.on("error", (error)=> {
            console.log("Error", error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("Error", error);
        throw error;
    }

})()
    */