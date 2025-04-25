import axios from 'axios';
import React, { useContext, useState } from 'react';
import { DoctorContext } from '../context/DoctorContext';
import { AdminContext } from '../context/AdminContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const Login = () => {
    const [state, setState] = useState('Admin'); // Or 'Doctor' based on default preference
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Use VITE_BACKEND_URL from .env
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const { setDToken, setDocUserId } = useContext(DoctorContext); // Get setters
    const { setAToken } = useContext(AdminContext);
    const navigate = useNavigate(); // Initialize navigate

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        if (!backendUrl) {
             toast.error("Backend Service URL is not configured.");
             return;
         }
        setLoading(true);

        let url;
        let payload = { email, password };

        try {
            if (state === 'Admin') {
                url = backendUrl + '/api/admin/login';
                const { data } = await axios.post(url, payload);
                if (data.success) {
                    setAToken(data.token); // Update context
                    localStorage.setItem('aToken', data.token); // Save to localStorage
                    toast.success("Admin Login Successful!");
                    // No admin ID handling shown, assume not needed for chat?
                    navigate('/admin-dashboard'); // Navigate to admin home
                } else {
                    toast.error(data.message || "Admin login failed.");
                }

            } else { // Doctor Login
                url = backendUrl + '/api/doctor/login';
                const { data } = await axios.post(url, payload);
                if (data.success) {
                    setDToken(data.token); // Update context
                    localStorage.setItem('dToken', data.token); // Save token

                    // --- Save Doctor's ID (returned as userId by backend) ---
                    if (data.userId) {
                        setDocUserId(data.userId); // Update context
                        localStorage.setItem('docUserId', data.userId); // Save ID
                        toast.success("Doctor Login Successful!");
                        navigate('/doctor-dashboard'); // Navigate to doctor home
                    } else {
                        // This case means backend didn't return the ID - should be fixed
                        console.error("Doctor Login Error: userId missing from backend response", data);
                        toast.error("Login succeeded, but user ID missing. Chat features might be unavailable.");
                        navigate('/doctor-dashboard'); // Still navigate maybe?
                    }
                    // --- End ID Handling ---

                } else {
                    toast.error(data.message || "Doctor login failed.");
                }
            }
        } catch (error) {
             console.error(`Login error for ${state}:`, error);
             toast.error(error.response?.data?.message || `Failed to login as ${state}. Please try again.`);
        } finally {
             setLoading(false);
        }
    };

    return (
        <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
            <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg'>
                <p className='text-2xl font-semibold m-auto'><span className='text-primary'>{state}</span> Login</p>
                <div className='w-full '>
                    <p>Email</p>
                    <input onChange={(e) => setEmail(e.target.value)} value={email} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="email" required />
                </div>
                <div className='w-full '>
                    <p>Password</p>
                    <input onChange={(e) => setPassword(e.target.value)} value={password} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="password" required />
                </div>
                <button type="submit" disabled={loading} className='bg-primary text-white w-full py-2 rounded-md text-base disabled:bg-gray-400'>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
                {state === 'Admin'
                    ? <p>Login as Doctor? <span onClick={() => !loading && setState('Doctor')} className={`text-primary underline ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>Click here</span></p>
                    : <p>Login as Admin? <span onClick={() => !loading && setState('Admin')} className={`text-primary underline ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>Click here</span></p>
                }
            </div>
        </form>
    );
};

export default Login;