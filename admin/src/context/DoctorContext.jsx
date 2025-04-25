import { createContext, useState, useEffect } from "react";
import axios from 'axios';
import { toast } from 'react-toastify';

export const DoctorContext = createContext(null); // Initialize with null

const DoctorContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL; // Ensure this is set in admin .env

    const [dToken, setDToken] = useState(localStorage.getItem('dToken') || '');
    // --- ADDED Doctor ID STATE ---
    const [docUserId, setDocUserId] = useState(localStorage.getItem('docUserId') || null);

    const [appointments, setAppointments] = useState([]);
    const [dashData, setDashData] = useState(null); // Initialize as null
    const [profileData, setProfileData] = useState(null); // Initialize as null

    // Sync state from localStorage on initial load
    useEffect(() => {
        const token = localStorage.getItem('dToken');
        const id = localStorage.getItem('docUserId');
        if (token) setDToken(token);
        if (id) setDocUserId(id);
        // Optionally fetch initial data if token/id exist
        if (token && id) {
            // Example: You might want to fetch appointments or profile on load
            // getAppointments(token); // Pass token if needed
            // getProfileData(token); // Pass token if needed
        }
    }, []);

    // Getting Doctor appointment data (pass token to avoid stale state)
    const getAppointments = async (token = dToken) => {
         if (!token || !backendUrl) return; // Guard clause
        try {
            // Use 'token' standard header name if backend auth middleware expects it
            const headers = { headers: { dtoken: token } }; // Or Authorization: `Bearer ${token}`
            const { data } = await axios.get(backendUrl + '/api/doctor/appointments', headers);
            if (data.success) {
                setAppointments(data.appointments.reverse());
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error fetching doctor appointments:", error);
            toast.error(error.response?.data?.message || "Failed to fetch appointments.");
        }
    };

    // Getting Doctor profile data (pass token)
    const getProfileData = async (token = dToken) => {
         if (!token || !backendUrl) return;
        try {
            const headers = { headers: { dtoken: token } };
            const { data } = await axios.get(backendUrl + '/api/doctor/profile', headers);
            if (data.success) {
                 setProfileData(data.profileData);
            } else {
                 // Handle cases where profile might not be found initially without error toast
                 console.warn("Get profile warning:", data.message);
                 setProfileData(null); // Clear if not found
            }
        } catch (error) {
            console.error("Error fetching doctor profile:", error);
             if (error.response?.status !== 404) { // Don't toast for "not found"
                 toast.error(error.response?.data?.message || "Failed to fetch profile.");
             }
             setProfileData(null); // Clear on error
        }
    };

    // Cancel appointment (pass token)
    const cancelAppointment = async (appointmentId, token = dToken) => {
         if (!token || !backendUrl) return;
        try {
            const headers = { headers: { dtoken: token } };
            const { data } = await axios.post(backendUrl + '/api/doctor/cancel-appointment', { appointmentId }, headers);
            if (data.success) {
                toast.success(data.message);
                getAppointments(token); // Refresh list
                getDashData(token); // Refresh dashboard
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error cancelling appointment (doctor):", error);
            toast.error(error.response?.data?.message || "Failed to cancel appointment.");
        }
    };

    // Complete appointment (pass token)
    const completeAppointment = async (appointmentId, token = dToken) => {
         if (!token || !backendUrl) return;
        try {
            const headers = { headers: { dtoken: token } };
            const { data } = await axios.post(backendUrl + '/api/doctor/complete-appointment', { appointmentId }, headers);
            if (data.success) {
                toast.success(data.message);
                getAppointments(token); // Refresh list
                getDashData(token); // Refresh dashboard
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error completing appointment (doctor):", error);
            toast.error(error.response?.data?.message || "Failed to complete appointment.");
        }
    };

    // Getting Doctor dashboard data (pass token)
    const getDashData = async (token = dToken) => {
         if (!token || !backendUrl) return;
        try {
            const headers = { headers: { dtoken: token } };
            const { data } = await axios.get(backendUrl + '/api/doctor/dashboard', headers);
            if (data.success) {
                setDashData(data.dashData);
            } else {
                 console.warn("Get dashboard warning:", data.message);
                 setDashData(null);
            }
        } catch (error) {
            console.error("Error fetching doctor dashboard:", error);
            if (error.response?.status !== 404) {
                 toast.error(error.response?.data?.message || "Failed to fetch dashboard data.");
             }
             setDashData(null);
        }
    };

    // --- Logout Function ---
    const doctorLogout = () => {
        setDToken('');
        setDocUserId(null);
        setAppointments([]);
        setDashData(null);
        setProfileData(null);
        localStorage.removeItem('dToken');
        localStorage.removeItem('docUserId');
        // Optionally navigate to login page using useNavigate() hook if used here or in component calling this
    };


    const value = {
        dToken, setDToken, backendUrl,
        // --- Provide docUserId and setter ---
        docUserId, setDocUserId,
        appointments, getAppointments,
        cancelAppointment, completeAppointment,
        dashData, getDashData,
        profileData, setProfileData, getProfileData,
        doctorLogout // Provide logout function
    };

    return (
        <DoctorContext.Provider value={value}>
            {props.children}
        </DoctorContext.Provider>
    );
};

export default DoctorContextProvider;