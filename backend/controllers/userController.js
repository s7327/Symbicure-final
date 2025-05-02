import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { v2 as cloudinary } from 'cloudinary';
import nodemailer from "nodemailer";

// Nodemailer transporter setup - Ensure MAIL_ID/MAIL_PASS are in .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_ID,     // Your Gmail address
        pass: process.env.MAIL_PASS,     // Your Gmail password or App Password
    },
    connectionTimeout: 10000, // Optional timeouts
    greetingTimeout: 10000,
    socketTimeout: 10000
});

// Helper function to create JWT token
const createToken = (id) => {
    if (!process.env.JWT_SECRET) {
        console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
        process.exit(1); // Exit if secret is missing
    }
    // Consider adding an expiration time, e.g., { expiresIn: '1d' } for 1 day
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};


// API to register user
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    console.log("Register attempt for email:", email); // Log attempt

    try {
        // Input validation
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please fill in all fields' });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email address" });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            console.log("Registration failed: User already exists -", email);
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
            // hasCompletedTour defaults to false via schema
        });
        const user = await newUser.save();
        console.log("Registration successful for user:", user._id, email);

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
    console.log("Login attempt for email:", email);

    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        // Find user by email
        const user = await userModel.findOne({ email });
        if (!user) {
            console.log("Login failed: User not found -", email);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Compare provided password with hashed password in DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("Login failed: Invalid credentials for -", email);
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        // If password matches, create token
        const token = createToken(user._id);
        console.log("Login successful for user:", user._id, email);

        // Return token, userId, AND hasCompletedTour status
        res.status(200).json({
            success: true,
            message: "Login successful",
            token: token,
            userId: user._id,
            hasCompletedTour: user.hasCompletedTour
        });

    } catch (error) {
        console.error("Login User Error:", error);
        res.status(500).json({ success: false, message: "Error logging in. Please try again later." });
    }
};


// API to get user profile data (Uses userId from auth middleware)
const getProfile = async (req, res) => {
    const userId = req.userId; // Comes from authUser middleware
    console.log("Get Profile request for userId:", userId);

    try {
        if (!userId) {
            console.error("Get Profile Error: userId missing from request after auth middleware.");
            return res.status(401).json({ success: false, message: "Not Authorized (Missing User ID)" });
        }

        // Fetch user data, excluding password. Includes hasCompletedTour by default.
        const userData = await userModel.findById(userId).select('-password');
        if (!userData) {
            console.warn("Get Profile Warning: User profile not found for ID:", userId);
            return res.status(404).json({ success: false, message: "User profile not found" });
        }
        console.log("Get Profile Success for userId:", userId);
        res.status(200).json({
            success: true,
            userData: userData // Send the full userData object
         });

    } catch (error) {
        console.error("Get Profile Error for userId:", userId, error);
        res.status(500).json({ success: false, message: "Error fetching profile data." });
    }
};

// API to update user profile (Uses userId from auth middleware)
const updateProfile = async (req, res) => {
    const userId = req.userId;
    console.log("Update Profile request for userId:", userId);
    try {
        const { name, phone, address, dob, gender } = req.body;
        const imageFile = req.file; // From multer

        if (!userId) {
             return res.status(401).json({ success: false, message: "Not Authorized" });
        }

        if (!name || !phone || !dob || !gender || !address) {
            console.warn("Update Profile Failed: Missing required fields for userId:", userId, req.body);
            return res.status(400).json({ success: false, message: "Please provide all required fields (name, phone, address, dob, gender)" });
        }

        let parsedAddress;
        try {
             parsedAddress = JSON.parse(address);
             if (typeof parsedAddress !== 'object' || parsedAddress === null) throw new Error("Invalid address format");
        } catch(e) {
             console.warn("Update Profile Failed: Invalid address format for userId:", userId, address);
             return res.status(400).json({ success: false, message: "Invalid address format. Please send as a JSON string with line1/line2." });
        }

        const updateData = { name, phone, address: parsedAddress, dob, gender };

        if (imageFile) {
             console.log("Update Profile: Uploading image to Cloudinary for userId:", userId);
             try {
                const imageUpload = await cloudinary.uploader.upload(imageFile.path, { folder: "user_profiles", resource_type: "image" });
                updateData.image = imageUpload.secure_url;
                 console.log("Update Profile: Image uploaded:", updateData.image);
            } catch (uploadError) { /* ... error handling ... */ }
        }

        const updatedUser = await userModel.findByIdAndUpdate( userId, { $set: updateData }, { new: true, runValidators: true }).select('-password');

        if (!updatedUser) { /* ... handle not found ... */ }

        console.log("Update Profile Success for userId:", userId);
        res.status(200).json({ success: true, message: 'Profile Updated Successfully', userData: updatedUser });

    } catch (error) { /* ... error handling ... */ }
};


// API to book appointment (Uses userId from auth middleware)
const bookAppointment = async (req, res) => {
    console.log("--- bookAppointment Start ---");
    const userId = req.userId; // Get userId from authenticated request
    const { docId, slotDate, slotTime } = req.body;
    console.log("Booking Request Data:", { userId, docId, slotDate, slotTime });

    try {
        // --- Validation ---
        if (!userId) { console.error("Booking Error: Missing userId (Auth issue?)"); return res.status(401).json({ success: false, message: "Not Authorized" }); }
        if (!docId || !slotDate || !slotTime) { console.error("Booking Error: Missing required fields", { docId, slotDate, slotTime }); return res.status(400).json({ success: false, message: "Missing doctor ID, date, or time slot." }); }

        // --- Fetch Doctor and User Data Concurrently ---
        console.log(`Fetching doctor (${docId}) and user (${userId}) data...`);
        const [docData, userData] = await Promise.all([
            doctorModel.findById(docId).select("-password"),
            userModel.findById(userId).select("-password")
        ]);

        // --- Validate Doctor ---
        if (!docData) { console.error("Booking Error: Doctor not found for ID:", docId); return res.status(404).json({ success: false, message: "Doctor not found." }); }
        console.log("Doctor found:", docData.name);
        if (!docData.available) { console.warn("Booking Warning: Doctor not available", docData.name); return res.status(400).json({ success: false, message: 'Selected doctor is currently not available' }); }
        if (!docData.email) { console.warn(`Booking Warning: Doctor ${docData.name} (ID: ${docId}) is missing an email address. Notification will be skipped.`); }

        // --- Validate User ---
        if (!userData) { console.error(`Booking Error: User ${userId} not found in database!`); return res.status(404).json({ success: false, message: "User data not found." }); }
        console.log("User found:", userData.name);

        // --- Slot Booking Logic ---
        let slots_booked = docData.slots_booked || {};
        console.log("Current slots_booked for doctor:", slots_booked);
        if (slots_booked[slotDate] && slots_booked[slotDate].includes(slotTime)) { console.warn(`Booking Warning: Slot already booked - Date: ${slotDate}, Time: ${slotTime}`); return res.status(409).json({ success: false, message: 'This time slot is already booked.' }); }
        if (slots_booked[slotDate]) { slots_booked[slotDate].push(slotTime); } else { slots_booked[slotDate] = [slotTime]; }
        docData.markModified('slots_booked'); // Important for nested objects/Mixed type
        console.log(`Attempting to update slots for ${docId}. New slots:`, slots_booked);
        await docData.save(); // Save the doctor document with updated slots
        console.log("Doctor slots updated successfully.");
        // --- End Slot Booking Logic ---


        // --- Prepare Appointment Data ---
        const appointmentData = {
            userId,
            docId,
            userData: { name: userData.name, email: userData.email, phone: userData.phone },
            docData: { name: docData.name, email: docData.email, speciality: docData.speciality, address: docData.address, fees: docData.fees },
            amount: docData.fees,
            slotTime,
            slotDate,
            // --- ***** THE FIX: ADD THIS LINE ***** ---
            date: Date.now() // Store the current timestamp (Number type matches schema)
            // --- ***** END FIX ***** ---
        };
        console.log("Prepared appointment data:", appointmentData);

        // --- Save the New Appointment ---
        const newAppointment = new appointmentModel(appointmentData);
        console.log("Attempting to save appointment...");
        await newAppointment.save(); // This should now pass validation
        console.log("Appointment saved successfully with ID:", newAppointment._id);


        // --- Send Confirmation Emails ---
        try {
            const dateParts = slotDate.split('_');
            const formattedDisplayDate = `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`;

            // --- Send email to user ---
            console.log(`Attempting to send email to user: ${userData.email}`);
            await transporter.sendMail({
                from: `"Symbicure Team" <${process.env.MAIL_ID}>`,
                to: userData.email,
                subject: "Your Symbicure Appointment Confirmation",
                html: `<h2>Hi ${userData.name},</h2><p>Your appointment with <strong>Dr. ${docData.name}</strong> (${docData.speciality || 'Specialist'}) has been successfully booked.</p><p><strong>Date:</strong> ${formattedDisplayDate}</p><p><strong>Time:</strong> ${slotTime}</p><p><strong>Doctor's Clinic Address:</strong> ${docData.address?.line1 || ''}${docData.address?.line2 ? ', ' + docData.address.line2 : ''}</p><p><strong>Fees Due:</strong> ₹${docData.fees || 'N/A'}</p><p>Please arrive a few minutes early. If you need to cancel or reschedule, please do so via the 'My Appointments' section on our website.</p><p>Thank you for choosing Symbicure!</p>`
            });
            console.log(`Sent confirmation email to user: ${userData.email}`);

            // --- Send email to doctor (if email exists) ---
            if (docData.email) {
                 console.log(`Attempting to send email to doctor: ${docData.email}`);
                 await transporter.sendMail({
                     from: `"Symbicure System" <${process.env.MAIL_ID}>`,
                     to: docData.email,
                     subject: `New Appointment Booking - ${userData.name}`,
                     html: `<h2>Hi Dr. ${docData.name},</h2><p>A new appointment has been booked via Symbicure.</p><p><strong>Patient Name:</strong> ${userData.name}</p><p><strong>Patient Contact:</strong> ${userData.email}${userData.phone ? ' / ' + userData.phone : ''}</p><p><strong>Date:</strong> ${formattedDisplayDate}</p><p><strong>Time:</strong> ${slotTime}</p><p>Please ensure your schedule reflects this booking.</p>`
                 });
                 console.log(`Sent notification email to doctor: ${docData.email}`);
            } else { console.warn(`Skipped sending email to doctor ${docData.name} (ID: ${docId}) - No email address found.`); }

        } catch (mailError) {
            console.error(`!!! FAILED TO SEND BOOKING EMAIL(S) for appointment ${newAppointment._id}. Error:`, mailError);
        }
        // --- End Send Emails ---

        console.log("--- bookAppointment End (Success) ---");
        res.status(201).json({ success: true, message: 'Appointment booked successfully! Confirmation email sent.', appointmentId: newAppointment._id });

    } catch (error) {
        // Log the specific error that occurred before sending the generic response
        console.error("!!! bookAppointment MAIN CATCH BLOCK ERROR:", error);
        console.log("--- bookAppointment End (Error) ---");
        res.status(500).json({ success: false, message: "Error processing appointment booking." });
    }
};


// API to cancel appointment (Uses userId from auth middleware)
const cancelAppointment = async (req, res) => {
    const userId = req.userId;
    const { appointmentId } = req.body;
    console.log(`Cancel Appointment request for Appt ID: ${appointmentId} by User ID: ${userId}`);
    try {
        if (!userId) { return res.status(401).json({ success: false, message: "Not Authorized" }); }
        if (!appointmentId) { return res.status(400).json({ success: false, message: "Appointment ID is required." }); }

        const appointmentData = await appointmentModel.findById(appointmentId);
        if (!appointmentData) { /* ... handle not found ... */ }
        if (appointmentData.userId.toString() !== userId) { /* ... handle forbidden ... */ }
        if (appointmentData.cancelled) { /* ... handle already cancelled ... */ }
        if (appointmentData.isCompleted) { /* ... handle completed ... */ }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });
        console.log("Appointment marked as cancelled:", appointmentId);

        // --- Free up the doctor's slot ---
        const { docId, slotDate, slotTime } = appointmentData;
        try {
            const doctorData = await doctorModel.findById(docId);
            if (doctorData && doctorData.slots_booked && doctorData.slots_booked[slotDate]) {
                const updatedSlots = { ...doctorData.slots_booked };
                const timeIndex = updatedSlots[slotDate].indexOf(slotTime);
                if (timeIndex > -1) {
                    updatedSlots[slotDate].splice(timeIndex, 1);
                    if (updatedSlots[slotDate].length === 0) { delete updatedSlots[slotDate]; }
                    doctorData.slots_booked = updatedSlots;
                    doctorData.markModified('slots_booked');
                    await doctorData.save();
                    console.log(`Slot ${slotTime} on ${slotDate} freed for doctor ${docId}`);
                } else { console.warn(`Slot ${slotTime} not found during cancellation cleanup.`); }
            } else { console.warn(`Doctor data or slot date not found during cancellation cleanup.`); }
        } catch(slotError) { console.error(`Error freeing slot during cancellation:`, slotError); }
        // --- End Free Slot ---

        res.status(200).json({ success: true, message: 'Appointment successfully cancelled' });

    } catch (error) { /* ... handle error ... */ }
};


// API to get user's appointments (Uses userId from auth middleware)
const listAppointment = async (req, res) => {
    const userId = req.userId;
    console.log("List Appointments request for userId:", userId);
    try {
        if (!userId) { return res.status(401).json({ success: false, message: "Not Authorized" }); }
        const appointments = await appointmentModel.find({ userId }).sort({ date: -1 });
        console.log(`Found ${appointments.length} appointments for userId:`, userId);
        res.status(200).json({ success: true, appointments });
    } catch (error) { /* ... handle error ... */ }
};


// API to mark tour as completed
const markTourAsCompleted = async (req, res) => {
    const userId = req.userId;
    console.log("Mark Tour Completed request for userId:", userId);
    try {
        if (!userId) { return res.status(401).json({ success: false, message: "Not Authorized" }); }
        const updatedUser = await userModel.findByIdAndUpdate( userId, { $set: { hasCompletedTour: true } }, { new: true }).select('-password');
        if (!updatedUser) { /* ... handle not found ... */ }
        console.log("Mark Tour Completed Success for userId:", userId);
        res.status(200).json({ success: true, message: "Tour status updated successfully", userData: updatedUser });
    } catch (error) { /* ... handle error ... */ }
};

// Export all controller functions
export {
    loginUser,
    registerUser,
    getProfile,
    updateProfile,
    bookAppointment,
    listAppointment,
    cancelAppointment,
    markTourAsCompleted
};