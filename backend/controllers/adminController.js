import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
// Removed bcrypt as it's not needed for admin password check against .env
// import bcrypt from "bcrypt";
import validator from "validator"; // Keep for addDoctor validation
import { v2 as cloudinary } from "cloudinary";
import userModel from "../models/userModel.js";
import bcrypt from 'bcrypt'; 

// API for admin login
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Basic input check
        if (!email || !password) {
             return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        // Validate credentials against environment variables
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            // --- Sign a non-sensitive payload ---
            // Payload includes an identifier (email) and a role
            const payload = {
                id: process.env.ADMIN_EMAIL, // Use email as a unique static ID for the admin
                role: 'admin'               // Clearly identify the role
            };
            const secret = process.env.JWT_SECRET;

            // Ensure JWT secret is set in environment variables
            if (!secret) {
                console.error("CRITICAL: JWT_SECRET is not defined in the environment variables.");
                return res.status(500).json({ success: false, message: "Server configuration error." });
            }

            // Create the JWT token with an expiration time
            const token = jwt.sign(payload, secret, { expiresIn: '1h' }); // e.g., expires in 1 hour

            // --- Return only the token ---
            res.status(200).json({ success: true, token: token, message: "Admin login successful" }); // Use 200 OK

        } else {
            // Invalid credentials
            res.status(401).json({ success: false, message: "Invalid admin credentials" }); // Use 401 Unauthorized
        }

    } catch (error) {
        console.error("Admin Login Error:", error);
        res.status(500).json({ success: false, message: "An error occurred during admin login." }); // Use 500 Internal Server Error
    }
};


// API to get all appointments list (Protected by authAdmin)
const appointmentsAdmin = async (req, res) => {
    try {
        // Fetch all appointments, potentially sort by date descending
        const appointments = await appointmentModel.find({}).sort({ createdAt: -1 }); // Sort by creation time
        res.status(200).json({ success: true, appointments });

    } catch (error) {
        console.error("Admin Get Appointments Error:", error);
        res.status(500).json({ success: false, message: "Error fetching appointments." });
    }
};

// API for appointment cancellation (Protected by authAdmin)
const appointmentCancel = async (req, res) => {
    try {
        const { appointmentId } = req.body;
         if (!appointmentId) {
            return res.status(400).json({ success: false, message: "Appointment ID is required." });
         }

        const updatedAppointment = await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true }, { new: true });

        if (!updatedAppointment) {
            return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        // Optionally free up doctor slot here if needed by admin cancellation

        res.status(200).json({ success: true, message: 'Appointment Cancelled Successfully' });

    } catch (error) {
        console.error("Admin Cancel Appointment Error:", error);
        res.status(500).json({ success: false, message: "Error cancelling appointment." });
    }
};

// API for adding Doctor (Protected by authAdmin)
const addDoctor = async (req, res) => {
    try {
        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body;
        const imageFile = req.file;

        // Basic field validation
        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address || !imageFile) {
            return res.status(400).json({ success: false, message: "All fields including image are required" });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email" });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }
         // Check if doctor email already exists
         const existingDoctor = await doctorModel.findOne({ email });
         if (existingDoctor) {
             return res.status(409).json({ success: false, message: "Doctor with this email already exists." }); // 409 Conflict
         }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let parsedAddress;
        try {
            parsedAddress = JSON.parse(address);
        } catch(e) {
             return res.status(400).json({ success: false, message: "Invalid address format (must be JSON string)." });
        }

        // Upload image to Cloudinary
        let imageUrl;
        try {
             const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
                 folder: "doctor_profiles", // Optional folder
                 resource_type: "image"
             });
             imageUrl = imageUpload.secure_url;
         } catch(uploadError) {
             console.error("Cloudinary Upload Error:", uploadError);
             return res.status(500).json({ success: false, message: "Failed to upload doctor image." });
         }


        const doctorData = {
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: parsedAddress,
            date: Date.now() // Consider using default timestamp from schema
        };

        const newDoctor = new doctorModel(doctorData);
        await newDoctor.save();
        res.status(201).json({ success: true, message: 'Doctor Added Successfully' }); // Use 201 Created

    } catch (error) {
        console.error("Add Doctor Error:", error);
         // Handle potential duplicate key errors if email isn't checked above
         if (error.code === 11000) {
             return res.status(409).json({ success: false, message: "Email already exists." });
         }
        res.status(500).json({ success: false, message: "Error adding doctor." });
    }
};

// API to get all doctors list for admin panel (Protected by authAdmin)
const allDoctors = async (req, res) => {
    try {
        // Fetch all doctors, exclude password field
        const doctors = await doctorModel.find({}).select('-password').sort({ name: 1 }); // Sort alphabetically
        res.status(200).json({ success: true, doctors });

    } catch (error) {
        console.error("Admin All Doctors Error:", error);
        res.status(500).json({ success: false, message: "Error fetching doctors list." });
    }
};

// API to get dashboard data for admin panel (Protected by authAdmin)
const adminDashboard = async (req, res) => {
    try {
        // Perform counts using efficient database methods
        const doctorCount = await doctorModel.countDocuments();
        const userCount = await userModel.countDocuments();
        const appointmentCount = await appointmentModel.countDocuments();

        // Fetch latest appointments (e.g., latest 5)
        const latestAppointments = await appointmentModel.find({})
                                                      .sort({ createdAt: -1 }) // Sort by creation time
                                                      .limit(5) // Limit results
                                                      .populate('userId', 'name') // Get patient name
                                                      .populate('docId', 'name'); // Get doctor name

        const dashData = {
            doctors: doctorCount,
            appointments: appointmentCount,
            patients: userCount,
            latestAppointments: latestAppointments
        };

        res.status(200).json({ success: true, dashData });

    } catch (error) {
        console.error("Admin Dashboard Error:", error);
        res.status(500).json({ success: false, message: "Error fetching dashboard data." });
    }
};

export {
    loginAdmin,
    appointmentsAdmin,
    appointmentCancel,
    addDoctor,
    allDoctors,
    adminDashboard
};