import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
    userId: { // The patient/user who booked
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Link to your User model
        required: true
    },
    docId: { // The doctor for the appointment
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor', // Link to your Doctor model (or User if doctors are also users)
        required: true
    },
    slotDate: { type: String, required: true }, // e.g., "25_11_2024"
    slotTime: { type: String, required: true }, // e.g., "10:00 AM"
    userData: { type: Object, required: true }, // Consider defining a sub-schema if structure is fixed
    docData: { type: Object, required: true }, // Consider defining a sub-schema
    amount: { type: Number, required: true },
    date: { type: Number, required: true }, // Consider changing to Date type for easier queries: default: Date.now
    cancelled: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false }
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

// Ensure consistent model name, e.g., "Appointment"
const appointmentModel = mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);
export default appointmentModel;