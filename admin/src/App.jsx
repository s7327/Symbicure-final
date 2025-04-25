import React, { useContext } from 'react';
import { DoctorContext } from './context/DoctorContext';
import { AdminContext } from './context/AdminContext';
import { Route, Routes, Navigate } from 'react-router-dom'; // Import Navigate
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Admin/Dashboard';
import AllAppointments from './pages/Admin/AllAppointments';
import AddDoctor from './pages/Admin/AddDoctor';
import DoctorsList from './pages/Admin/DoctorsList';
import Login from './pages/Login';
import DoctorAppointments from './pages/Doctor/DoctorAppointments';
import DoctorDashboard from './pages/Doctor/DoctorDashboard';
import DoctorProfile from './pages/Doctor/DoctorProfile';
import DoctorChat from './pages/Doctor/DoctorChat'; // <-- Import DoctorChat

const App = () => {
    const { dToken } = useContext(DoctorContext);
    const { aToken } = useContext(AdminContext);
    const isAuthenticated = dToken || aToken; // Check if either token exists

    return (
        <div className={`app-container ${isAuthenticated ? 'bg-[#F8F9FD]' : ''}`}> {/* Conditional class */}
            <ToastContainer position="top-right" autoClose={3000} />
            {isAuthenticated ? (
                <>
                    <Navbar />
                    <div className='flex items-start min-h-screen'> {/* Ensure min height */}
                        <Sidebar />
                        {/* Main content area */}
                        <main className="flex-grow p-4 md:p-6 lg:p-8"> {/* Added padding */}
                            <Routes>
                                {/* Redirect base path based on role */}
                                <Route path='/' element={dToken ? <Navigate to="/doctor-dashboard" /> : <Navigate to="/admin-dashboard" />} />

                                {/* Admin Routes */}
                                <Route path='/admin-dashboard' element={aToken ? <Dashboard /> : <Navigate to="/" />} />
                                <Route path='/all-appointments' element={aToken ? <AllAppointments /> : <Navigate to="/" />} />
                                <Route path='/add-doctor' element={aToken ? <AddDoctor /> : <Navigate to="/" />} />
                                <Route path='/doctor-list' element={aToken ? <DoctorsList /> : <Navigate to="/" />} />

                                {/* Doctor Routes */}
                                <Route path='/doctor-dashboard' element={dToken ? <DoctorDashboard /> : <Navigate to="/" />} />
                                <Route path='/doctor-appointments' element={dToken ? <DoctorAppointments /> : <Navigate to="/" />} />
                                <Route path='/doctor-profile' element={dToken ? <DoctorProfile /> : <Navigate to="/" />} />

                                {/* --- DOCTOR CHAT ROUTE --- */}
                                <Route path='/doctor/chat/:appointmentId' element={dToken ? <DoctorChat /> : <Navigate to="/" />} />

                                {/* Optional: Catch-all for unknown routes */}
                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </main>
                    </div>
                </>
            ) : (
                // Render only Login component if not authenticated
                <Login />
            )}
        </div>
    );
};

export default App;