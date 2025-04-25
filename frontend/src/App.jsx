import React from 'react';
import Navbar from './components/Navbar';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Doctors from './pages/Doctors';
import Login from './pages/Login';
import About from './pages/About';
import Contact from './pages/Contact';
import Appointment from './pages/Appointment';
import MyAppointments from './pages/MyAppointments';
import MyProfile from './pages/MyProfile';
import Footer from './components/Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Verify from './pages/Verify';
import HealthcareBot from './components/Chatbot';
import DoctorForm from './pages/NearbyDoctors';
import SearchResults from './pages/SearchResults';
import AIHealthAnalyzer from './pages/AnalyseReport';
import Chat from './pages/Chat.jsx';

const App = () => {
  return (
    <div className='mx-4 sm:mx-[10%]'>
      <ToastContainer />
      <Navbar />
      <HealthcareBot />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/doctors' element={<Doctors />} />
        <Route path='/doctors/:speciality' element={<Doctors />} />
        <Route path='/login' element={<Login />} />
        <Route path='/about' element={<About />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/NearbyDoctors' element={<DoctorForm />} />
        <Route path='/search-results' element={<SearchResults />} />
        {/* REMOVED the duplicate route */}
        {/* <Route path="/chat/:appointmentId" element={<ChatWithDoctor />} /> */}

        {/* Use ONLY ONE route definition for this path */}
        <Route path="/chat/:appointmentId" element={<Chat />} />

        <Route path='/appointment/:docId' element={<Appointment />} />
        <Route path='/my-appointments' element={<MyAppointments />} />
        <Route path='/my-profile' element={<MyProfile />} />
        <Route path='/verify' element={<Verify />} />
        <Route path="/analyzer" element={<AIHealthAnalyzer />} />
      </Routes>
      <Footer />
    </div>
  );
};

export default App;