import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [state, setState] = useState('Login'); // Default to Login
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false); // Add loading state

    const navigate = useNavigate();
    // --- Get setUserId from context ---
    const { backendUrl, token, setToken, setUserId, loadUserProfileData } = useContext(AppContext);

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        if (!backendUrl) {
            toast.error("Backend URL not configured. Cannot proceed.");
            return;
        }
        setLoading(true); // Start loading

        let url;
        let payload;

        if (state === 'Sign Up') {
            url = backendUrl + '/api/user/register';
            payload = { name, email, password };
        } else {
            url = backendUrl + '/api/user/login';
            payload = { email, password };
        }

        try {
            const { data } = await axios.post(url, payload);

            if (data.success) {
                localStorage.setItem('token', data.token);
                setToken(data.token); // Update context

                // --- Handle userId for LOGIN ---
                if (state === 'Login' && data.userId) {
                    localStorage.setItem('userId', data.userId);
                    setUserId(data.userId); // Update context state
                     // Optionally trigger profile load immediately, though context effect should handle it
                     // await loadUserProfileData(data.token);
                    toast.success("Login Successful!");
                    navigate('/'); // Navigate after successful login/signup and state update
                } else if (state === 'Sign Up') {
                     // For sign up, we might need to log in again or load profile separately
                     // For simplicity, let's prompt login or automatically log in if backend supports it
                     toast.success("Registration Successful! Please Login.");
                     setState('Login'); // Switch to login view after signup
                     // Clear fields for login form
                     // setName(''); setEmail(''); setPassword('');
                     // Alternatively, if register endpoint also returns userId:
                     // if(data.userId) { localStorage.setItem('userId', data.userId); setUserId(data.userId); }
                } else {
                    // Handle case where login succeeded but userId wasn't returned (shouldn't happen with backend fix)
                    console.warn("Login successful but userId missing from response.");
                     toast.warn("Login partially successful. User info might be incomplete.");
                     // Try loading profile to get ID as fallback
                     await loadUserProfileData(data.token);
                     navigate('/');
                }

            } else {
                toast.error(data.message || "An error occurred.");
            }
        } catch (error) {
            console.error(`Error during ${state}:`, error);
            toast.error(error.response?.data?.message || "Operation failed. Please try again.");
        } finally {
            setLoading(false); // Stop loading
        }
    };

    // Redirect if already logged in
    useEffect(() => {
        if (token) {
            navigate('/');
        }
    }, [token, navigate]);

    return (
        <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
            <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg'>
                <p className='text-2xl font-semibold'>{state === 'Sign Up' ? 'Create Account' : 'Login'}</p>
                <p>Please {state === 'Sign Up' ? 'sign up' : 'log in'} to book appointment</p>
                {state === 'Sign Up' && ( // Use conditional rendering shorthand
                    <div className='w-full '>
                        <p>Full Name</p>
                        <input onChange={(e) => setName(e.target.value)} value={name} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="text" required />
                    </div>
                )}
                <div className='w-full '>
                    <p>Email</p>
                    <input onChange={(e) => setEmail(e.target.value)} value={email} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="email" required />
                </div>
                <div className='w-full '>
                    <p>Password</p>
                    <input onChange={(e) => setPassword(e.target.value)} value={password} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="password" required />
                </div>
                <button type="submit" disabled={loading} className='bg-primary text-white w-full py-2 my-2 rounded-md text-base disabled:bg-gray-400'>
                    {loading ? 'Processing...' : (state === 'Sign Up' ? 'Create account' : 'Login')}
                </button>
                {state === 'Sign Up'
                    ? <p>Already have an account? <span onClick={() => !loading && setState('Login')} className={`text-primary underline ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>Login here</span></p>
                    : <p>Create a new account? <span onClick={() => !loading && setState('Sign Up')} className={`text-primary underline ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>Click here</span></p>
                }
            </div>
        </form>
    );
};

export default Login;