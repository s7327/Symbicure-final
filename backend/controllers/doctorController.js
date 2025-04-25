import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";

// Helper function to create JWT token
const createToken = (id) => {
    if (!process.env.JWT_SECRET) {
        console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
        process.exit(1);
    }
    // Consistent expiration with user token if desired
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// API for doctor Login
const loginDoctor = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await doctorModel.findOne({ email }); // 'user' here refers to the doctor document
        if (!user) {
            return res.status(404).json({ success: false, message: "Doctor account not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        // Create token using doctor's _id
        const token = createToken(user._id);

        // --- Return token AND the doctor's ID consistently as userId ---
        res.status(200).json({
            success: true,
            message: "Doctor login successful",
            token: token,
            userId: user._id // <-- RETURN DOCTOR'S ID AS 'userId'
        });

    } catch (error) {
        console.error("Login Doctor Error:", error);
        res.status(500).json({ success: false, message: "Error logging in. Please try again later." });
    }
};

// API to get doctor appointments for doctor panel (Uses docId from auth middleware)
const appointmentsDoctor = async (req, res) => {
    try {
        const docId = req.userId; // <-- Get ID from req.userId (set by updated authDoctor)
        if (!docId) {
            return res.status(401).json({ success: false, message: "Not Authorized" });
        }

        const appointments = await appointmentModel.find({ docId }).sort({ date: -1 });
        res.status(200).json({ success: true, appointments });

    } catch (error) {
        console.error("Doctor Appointments Error:", error);
        res.status(500).json({ success: false, message: "Error fetching appointments." });
    }
};

// API to cancel appointment for doctor panel (Uses docId from auth middleware)
const appointmentCancel = async (req, res) => {
    try {
        const docId = req.userId; // <-- Get ID from req.userId
        const { appointmentId } = req.body;

        if (!docId) {
            return res.status(401).json({ success: false, message: "Not Authorized" });
        }
        if (!appointmentId) {
             return res.status(400).json({ success: false, message: "Appointment ID is required." });
         }

        const appointmentData = await appointmentModel.findById(appointmentId);
        if (!appointmentData) {
             return res.status(404).json({ success: false, message: "Appointment not found." });
         }

        // Authorization check: Only the assigned doctor can cancel? (Adjust logic if needed)
        if (appointmentData.docId.toString() !== docId) {
            return res.status(403).json({ success: false, message: 'Forbidden: You can only manage appointments assigned to you.' });
        }
        if (appointmentData.cancelled) {
             return res.status(400).json({ success: false, message: "Appointment is already cancelled." });
         }
         if (appointmentData.isCompleted) { // Usually doctors shouldn't cancel completed ones
              return res.status(400).json({ success: false, message: "Cannot cancel a completed appointment." });
          }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });
        // Note: Consider if freeing the slot is desired when doctor cancels vs user cancels

        res.status(200).json({ success: true, message: 'Appointment Cancelled' });

    } catch (error) {
        console.error("Doctor Cancel Appointment Error:", error);
        res.status(500).json({ success: false, message: "Error cancelling appointment." });
    }
};

// API to mark appointment completed for doctor panel (Uses docId from auth middleware)
const appointmentComplete = async (req, res) => {
    try {
        const docId = req.userId; // <-- Get ID from req.userId
        const { appointmentId } = req.body;

        if (!docId) {
            return res.status(401).json({ success: false, message: "Not Authorized" });
        }
         if (!appointmentId) {
             return res.status(400).json({ success: false, message: "Appointment ID is required." });
         }

        const appointmentData = await appointmentModel.findById(appointmentId);
        if (!appointmentData) {
             return res.status(404).json({ success: false, message: "Appointment not found." });
         }
        if (appointmentData.docId.toString() !== docId) {
            return res.status(403).json({ success: false, message: 'Forbidden: You can only manage appointments assigned to you.' });
        }
         if (appointmentData.isCompleted) {
              return res.status(400).json({ success: false, message: "Appointment is already marked as completed." });
          }
         if (appointmentData.cancelled) {
             return res.status(400).json({ success: false, message: "Cannot complete a cancelled appointment." });
         }


        await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true });
        res.status(200).json({ success: true, message: 'Appointment marked as Completed' });

    } catch (error) {
        console.error("Doctor Complete Appointment Error:", error);
        res.status(500).json({ success: false, message: "Error completing appointment." });
    }
};

// ==================================================
//          *** CORRECTED doctorList FUNCTION ***
// ==================================================
// API to get all doctors list for Frontend
const doctorList = async (req, res) => {
    console.log("--- doctorList controller START ---"); // Log entry
    try {
        console.log("Attempting to query database: doctorModel.find({})"); // Log before DB query
        const doctors = await doctorModel.find({}); // Find all doctors
        console.log(`Database query finished. Found ${doctors ? doctors.length : 'null/undefined'} doctors.`); // Log after DB query

        // Optional: Filter out sensitive data like password if not already handled by schema select
        // Ensure doctors is an array before mapping
        const sanitizedDoctors = Array.isArray(doctors) ? doctors.map(doc => {
             // Use ._doc to get plain object if it's a Mongoose document, or just spread if already plain
             const plainDoc = doc._doc ? { ...doc._doc } : { ...doc };
             delete plainDoc.password; // Remove password field
             return plainDoc;
         }) : []; // Default to empty array if doctors is not an array
        console.log(`Doctors sanitized. Count: ${sanitizedDoctors.length}`);

        console.log("Attempting to send response: res.status(200).json(...)"); // Log before sending response
        res.status(200).json({ success: true, data: sanitizedDoctors });
        console.log("--- doctorList controller RESPONSE SENT ---"); // Log after sending response

    } catch (error) {
        console.error("!!! ERROR inside doctorList controller:", error); // Log any error caught
        // Ensure a response is sent even on error
        res.status(500).json({ success: false, message: "Error fetching doctor list." });
        console.log("--- doctorList controller ERROR RESPONSE SENT ---"); // Log after error response
    }
};
// ==================================================
//        *** END OF CORRECTED FUNCTION ***
// ==================================================


// API to change doctor availablity (Uses docId from auth middleware IF called by doctor)
// Needs adjustment if called by Admin vs Doctor
const changeAvailablity = async (req, res) => {
    try {
        // This route might need separate auth logic or check role if admin/doctor can both call it
        const docId = req.userId; // Assumes doctor calls it and req.userId is set correctly
         if (!docId) { // Basic check
             return res.status(401).json({ success: false, message: "Not Authorized" });
         }

        const docData = await doctorModel.findById(docId);
        if (!docData) {
             return res.status(404).json({ success: false, message: "Doctor profile not found." });
         }

        await doctorModel.findByIdAndUpdate(docId, { available: !docData.available });
        res.json({ success: true, message: 'Availability Changed' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// API to get doctor profile for Doctor Panel (Uses docId from auth middleware)
const doctorProfile = async (req, res) => {
    try {
        const docId = req.userId; // <-- Get ID from req.userId
        if (!docId) {
            return res.status(401).json({ success: false, message: "Not Authorized" });
        }

        const profileData = await doctorModel.findById(docId).select('-password');
        if (!profileData) {
             return res.status(404).json({ success: false, message: "Doctor profile not found." });
         }
        res.status(200).json({ success: true, profileData });

    } catch (error) {
        console.error("Doctor Profile Error:", error);
        res.status(500).json({ success: false, message: "Error fetching doctor profile." });
    }
};

// API to update doctor profile data from Doctor Panel (Uses docId from auth middleware)
const updateDoctorProfile = async (req, res) => {
    try {
        const docId = req.userId; // <-- Get ID from req.userId
        // Only allow updating specific fields relevant to doctor's own profile settings
        const { fees, address, available, name, phone /* etc */ } = req.body;

         if (!docId) {
            return res.status(401).json({ success: false, message: "Not Authorized" });
        }

        // Construct update object carefully
        const updateData = {};
        if (fees !== undefined) updateData.fees = fees;
        if (address !== undefined) updateData.address = address; // Assume address is already correct object format
        if (available !== undefined) updateData.available = available;
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        // Add other fields doctor can update here

        if (Object.keys(updateData).length === 0) {
             return res.status(400).json({ success: false, message: "No update data provided." });
         }


        const updatedDoctor = await doctorModel.findByIdAndUpdate(
            docId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

         if (!updatedDoctor) {
             return res.status(404).json({ success: false, message: "Doctor profile not found for update." });
         }

        res.status(200).json({ success: true, message: 'Profile Updated Successfully', profileData: updatedDoctor });

    } catch (error) {
        console.error("Update Doctor Profile Error:", error);
         if (error.name === 'ValidationError') {
             return res.status(400).json({ success: false, message: `Validation Error: ${error.message}` });
         }
        res.status(500).json({ success: false, message: "Error updating doctor profile." });
    }
};

// API to get dashboard data for doctor panel (Uses docId from auth middleware)
const doctorDashboard = async (req, res) => {
    try {
        const docId = req.userId; // <-- Get ID from req.userId
         if (!docId) {
            return res.status(401).json({ success: false, message: "Not Authorized" });
        }

        // Fetch appointments directly assigned to this doctor
        const appointments = await appointmentModel.find({ docId });

        let earnings = 0;
        let uniquePatientIds = new Set(); // Use a Set for efficient uniqueness check

        appointments.forEach((item) => {
            // Calculate earnings based on completed OR paid appointments
            if (item.isCompleted || item.payment) {
                earnings += item.amount;
            }
            // Collect unique patient IDs
            uniquePatientIds.add(item.userId.toString()); // Add patient ID string to set
        });

        // Prepare dashboard data
        const dashData = {
            earnings,
            appointments: appointments.length,
            patients: uniquePatientIds.size, // Get count of unique patients
            // Get latest 5 appointments for display?
            latestAppointments: appointments.sort((a, b) => b.date - a.date).slice(0, 5)
        };

        res.status(200).json({ success: true, dashData });

    } catch (error) {
        console.error("Doctor Dashboard Error:", error);
        res.status(500).json({ success: false, message: "Error fetching dashboard data." });
    }
};

// Ensure all functions including the corrected doctorList are exported
export {
    loginDoctor,
    appointmentsDoctor,
    appointmentCancel,
    doctorList, // <-- CORRECTED FUNCTION NOW INCLUDED
    changeAvailablity,
    appointmentComplete,
    doctorDashboard,
    doctorProfile,
    updateDoctorProfile
};