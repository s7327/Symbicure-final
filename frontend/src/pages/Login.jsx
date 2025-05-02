import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [state, setState] = useState('Login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    // Only need setToken and setUserId here, AppContext handles loading profile
    const { backendUrl, token, setToken, setUserId } = useContext(AppContext);

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        if (!backendUrl) {
            toast.error("Backend URL not configured.");
            return;
        }
        setLoading(true);

        let url;
        let payload;

        if (state === 'Sign Up') {
            url = backendUrl + '/api/user/register';
            payload = { name, email, password };
        } else { // Login state
            url = backendUrl + '/api/user/login';
            payload = { email, password };
        }

        try {
            const { data } = await axios.post(url, payload);

            if (data.success) {
                // --- Handle Sign Up Success ---
                if (state === 'Sign Up') {
                     toast.success("Registration Successful! Please Login.");
                     setState('Login');
                     setPassword('');
                     // Don't log in automatically, force user to log in
                }
                // --- Handle Login Success ---
                else if (state === 'Login' && data.token && data.userId) {
                    console.log("[Login.jsx] Login API Success. Token received.");
                    // 1. Store token & userId in localStorage FIRST
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userId', data.userId);

                    // 2. Update context state. This will trigger AppContext's useEffect
                    console.log("[Login.jsx] Calling setToken and setUserId...");
                    setToken(data.token);
                    setUserId(data.userId); // Set userId in context as well

                    // 3. Navigate IMMEDIATELY. AppContext effect will handle profile load.
                    console.log("[Login.jsx] Navigating to / ...");
                    toast.success("Login Successful!"); // Toast before navigate can be better UX
                    navigate('/');

                } else {
                    console.warn("[Login.jsx] Login API success but token/userId missing:", data);
                    toast.error("Login failed: Incomplete server response.");
                }

            } else { // Handle API success: false
                toast.error(data.message || "Login failed. Please check credentials.");
            }
        } catch (error) {
            console.error(`[Login.jsx] Error during ${state}:`, error.response || error);
            if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 404) {
                 toast.error(error.response.data?.message || "Invalid credentials or user not found.");
            } else {
                 toast.error("Login failed. Connection or server error.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Redirect if already logged in (checks context token)
    useEffect(() => {
        if (token) {
            console.log("[Login.jsx] Token found in context on mount, redirecting...");
            navigate('/');
        }
    }, [token, navigate]);

    // --- JSX Structure ---
    return (
         <div className='min-h-[calc(80vh-100px)] flex items-center justify-center py-10'>
            <form onSubmit={onSubmitHandler} className='w-full max-w-md bg-white p-8 border rounded-xl shadow-lg flex flex-col gap-5'>
                <h2 className='text-3xl font-semibold text-gray-800 text-center mb-2'>{state}</h2>
                {state === 'Sign Up' && (
                    <div className='w-full'>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Full Name</label>
                        <input onChange={(e) => setName(e.target.value)} value={name} className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary' type="text" required />
                    </div>
                )}
                <div className='w-full'>
                     <label className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
                    <input onChange={(e) => setEmail(e.target.value)} value={email} className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary' type="email" required />
                </div>
                <div className='w-full'>
                     <label className='block text-sm font-medium text-gray-700 mb-1'>Password</label>
                    <input onChange={(e) => setPassword(e.target.value)} value={password} className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary' type="password" required />
                </div>
                <button type="submit" disabled={loading} className='w-full bg-primary text-white py-2.5 mt-2 rounded-md text-base font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                    {loading ? 'Processing...' : (state === 'Sign Up' ? 'Create Account' : 'Login')}
                </button>
                <p className='text-sm text-center w-full text-gray-600 mt-2'>
                    {state === 'Sign Up'
                        ? <>Already have an account? <span onClick={() => !loading && setState('Login')} className={`text-primary font-medium underline ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>Login here</span></>
                        : <>Don't have an account? <span onClick={() => !loading && setState('Sign Up')} className={`text-primary font-medium underline ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>Create one</span></>
                    }
                </p>
            </form>
        </div>
    );
};

export default Login;