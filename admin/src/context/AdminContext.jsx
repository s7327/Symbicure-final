import axios from "axios";
import { createContext, useState, useEffect } from "react"; // Added useEffect
import { toast } from "react-toastify";

export const AdminContext = createContext(null); // Init with null

const AdminContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL; // Ensure set in admin .env

    // Initialize token from localStorage using function to avoid running it unnecessarily
    const [aToken, setAToken] = useState(() => localStorage.getItem('aToken') || '');

    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [dashData, setDashData] = useState(null); // Init as null
    const [loading, setLoading] = useState({ // Add loading states if needed
        doctors: false,
        appointments: false,
        dashboard: false,
        action: false
    });

    // Effect to log token on initial load or change
    useEffect(() => {
         console.log("[DEBUG] AdminContext: Token Initialized/Changed -", !!aToken);
         // Optionally fetch initial data here if needed when token becomes available
         // if (aToken) {
         //    getAllDoctors(aToken);
         //    getAllAppointments(aToken);
         //    getDashData(aToken);
         // }
     }, [aToken]);


    // Helper to create headers
    const createAuthHeaders = (token = aToken) => {
        if (!token) return {};
        return { headers: { Authorization: `Bearer ${token}` } }; // Use standard header
    };

    // Getting all Doctors data from Database using API
    const getAllDoctors = async (token = aToken) => {
        console.log("[DEBUG] getAllDoctors: Fetching with token:", !!token);
        if (!token || !backendUrl) return;
        setLoading(prev => ({ ...prev, doctors: true })); // Set loading
        try {
            const headers = createAuthHeaders(token); // Get headers
            console.log("[DEBUG] getAllDoctors: Requesting from:", backendUrl + '/api/admin/all-doctors');
            const { data } = await axios.get(backendUrl + '/api/admin/all-doctors', headers);
            console.log("[DEBUG] getAllDoctors: Response received:", data);
            if (data.success) {
                setDoctors(data.doctors);
            } else {
                toast.error(data.message || "Failed to fetch doctors.");
                setDoctors([]); // Clear on failure
            }
        } catch (error) {
            console.error("[DEBUG] getAllDoctors: Error fetching -", error);
            toast.error(error.response?.data?.message || error.message || "Network error fetching doctors.");
            setDoctors([]); // Clear on error
        } finally {
             setLoading(prev => ({ ...prev, doctors: false })); // Unset loading
        }
    };

    // Function to change doctor availability using API
    const changeAvailability = async (docId, token = aToken) => {
        if (!token || !backendUrl || !docId) return;
        setLoading(prev => ({ ...prev, action: true }));
        try {
            const headers = createAuthHeaders(token);
            // Assuming endpoint might be /api/admin/doctors/:docId/availability (RESTful)
            // Or keep POST if backend expects that
            const { data } = await axios.post(backendUrl + '/api/admin/change-availability', { docId }, headers); // Keep POST for now
            if (data.success) {
                toast.success(data.message || "Availability updated.");
                // Refresh doctors list efficiently instead of refetching all
                setDoctors(prevDocs => prevDocs.map(doc =>
                     doc._id === docId ? { ...doc, available: !doc.available } : doc
                 ));
                // getAllDoctors(token); // Less efficient alternative
            } else {
                toast.error(data.message || "Failed to update availability.");
            }
        } catch (error) {
            console.error("[DEBUG] changeAvailability Error:", error);
            toast.error(error.response?.data?.message || error.message || "Failed to change availability.");
        } finally {
             setLoading(prev => ({ ...prev, action: false }));
        }
    };


    // Getting all appointment data from Database using API
    const getAllAppointments = async (token = aToken) => {
         if (!token || !backendUrl) return;
         setLoading(prev => ({ ...prev, appointments: true }));
        try {
            const headers = createAuthHeaders(token);
            const { data } = await axios.get(backendUrl + '/api/admin/appointments', headers);
            if (data.success) {
                setAppointments(data.appointments); // Assuming backend sorts now
            } else {
                toast.error(data.message || "Failed to fetch appointments.");
                 setAppointments([]);
            }
        } catch (error) {
            console.error("[DEBUG] getAllAppointments Error:", error);
            toast.error(error.response?.data?.message || error.message || "Error fetching appointments.");
            setAppointments([]);
        } finally {
             setLoading(prev => ({ ...prev, appointments: false }));
        }
    };

    // Function to cancel appointment using API
    const cancelAppointment = async (appointmentId, token = aToken) => {
         if (!token || !backendUrl || !appointmentId) return;
         setLoading(prev => ({ ...prev, action: true }));
        try {
            const headers = createAuthHeaders(token);
            const { data } = await axios.post(backendUrl + '/api/admin/cancel-appointment', { appointmentId }, headers);
            if (data.success) {
                toast.success(data.message || "Appointment cancelled.");
                // Update local state instead of full refetch
                setAppointments(prevApps => prevApps.map(app =>
                    app._id === appointmentId ? { ...app, cancelled: true } : app
                ));
                // getAllAppointments(token); // Less efficient
            } else {
                toast.error(data.message || "Failed to cancel appointment.");
            }
        } catch (error) {
            console.error("[DEBUG] cancelAppointment Error:", error);
            toast.error(error.response?.data?.message || error.message || "Error cancelling appointment.");
        } finally {
             setLoading(prev => ({ ...prev, action: false }));
        }
    };

    // Getting Admin Dashboard data from Database using API
    const getDashData = async (token = aToken) => {
         if (!token || !backendUrl) return;
         setLoading(prev => ({ ...prev, dashboard: true }));
        try {
            const headers = createAuthHeaders(token);
            const { data } = await axios.get(backendUrl + '/api/admin/dashboard', headers);
            if (data.success) {
                setDashData(data.dashData);
            } else {
                 toast.error(data.message || "Failed to load dashboard data.");
                 setDashData(null);
            }
        } catch (error) {
            console.error("[DEBUG] getDashData Error:", error);
            toast.error(error.response?.data?.message || error.message || "Error fetching dashboard data.");
            setDashData(null);
        } finally {
             setLoading(prev => ({ ...prev, dashboard: false }));
        }
    };

     // --- Logout Function ---
     const adminLogout = () => {
         setAToken('');
         setAppointments([]);
         setDoctors([]);
         setDashData(null);
         localStorage.removeItem('aToken');
         // No admin user ID stored/needed currently
         // Optionally navigate to login
     };

    const value = {
        aToken, setAToken, backendUrl, // Added backendUrl
        loading, // Provide loading states
        doctors, setDoctors, // Provide setter if needed elsewhere
        getAllDoctors,
        changeAvailability,
        appointments, setAppointments, // Provide setter
        getAllAppointments,
        getDashData,
        cancelAppointment,
        dashData,
        adminLogout // Provide logout
    };

    return (
        <AdminContext.Provider value={value}>
            {props.children}
        </AdminContext.Provider>
    );
};

export default AdminContextProvider;