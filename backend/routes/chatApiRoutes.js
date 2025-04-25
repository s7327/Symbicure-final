import express from 'express';
import authUser from '../middleware/authUser.js'; // Your JWT verification middleware
import ChatMessage from '../models/ChatMessage.js';
import Appointment from '../models/appointmentModel.js';
import mongoose from 'mongoose'; // Import mongoose to check for valid ObjectId

const chatApiRouter = express.Router();

// GET /api/chats/:appointmentId - Fetches message history for a specific appointment
chatApiRouter.get('/:appointmentId', authUser, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.userId; // Get userId attached by authUser middleware

        // Validate appointmentId format before querying
        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
             console.log(`API Chat Fetch Denied: Invalid appointmentId format - ${appointmentId}`);
             return res.status(400).json([]); // Bad request, return empty array
         }

        // --- Authorization Check ---
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            console.log(`API Chat Fetch Denied: Appointment ${appointmentId} not found.`);
            // Technically forbidden/not found, return empty array for security/simplicity
            return res.status(404).json([]);
        }

        if (appointment.userId.toString() !== userId && appointment.docId.toString() !== userId) {
            console.log(`API Chat Fetch Denied: User ${userId} not authorized for appointment ${appointmentId}`);
            // Forbidden access
            return res.status(403).json([]); // Return empty array
        }
        // --- End Authorization Check ---

        // Fetch messages if authorized
        const messages = await ChatMessage.find({ appointmentId })
                                        .sort({ timestamp: 1 }); // Sort by time ascending

        // Return the array of messages directly
        res.status(200).json(messages);

    } catch (error) {
        console.error("API Error fetching chat messages:", error);
        // Don't expose internal errors, return empty array or generic error
        res.status(500).json([]);
    }
});

export default chatApiRouter;