import express from "express";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Server is running successfully"
    });
});

export default app;