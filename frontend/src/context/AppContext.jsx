import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from 'axios';

export const AppContext = createContext(null);

const AppContextProvider = (props) => {
    const currencySymbol = '₹';
    // Ensure VITE_BACKEND_URL in .env points to your backend base URL (e.g., http://localhost:4000)
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [doctors, setDoctors] = useState([]);
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [userData, setUserData] = useState(null);
    const [userId, setUserId] = useState(localStorage.getItem('userId') || null);

    // Fetch list of all doctors
    const getDoctosData = async () => {
        // Removed previous console logs for clarity, focusing on profile fetch now
        if (!backendUrl) {
            console.error("VITE_BACKEND_URL is not defined in .env file.");
            toast.error("Backend URL not configured.");
            return;
        }
        try {
            const response = await axios.get(backendUrl + '/api/doctor/list');
            const responseData = response.data;
            if (responseData && responseData.success) {
                setDoctors(responseData.data || []);
            } else {
                console.error("Failed to fetch doctors:", responseData?.message || 'API error');
                toast.error(responseData?.message || "Failed to fetch doctors list (API error).");
                setDoctors([]);
            }
        } catch (error) {
            console.error("Error fetching doctors:", error.response || error.message || error);
             if (error.response) {
                 toast.error(`Failed to fetch doctors list. Status: ${error.response.status} - ${error.response.data?.message || 'Server error'}`);
             } else if (error.request) {
                 toast.error("Failed to fetch doctors list. No response from server.");
             } else {
                 toast.error("Failed to fetch doctors list. Network or configuration error.");
             }
             setDoctors([]);
        }
    };

    // Load profile data for the currently logged-in user
    const loadUserProfileData = async (currentToken) => {
        // Prevent call if no token or URL
        if (!currentToken) {
            console.log("loadUserProfileData skipped: No token provided.");
            setUserData(null);
            setUserId(null);
            localStorage.removeItem('userId'); // Clean up local storage too
            return;
        }
        if (!backendUrl) {
            console.error("loadUserProfileData skipped: Backend URL not configured.");
            toast.error("Backend URL is not configured.");
            return;
        }

        try {
            // --- DEBUG LOGS ADDED HERE ---
            const profileUrl = backendUrl + '/api/user/get-profile';
            console.log("Attempting to load profile from URL:", profileUrl); // Log the exact URL being called
            console.log("Using token:", currentToken ? 'Token Present' : 'Token Missing!'); // Log if token exists
            // --- END OF DEBUG LOGS ---

            // Make the API call to get profile data
            const { data } = await axios.get(profileUrl, { headers: { token: currentToken } });

            // Process successful response
            if (data.success) {
                console.log("Profile data loaded successfully:", data.userData); // Log success
                setUserData(data.userData);
                // Sync userId state and localStorage
                if (data.userData?._id) {
                     if (localStorage.getItem('userId') !== data.userData._id) {
                         localStorage.setItem('userId', data.userData._id);
                     }
                     setUserId(data.userData._id);
                } else {
                     // Handle case where userData is returned but has no _id (shouldn't happen)
                     console.warn("User data loaded but missing _id.");
                     setUserId(null);
                     localStorage.removeItem('userId');
                }
            } else {
                // Handle API returning success: false
                console.warn("Load profile warning (API success:false):", data.message);
                toast.warn(data.message || "Could not load profile."); // Use warn toast
                 // Clear user data on failure
                 setUserData(null);
                 setUserId(null);
                 localStorage.removeItem('userId');
                 // Potentially remove token if server indicates it's invalid via message?
                 // localStorage.removeItem('token');
                 // setToken('');
            }
        } catch (error) {
            // Log detailed error from Axios (includes response if available)
            console.error("Error loading user profile:", error.response || error.message || error);

            // Clear user data and token if unauthorized (401) or if request failed (e.g., 404)
            if (error.response?.status === 401 || error.response?.status === 404) {
                 toast.error(error.response.data?.message || `Failed to load profile (Status: ${error.response.status})`);
                 setUserData(null);
                 setUserId(null);
                 localStorage.removeItem('userId');
                 localStorage.removeItem('token'); // Remove invalid token
                 setToken(''); // Update context state
            } else if (error.request) {
                 // Network error, server unreachable
                 toast.error("Could not connect to server to load profile.");
            } else {
                 // Other errors (e.g., setting up request)
                 toast.error("An unexpected error occurred while loading profile.");
            }
        }
    };

    // Effect to load initial data on component mount
    useEffect(() => {
        console.log("AppContext mounted. Initializing...");
        getDoctosData(); // Fetch doctors list

        const storedToken = localStorage.getItem('token');
        const storedUserId = localStorage.getItem('userId'); // Also get stored userId

        if (storedToken) {
            console.log("Found token in localStorage. Setting token and loading profile.");
            setToken(storedToken);
            if (storedUserId) {
                setUserId(storedUserId); // Set initial userId from localStorage
            }
            loadUserProfileData(storedToken); // Load profile using the found token
        } else {
            console.log("No token found in localStorage. Initializing as logged out.");
            // Ensure state is clear if no token found
            setUserData(null);
            setUserId(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    // Effect to reload profile if token changes *after* initial load (e.g., on login/logout)
    useEffect(() => {
        const storedToken = localStorage.getItem('token');

        // Run only if token state changes *and* differs from localStorage
        // Or if token becomes null (logout)
        if (token !== storedToken) {
            if (token) {
                 console.log("Token changed (login detected). Reloading profile.");
                 loadUserProfileData(token);
            } else {
                 console.log("Token removed (logout detected). Clearing user data.");
                 // Handle logout case - clear data
                 setUserData(null);
                 setUserId(null);
                 localStorage.removeItem('userId'); // Ensure userId is cleared too
            }
        }
    }, [token]); // Dependency array includes token

    // Context value provided to consuming components
    const value = {
        doctors, getDoctosData,
        currencySymbol,
        backendUrl,
        token, setToken, // Provide setToken for login/logout components
        userData, setUserData, // Provide setUserData if needed externally (less common)
        loadUserProfileData, // Provide function if manual profile refresh is needed
        userId, setUserId // Provide userId and potentially setUserId if needed
    };

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
};

export default AppContextProvider;