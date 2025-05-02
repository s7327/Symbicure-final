import React, { createContext, useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import axios from 'axios';

export const AppContext = createContext(null);

const AppContextProvider = (props) => {
    const currencySymbol = '₹';
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // Initialize state from localStorage
    const [token, setToken] = useState(() => localStorage.getItem('token') || '');
    const [userId, setUserId] = useState(() => localStorage.getItem('userId') || null);
    const [userData, setUserData] = useState(null); // Start as null
    const [doctors, setDoctors] = useState([]);

    // Fetch list of all doctors (memoized)
    const getDoctosData = useCallback(async () => {
        if (!backendUrl) { /* ... */ return; }
        try {
            const response = await axios.get(backendUrl + '/api/doctor/list');
            if (response.data?.success) setDoctors(response.data.data || []);
            else { /* ... error handling ... */ setDoctors([]); }
        } catch (error) { /* ... error handling ... */ setDoctors([]); }
    }, [backendUrl]);

    // Load profile data (memoized)
    const loadUserProfileData = useCallback(async (currentToken) => {
        console.log("[AppContext] loadUserProfileData called with token:", !!currentToken);
        if (!currentToken || !backendUrl) {
            console.log("[AppContext] loadUserProfileData: Skipping due to missing token or URL.");
            setUserData(null); // Ensure cleared if no token provided
            setUserId(null);
            // No need to clear localStorage here, should be handled by logout/login logic
            return;
        }
        // Set user data to null while loading? Optional for UX
        // setUserData(null);
        try {
            const profileUrl = backendUrl + '/api/user/get-profile';
            console.log("[AppContext] loadUserProfileData: Fetching profile...");
            const response = await axios.get(profileUrl, { headers: { token: currentToken } });
            const responseData = response.data;

            if (responseData.success && responseData.userData) {
                console.log("[AppContext] loadUserProfileData: Profile data loaded successfully:", responseData.userData._id);
                setUserData(responseData.userData); // <-- Update userData state
                // Sync userId from loaded data
                if (responseData.userData._id) {
                    setUserId(responseData.userData._id);
                    if (localStorage.getItem('userId') !== responseData.userData._id) {
                        localStorage.setItem('userId', responseData.userData._id); // Keep localStorage sync
                    }
                } else {
                     console.warn("[AppContext] loadUserProfileData: User data loaded but missing _id.");
                     setUserId(null); // Clear userId if missing from response
                     localStorage.removeItem('userId');
                }
            } else {
                console.warn("[AppContext] loadUserProfileData: Load profile warning -", responseData.message || "API success:false or userData missing");
                toast.warn(responseData.message || "Could not load profile details.");
                setUserData(null); // Clear data on failure
                setUserId(null);
                localStorage.removeItem('userId');
            }
        } catch (error) {
            console.error("[AppContext] loadUserProfileData: Error loading profile:", error.response?.status, error.message);
             if (error.response?.status === 401) {
                  toast.error(error.response.data?.message || "Session expired. Please log in again.");
                  setUserData(null);
                  setUserId(null);
                  localStorage.removeItem('userId');
                  localStorage.removeItem('token'); // Force remove invalid token
                  setToken(''); // <<< Trigger context update for logout state
             } else { // Other errors (network, server 500 etc)
                 toast.error("Could not load profile due to network or server issue.");
                 // Don't clear token here unless sure it's invalid
                 setUserData(null);
                 setUserId(null);
                 localStorage.removeItem('userId');
             }
        }
    }, [backendUrl]); // Dependency: backendUrl (setToken is stable)

    // Mark Tour as Completed (memoized)
    const completeTour = useCallback(async () => {
        // ... (keep existing completeTour function) ...
         if (!token || !backendUrl || !userData) return;
         const url = `${backendUrl}/api/user/complete-tour`;
         try {
             const response = await axios.put(url, {}, { headers: { token } });
             if (response.data.success) { /* ... update userData state ... */ }
             else { /* ... handle failure ... */ }
         } catch (error) { /* ... handle error, including 401 ... */ }
    }, [token, backendUrl, userData]);


    // Effect to load initial data (doctors) only once on mount
    useEffect(() => {
        console.log("[AppContext] Initial Mount: Fetching doctors.");
        getDoctosData();
    }, [getDoctosData]); // Depends only on the stable getDoctosData function

    // *** CRITICAL EFFECT: Load user profile when token changes ***
    useEffect(() => {
        console.log("[AppContext] useEffect[token] triggered. Current token:", !!token);
        if (token) {
            // If token exists (login occurred or initial load found token), load profile
            loadUserProfileData(token);
        } else {
            // If token is empty/null (logout occurred), ensure user data is cleared
            console.log("[AppContext] useEffect[token]: Token is empty, clearing user data.");
            setUserData(null);
            setUserId(null);
            // No need to clear localStorage here, logout/error handling should do it
        }
    }, [token, loadUserProfileData]); // << Run whenever 'token' state changes or loadUserProfileData reference changes (it shouldn't if memoized)


    // Context value
    const value = {
        doctors, getDoctosData,
        currencySymbol,
        backendUrl,
        token, setToken,
        userData, setUserData, // Keep setUserData if needed elsewhere, but avoid direct mutation
        loadUserProfileData,
        userId, setUserId,
        completeTour
    };

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
};

export default AppContextProvider;