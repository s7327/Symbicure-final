import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { v2 as cloudinary } from 'cloudinary';
import nodemailer from "nodemailer";
// Nodemailer transporter setup - Ensure MAIL_ID and MAIL_PASS are in your .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_ID,
        pass: process.env.MAIL_PASS,
    },
    // Add connection timeout (optional but recommended)
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000, // 10 seconds
    socketTimeout: 10000 // 10 seconds
});

// Helper function to create JWT token
const createToken = (id) => {
    // Ensure JWT_SECRET is defined in your .env file
    if (!process.env.JWT_SECRET) {
        console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
        process.exit(1); // Exit if secret is missing
    }
    // Consider adding an expiration time to the token
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' }); // Example: Expires in 1 day
};


// API to register user
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Input validation
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please fill in all fields' });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email address" });
        }
        if (password.length < 8) { // Basic password length check
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User with this email already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create and save new user
        const newUser = new userModel({
            name,
            email,
            password: hashedPassword
        });
        const user = await newUser.save();

        // Create token (no need to send token on register usually, prompt login)
        // const token = createToken(user._id);

        // Indicate success, prompt user to log in
        res.status(201).json({ success: true, message: "Registration successful. Please log in." });

    } catch (error) {
        console.error("Register User Error:", error);
        res.status(500).json({ success: false, message: "Error registering user. Please try again later." });
    }
};

// API to login user
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        // Find user by email
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Compare provided password with hashed password in DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        // If password matches, create token
        const token = createToken(user._id);

        // --- Return token AND userId ---
        res.status(200).json({
            success: true,
            message: "Login successful",
            token: token,
            userId: user._id // <-- ADDED userId HERE
        });

    } catch (error) {
        console.error("Login User Error:", error);
        res.status(500).json({ success: false, message: "Error logging in. Please try again later." });
    }
};


// API to get user profile data (Uses userId from auth middleware)
const getProfile = async (req, res) => {
    try {
        // userId should be attached by the authUser middleware
        const userId = req.userId; // <-- Get from req.userId set by middleware
        if (!userId) {
             // This shouldn't happen if middleware is working, but good failsafe
            return res.status(401).json({ success: false, message: "Not Authorized" });
        }

        const userData = await userModel.findById(userId).select('-password'); // Exclude password
        if (!userData) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }
        res.status(200).json({ success: true, userData });

    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ success: false, message: "Error fetching profile data." });
    }
};

// API to update user profile (Uses userId from auth middleware)
const updateProfile = async (req, res) => {
    try {
        const userId = req.userId; // <-- Get from req.userId set by middleware
        const { name, phone, address, dob, gender } = req.body;
        const imageFile = req.file; // Image from multer

        if (!userId) {
            return res.status(401).json({ success: false, message: "Not Authorized" });
        }

        // Basic validation
        if (!name || !phone || !dob || !gender || !address) {
            return res.status(400).json({ success: false, message: "Please provide all required fields (name, phone, address, dob, gender)" });
        }

        let parsedAddress;
        try {
             // Address is expected as a JSON string from frontend if using FormData
             parsedAddress = JSON.parse(address);
        } catch(e) {
             return res.status(400).json({ success: false, message: "Invalid address format. Please send as a JSON string." });
        }


        const updateData = {
            name,
            phone,
            address: parsedAddress,
            dob,
            gender
        };

        // Handle image upload if present
        if (imageFile) {
             console.log("Uploading image to Cloudinary...");
             try {
                // Ensure Cloudinary config is correct
                const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
                    folder: "user_profiles", // Optional: organize uploads
                    resource_type: "image"
                });
                updateData.image = imageUpload.secure_url; // Get secure URL
                 console.log("Image uploaded:", updateData.image);
            } catch (uploadError) {
                 console.error("Cloudinary Upload Error:", uploadError);
                 // Decide if profile update should fail if image upload fails
                 return res.status(500).json({ success: false, message: "Failed to upload profile image." });
             }
        }

        // Find and update the user profile
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { $set: updateData }, // Use $set to update only provided fields
            { new: true, runValidators: true } // Return updated doc, run schema validators
        ).select('-password'); // Exclude password from result

        if (!updatedUser) {
             return res.status(404).json({ success: false, message: "User not found for update." });
        }

        res.status(200).json({ success: true, message: 'Profile Updated Successfully', userData: updatedUser });

    } catch (error) {
        console.error("Update Profile Error:", error);
         // Handle potential validation errors from Mongoose
         if (error.name === 'ValidationError') {
             return res.status(400).json({ success: false, message: `Validation Error: ${error.message}` });
         }
        res.status(500).json({ success: false, message: "Error updating profile." });
    }
};


// API to book appointment (Uses userId from auth middleware)
const bookAppointment = async (req, res) => {
    try {
        const userId = req.userId; // <-- Get from req.userId set by middleware
        const { docId, slotDate, slotTime } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Not Authorized" });
        }
        if (!docId || !slotDate || !slotTime) {
             return res.status(400).json({ success: false, message: "Missing doctor ID, date, or time slot." });
         }

        // Validate docId potentially (is it a valid ObjectId?)

        const docData = await doctorModel.findById(docId).select("-password"); // Exclude password
        if (!docData) {
             return res.status(404).json({ success: false, message: "Doctor not found." });
         }
        if (!docData.available) {
            return res.status(400).json({ success: false, message: 'Selected doctor is currently not available' });
        }

        // --- Slot Booking Logic ---
        // Ensure slots_booked is initialized if it doesn't exist
        let slots_booked = docData.slots_booked || {};
        console.log("Received slotDate:", slotDate);
        // Check if the specific date exists and the time slot is already booked
        if (slots_booked[slotDate] && slots_booked[slotDate].includes(slotTime)) {
            return res.status(409).json({ success: false, message: 'This time slot is already booked. Please select another.' }); // 409 Conflict
        }

        // Update the slots_booked object
        if (slots_booked[slotDate]) {
            slots_booked[slotDate].push(slotTime);
        } else {
            slots_booked[slotDate] = [slotTime];
        }
        // Mark the modified path for Mongoose Mixed type if necessary (often needed for nested objects)
        await doctorModel.findByIdAndUpdate(docId, { $set: { slots_booked: slots_booked } }, { new: true });
        // --- End Slot Booking Logic ---

        const userData = await userModel.findById(userId).select("-password"); // Get user details
        if (!userData) {
            // This implies an issue if the userId from token is valid but user doesn't exist
             console.error(`Booking Error: User ${userId} not found despite valid token.`);
            return res.status(404).json({ success: false, message: "User data not found." });
        }

        // Prepare appointment data
        const appointmentData = {
            userId,
            docId,
            // Store relevant snapshot of user/doc data at time of booking
            // Avoid storing full objects if they contain sensitive info like password hashes (even if selected out)
            userData: { name: userData.name, email: userData.email, phone: userData.phone }, // Store only needed fields
            docData: { name: docData.name, speciality: docData.speciality, address: docData.address, fees: docData.fees }, // Store only needed fields
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now() // Keep original numeric date if needed, or use default Date
        };

        // Save the new appointment
        const newAppointment = new appointmentModel(appointmentData);
        await newAppointment.save();

        // --- Send Confirmation Emails ---
        try {
            // Send email to user
            await transporter.sendMail({
                from: `"Symbicure Team" <${process.env.MAIL_ID}>`,
                to: userData.email,
                subject: "Appointment Confirmation",
                html: `
                    <h2>Hi ${userData.name},</h2>
                    <p>Your appointment with <strong> ${docData.name}</strong> (${docData.speciality}) has been successfully booked.</p>
                    <p><strong>Date:</strong> ${slotDate.replace(/_/g, '/')} <br/><strong>Time:</strong> ${slotTime}<br/><strong>Fees:</strong> ₹${docData.fees}</p>
                    <p>Thank you for choosing Symbicure!</p>
                `
            });

            // Send email to doctor
            await transporter.sendMail({
                from: `"Symbicure Team" <${process.env.MAIL_ID}>`,
                to: docData.email, // Ensure doctor model has email field
                subject: "New Appointment Booked",
                html: `
                    <h2>Hi ${docData.name},</h2>
                    <p>A new appointment has been booked by <strong>${userData.name}</strong> (Contact: ${userData.email} / ${userData.phone || 'N/A'}).</p>
                    <p><strong>Date:</strong> ${slotDate.replace(/_/g, '/')}<br/><strong>Time:</strong> ${slotTime}</p>
                    <p>Please review your schedule.</p>
                `
            });
            console.log(`Booking confirmation emails sent for appointment ${newAppointment._id}`);
        } catch (mailError) {
            // Log email error but don't fail the whole booking if emails fail
            console.error(`Error sending confirmation emails for appointment ${newAppointment._id}:`, mailError);
            // Optionally: Implement a retry mechanism or notification system for failed emails
        }
        // --- End Send Emails ---

        res.status(201).json({ success: true, message: 'Appointment booked successfully.', appointmentId: newAppointment._id });

    } catch (error) {
        console.error("Book Appointment Error:", error);
        res.status(500).json({ success: false, message: "Error booking appointment." });
    }
};


// API to cancel appointment (Uses userId from auth middleware)
const cancelAppointment = async (req, res) => {
    try {
        const userId = req.userId; // <-- Get from req.userId set by middleware
        const { appointmentId } = req.body; // Get appointmentId from request body

        if (!userId) {
            return res.status(401).json({ success: false, message: "Not Authorized" });
        }
        if (!appointmentId) {
             return res.status(400).json({ success: false, message: "Appointment ID is required." });
         }

        const appointmentData = await appointmentModel.findById(appointmentId);
        if (!appointmentData) {
             return res.status(404).json({ success: false, message: "Appointment not found." });
         }

        // Authorization check: Only the user who booked can cancel
        if (appointmentData.userId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden: You can only cancel your own appointments.' });
        }

        // Check if already cancelled or completed? (Optional)
        if (appointmentData.cancelled) {
             return res.status(400).json({ success: false, message: "Appointment is already cancelled." });
         }
         if (appointmentData.isCompleted) {
              return res.status(400).json({ success: false, message: "Cannot cancel a completed appointment." });
          }

        // Mark appointment as cancelled
        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

        // --- Free up the doctor's slot ---
        const { docId, slotDate, slotTime } = appointmentData;
        try {
            const doctorData = await doctorModel.findById(docId);
            if (doctorData && doctorData.slots_booked && doctorData.slots_booked[slotDate]) {
                // Create a new object without the cancelled slot
                const updatedSlots = { ...doctorData.slots_booked };
                updatedSlots[slotDate] = updatedSlots[slotDate].filter(time => time !== slotTime);
                // If the date array becomes empty, remove the date key (optional cleanup)
                if (updatedSlots[slotDate].length === 0) {
                    delete updatedSlots[slotDate];
                }
                await doctorModel.findByIdAndUpdate(docId, { $set: { slots_booked: updatedSlots } });
                console.log(`Slot ${slotTime} on ${slotDate} freed for doctor ${docId}`);
            } else {
                console.warn(`Could not find slot ${slotTime} on ${slotDate} for doctor ${docId} to free up.`);
            }
        } catch(slotError) {
            // Log error but don't fail cancellation if freeing slot fails
            console.error(`Error freeing slot for doctor ${docId} during cancellation:`, slotError);
        }
        // --- End Free Slot ---

        // Optionally: Send cancellation notification emails

        res.status(200).json({ success: true, message: 'Appointment successfully cancelled' });

    } catch (error) {
        console.error("Cancel Appointment Error:", error);
        res.status(500).json({ success: false, message: "Error cancelling appointment." });
    }
};


// API to get user's appointments (Uses userId from auth middleware)
const listAppointment = async (req, res) => {
    try {
        const userId = req.userId; // <-- Get from req.userId set by middleware
        if (!userId) {
            return res.status(401).json({ success: false, message: "Not Authorized" });
        }

        // Find appointments where the userId matches
        const appointments = await appointmentModel.find({ userId })
                                               .sort({ date: -1 }); // Sort by most recent first

        res.status(200).json({ success: true, appointments });

    } catch (error) {
        console.error("List Appointments Error:", error);
        res.status(500).json({ success: false, message: "Error fetching appointments." });
    }
};


// Export all controller functions
export {
    loginUser,
    registerUser,
    getProfile,
    updateProfile,
    bookAppointment,
    listAppointment,
    cancelAppointment
};