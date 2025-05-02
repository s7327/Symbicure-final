import React, { useContext, useState } from 'react';
import { assets } from '../assets/assets'; // Ensure this path is correct
import { NavLink, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';

const Navbar = () => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const { token, setToken, userData } = useContext(AppContext); // userData might be null initially even if token exists

    const defaultProfileIcon = assets.default_avatar; // Using the correct default avatar

    const logout = () => {
        // ... (keep existing logout function) ...
        console.log('Logout function called');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        setToken('');
        toast.success("Logged out successfully");
        navigate('/login');
    };

    const handleNavigateProfile = () => { navigate('/my-profile'); };
    const handleNavigateAppointments = () => { navigate('/my-appointments'); };

    return (
        <div className='flex items-center justify-between text-sm py-4 mb-5 border-b border-gray-300'>
            {/* ... Logo ... */}
            <img onClick={() => navigate('/')} className='w-44 cursor-pointer' src={assets.logo} alt="Symbicure Logo" />

            {/* ... Desktop Menu NavLinks ... */}
             <ul className='md:flex items-center gap-5 font-medium hidden'>
                 <NavLink to='/' className={({ isActive }) => `py-1 hover:text-primary ${isActive ? "text-primary font-semibold" : "text-gray-600"}`}>HOME</NavLink>
                 <NavLink to='/doctors' className={({ isActive }) => `py-1 hover:text-primary ${isActive ? "text-primary font-semibold" : "text-gray-600"}`} data-tour-id="navbar-all-doctors">ALL DOCTORS</NavLink>
                 <NavLink to='/about' className={({ isActive }) => `py-1 hover:text-primary ${isActive ? "text-primary font-semibold" : "text-gray-600"}`}>ABOUT</NavLink>
                 <NavLink to='/NearbyDoctors' className={({ isActive }) => `py-1 hover:text-primary ${isActive ? "text-primary font-semibold" : "text-gray-600"}`} data-tour-id="navbar-nearby-doctors">NEARBY DOCTORS</NavLink>
                 <NavLink to='/contact' className={({ isActive }) => `py-1 hover:text-primary ${isActive ? "text-primary font-semibold" : "text-gray-600"}`}>CONTACT</NavLink>
                 <NavLink to='/analyzer' className={({ isActive }) => `py-1 hover:text-primary ${isActive ? "text-primary font-semibold" : "text-gray-600"}`} data-tour-id="navbar-ai-analyzer">AI ANALYZER</NavLink>
             </ul>


            {/* --- MODIFIED Right Section Logic --- */}
            <div className='flex items-center gap-4'>
                {!token ? (
                    // --- Condition 1: No Token -> Show Login Button ---
                    <button onClick={() => navigate('/login')} className='bg-primary text-white px-5 py-2 rounded-full font-medium text-sm hover:bg-blue-700 transition-colors hidden md:block'>
                        Login / Sign Up
                    </button>
                ) : !userData ? (
                    // --- Condition 2: Token exists, BUT userData is not yet loaded -> Show Placeholder/Loading ---
                    <div className='flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 animate-pulse'>
                        {/* Optional: Add a small spinner icon here if you have one */}
                    </div>
                ) : (
                    // --- Condition 3: Token AND userData exist -> Show Profile Dropdown ---
                    <div className='relative group' data-tour-id="navbar-user-dropdown">
                        {/* Trigger Element */}
                        <div className='flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-gray-100'>
                            <img
                                className='w-8 h-8 rounded-full object-cover bg-gray-200 border border-gray-300'
                                src={userData.image || defaultProfileIcon}
                                alt="User Profile"
                                onError={(e) => { e.target.onerror = null; e.target.src = defaultProfileIcon; }}
                            />
                            <img className='w-2.5 h-2.5' src={assets.dropdown_icon} alt="Dropdown" />
                        </div>
                        {/* Dropdown Menu */}
                        <div className='absolute top-full right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-30 hidden group-hover:block focus-within:block'>
                            <div className='py-1'>
                                <p onClick={handleNavigateProfile} className='block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-primary cursor-pointer' data-tour-id="navbar-my-profile">
                                    My Profile
                                </p>
                                <p onClick={handleNavigateAppointments} className='block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-primary cursor-pointer' data-tour-id="navbar-my-appointments">
                                    My Appointments
                                </p>
                                <hr className="border-gray-200 my-1" />
                                <p onClick={logout} className='block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer'>
                                    Logout
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {/* --- End MODIFIED Logic --- */}

                {/* Mobile Menu Icon */}
                <img onClick={() => setShowMenu(true)} className='w-6 md:hidden cursor-pointer' src={assets.menu_icon} alt="Menu" />

                 {/* --- Mobile Menu Code (Needs similar logic adjustment) --- */}
                <div className={`md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${showMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowMenu(false)}></div>
                <div className={`md:hidden fixed right-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50 transition-transform transform ${showMenu ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className='flex items-center justify-between px-5 py-4 border-b border-gray-200'>
                        <img src={assets.logo} className='w-32' alt="Symbicure Logo" />
                        <img onClick={() => setShowMenu(false)} src={assets.cross_icon} className='w-5 cursor-pointer' alt="Close Menu" />
                    </div>
                    <ul className='flex flex-col gap-1 mt-4 px-3 text-base font-medium'>
                        {/* ... mobile NavLinks ... */}
                         <NavLink onClick={() => setShowMenu(false)} to='/' className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? "bg-blue-100 text-primary" : "hover:bg-gray-100"}`}>HOME</NavLink>
                         <NavLink onClick={() => setShowMenu(false)} to='/doctors' className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? "bg-blue-100 text-primary" : "hover:bg-gray-100"}`}>ALL DOCTORS</NavLink>
                         <NavLink onClick={() => setShowMenu(false)} to='/about' className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? "bg-blue-100 text-primary" : "hover:bg-gray-100"}`}>ABOUT</NavLink>
                         <NavLink onClick={() => setShowMenu(false)} to='/NearbyDoctors' className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? "bg-blue-100 text-primary" : "hover:bg-gray-100"}`}>NEARBY DOCTORS</NavLink>
                         <NavLink onClick={() => setShowMenu(false)} to='/contact' className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? "bg-blue-100 text-primary" : "hover:bg-gray-100"}`}>CONTACT</NavLink>
                         <NavLink onClick={() => setShowMenu(false)} to='/analyzer' className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? "bg-blue-100 text-primary" : "hover:bg-gray-100"}`}>AI ANALYZER</NavLink>
                        <hr className="border-gray-200 my-2" />
                        {/* Mobile Auth Section */}
                        {!token ? (
                             <button onClick={() => { setShowMenu(false); navigate('/login'); }} className='w-full text-left bg-primary text-white px-3 py-2 rounded mt-2 hover:bg-blue-700 transition-colors'>
                               Login / Sign Up
                             </button>
                         ) : !userData ? (
                             // Mobile Loading Placeholder
                             <div className='px-3 py-2 text-gray-400'>Loading...</div>
                         ) : (
                             // Mobile Logged In Links
                             <>
                                 <NavLink onClick={() => setShowMenu(false)} to='/my-profile' className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? "bg-blue-100 text-primary" : "hover:bg-gray-100"}`}>My Profile</NavLink>
                                 <NavLink onClick={() => setShowMenu(false)} to='/my-appointments' className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? "bg-blue-100 text-primary" : "hover:bg-gray-100"}`}>My Appointments</NavLink>
                                  <button onClick={() => { logout(); setShowMenu(false); }} className='w-full text-left px-3 py-2 rounded mt-2 text-red-600 hover:bg-red-50'>
                                    Logout
                                  </button>
                             </>
                         )}
                    </ul>
                </div>
                {/* --- End Mobile Menu --- */}
            </div>
        </div>
    );
};

export default Navbar;