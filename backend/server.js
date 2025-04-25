// backend/server.js

import express from "express";
import cors from "cors"; // Make sure cors is imported
import "dotenv/config";
import jwt from 'jsonwebtoken';
import http from "http";
import { Server } from "socket.io";

// DB and Cloudinary Config
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";


import './models/userModel.js';     // <-- ADD THIS LINE
import './models/doctorModel.js';   // <-- ADD THIS LINE
import './models/appointmentModel.js'; // <-- Keep or add this line
import './models/ChatMessage.js'; // <-- Keep or add this line

// Models
import ChatMessage from "./models/ChatMessage.js";
import Appointment from './models/appointmentModel.js';

// Routes
import userRouter from "./routes/userRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import adminRouter from "./routes/adminRoute.js";
import fetchDoctorRouter from "./routes/fetchDoctors.js";
import analyzeRoute from "./routes/analyseRoute.js";
import chatApiRouter from './routes/chatApiRoutes.js';

// App config
const app = express();
const port = process.env.PORT || 4000;

// --- Define Allowed Origins ---
// List all frontend URLs that should be allowed to access the backend
const allowedOrigins = [
    process.env.USER_FRONTEND_URL || "http://localhost:5173", // User frontend
    process.env.ADMIN_FRONTEND_URL || "http://localhost:5174", // Admin/Doctor frontend
    // Add your production frontend URLs here when deploying
    // e.g., "https://your-user-app.com", "https://your-admin-app.com"
];

// --- Middlewares ---
app.use(express.json());

// --- Configure CORS for Express API routes ---
// This uses a function to check the origin against the allowed list
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin OR if origin is in the whitelist
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true); // Origin is allowed
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error('This origin is not allowed by CORS')); // Origin is blocked
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Include OPTIONS for preflight
    credentials: true // Allow headers like Authorization
}));

// Create HTTP server integrating Express app
const server = http.createServer(app);

// --- Socket.IO Setup ---
// Configure Socket.IO CORS to use the same list of allowed origins
const io = new Server(server, {
    cors: {
        origin: allowedOrigins, // <-- Use the array here
        methods: ["GET", "POST"],
    }
});

// --- Socket.IO Authentication Middleware (Keep as is) ---
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        // console.log(`Socket Auth Error [${socket.id}]: Token missing`); // Reduce verbosity
        return next(new Error("Authentication error: Token missing"));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = { userId: decoded.id };
        // console.log(`Socket Auth Success [${socket.id}]: User ${socket.user.userId}`); // Reduce verbosity
        next();
    } catch (err) {
        console.error(`Socket Auth Error [${socket.id}]: Invalid token - ${err.message}`);
        return next(new Error("Authentication error: Invalid token"));
    }
});

// --- Socket.IO Event Handling (Keep as is) ---
io.on("connection", (socket) => {
    console.log(`Socket Connected [${socket.id}]: User ${socket.user?.userId || 'Unknown'}`); // Handle case where user might not be defined yet if auth fails fast

    socket.on("joinRoom", async ({ appointmentId }) => {
         if (!socket.user) return console.log(`Join Room Denied [${socket.id}]: Socket not authenticated.`); // Check if authenticated
         const userId = socket.user.userId;
         /* ... rest of joinRoom logic ... */
         console.log(`Socket [${socket.id}]: User ${userId} attempting to join room ${appointmentId}`);
        try {
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                console.log(`Join Room Denied [${socket.id}]: Appointment ${appointmentId} not found.`);
                socket.emit('joinError', { message: 'Appointment not found' });
                return;
            }
            if (appointment.userId.toString() !== userId && appointment.docId.toString() !== userId) {
                console.log(`Join Room Denied [${socket.id}]: User ${userId} not authorized for appointment ${appointmentId}.`);
                socket.emit('joinError', { message: 'Not authorized for this chat room' });
                return;
            }
            socket.join(appointmentId);
            console.log(`Socket [${socket.id}]: User ${userId} successfully joined room: ${appointmentId}`);
        } catch (error) {
            console.error(`Error joining room ${appointmentId} for user ${userId} [${socket.id}]:`, error);
            socket.emit('joinError', { message: 'Server error while joining room' });
        }
     });

    socket.on("sendMessage", async ({ appointmentId, message }) => {
         if (!socket.user) return console.log(`Send Message Denied [${socket.id}]: Socket not authenticated.`); // Check if authenticated
         const senderId = socket.user.userId;
         /* ... rest of sendMessage logic ... */
         console.log(`Socket [${socket.id}]: Received message from ${senderId} for room ${appointmentId}`);
        if (!appointmentId || !message || !senderId) {
            console.error(`sendMessage Error [${socket.id}]: Missing data - ApptID: ${appointmentId}, Msg: ${!!message}, SenderID: ${senderId}`);
            socket.emit('sendError', { message: 'Missing required message data' });
            return;
        }
        if (!socket.rooms.has(appointmentId)) {
             console.error(`sendMessage Error [${socket.id}]: User ${senderId} not in room ${appointmentId}.`);
             socket.emit('sendError', { message: 'You are not currently in this chat room. Please rejoin.' });
             return;
        }
        try {
            const newMessage = new ChatMessage({
                appointmentId: appointmentId,
                sender: senderId,
                message: message.trim(),
            });
            const savedMessage = await newMessage.save();
            io.to(appointmentId).emit("receiveMessage", savedMessage.toObject());
            // console.log(`Message from ${senderId} broadcasted to room ${appointmentId}`); // Reduce verbosity
        } catch (error) {
            console.error(`Error saving/sending message from ${senderId} [${socket.id}]:`, error);
            socket.emit('sendError', { message: 'Failed to send message due to server error' });
        }
     });

    socket.on("disconnect", (reason) => {
        console.log(`Socket Disconnected [${socket.id}]: User ${socket.user?.userId || 'Unknown'}, Reason: ${reason}`);
    });
});


// --- Connect to DB & Cloudinary ---
connectDB();
connectCloudinary();

// --- API Endpoints ---
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/search-doctors", fetchDoctorRouter);
app.use("/api/analyze", analyzeRoute); // Prefix with /api if needed
app.use('/api/chats', chatApiRouter);

// --- Test Route ---
app.get("/", (req, res) => {
    res.send("API Working");
});

// --- Start Server ---
server.listen(port, () => console.log(`Server (API + Socket.IO) running on http://localhost:${port}`));