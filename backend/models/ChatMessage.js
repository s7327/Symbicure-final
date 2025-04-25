import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
    // Link to the specific appointment this message belongs to
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment', // Links to the 'Appointment' model
        required: true,
        index: true // Index for faster querying by appointmentId
    },
    // The user (patient or doctor) who sent the message
    sender: { // Field name used in backend save logic
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assumes both patients and doctors are in 'User' collection, or adjust ref based on your models
        required: true
    },
    // The actual text content of the message
    message: {
        type: String,
        required: true,
        trim: true // Automatically remove leading/trailing whitespace
    },
    // Timestamp when the message was created/saved
    timestamp: {
        type: Date,
        default: Date.now // Automatically set to current time on creation
    },
});

// Optional: Add index on timestamp if you frequently sort/query by it alongside appointmentId
// chatMessageSchema.index({ appointmentId: 1, timestamp: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;