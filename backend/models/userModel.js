import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // --- CORRECTED DEFAULT VALUE ---
    // Using a short, valid 1x1 transparent pixel Base64 string as a placeholder
    image: { type: String, default: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' },
    // --- END CORRECTION ---
    phone: { type: String, default: '000000000' },
    address: { type: Object, default: { line1: '', line2: '' } },
    gender: { type: String, default: 'Not Selected' },
    dob: { type: String, default: 'Not Selected' },
    password: { type: String, required: true },
    hasCompletedTour: { type: Boolean, default: false } // Keep the tour field
}, { timestamps: true });

const userModel = mongoose.models.user || mongoose.model("User", userSchema);
export default userModel;