import React, { useContext, useEffect } from 'react'; // Added useEffect
import Navbar from './components/Navbar';
import { Routes, Route, useLocation } from 'react-router-dom'; // Added useLocation
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
import Chat from './pages/Chat.jsx'; // Assuming Chat.jsx is correct

// --- Joyride Imports ---
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride'; // Added ACTIONS, EVENTS
import { tourSteps } from './config/tourSteps'; // Ensure this path is correct
import { AppContext } from './context/AppContext';
// --- End Joyride Imports ---

const App = () => {
  // --- Get context values ---
  const { token, userData, completeTour } = useContext(AppContext); // Removed loadUserProfileData if not used here
  const location = useLocation(); // Get current location

  // --- Joyride State ---
  const [runTour, setRunTour] = React.useState(false);

  // --- Effect to Start Tour on Login/Data Load ---
   useEffect(() => {
       // Check if user is logged in, data is loaded, and tour hasn't been completed
       if (token && userData && !userData.hasCompletedTour) {
           console.log("Conditions met: Starting Joyride tour.");
           // Small delay ensures the page elements (targets) are likely rendered
           const timer = setTimeout(() => {
               setRunTour(true);
           }, 500); // Adjust delay if needed
           return () => clearTimeout(timer); // Cleanup timer on unmount/re-run
       } else {
           // Ensure tour isn't running if conditions aren't met
           setRunTour(false);
       }
   }, [token, userData]); // Re-run when token or userData changes


  // --- Joyride Callback Handler ---
  const handleJoyrideCallback = (data) => {
    const { status, type, action } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      // Tour finished or skipped
      console.log("Joyride finished or skipped, status:", status);
      setRunTour(false); // Stop the tour in local state
      completeTour(); // Call context function to update backend/context state
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
       // Log other events for debugging if needed
       console.log(`Joyride event: ${type}, Action: ${action}`, data);
    }
  };
  // --- End Joyride Callback ---

  return (
    <div className='mx-4 sm:mx-[10%]'>
      {/* --- Joyride Component with Blue Tooltip Styles --- */}
      <Joyride
        steps={tourSteps}
        run={runTour} // Control run state locally
        continuous={true} // Go to next step when user clicks outside target
        showProgress={true} // Show step number (e.g., 2/5)
        showSkipButton={true} // Allow user to skip tour
        callback={handleJoyrideCallback} // Handle finish/skip events
        // scrollToFirstStep={true} // Optional: Scroll view to the first step
        // disableOverlayClose={true} // Optional: Prevent closing by clicking overlay
        // --- STYLES APPLIED HERE ---
        styles={{
          options: {
            zIndex: 10000,            // Ensure it's above other elements
            // Overlay background (dimmed area) - make it semi-transparent black
            overlayColor: 'rgba(0, 0, 0, 0.6)',
            // --- Tooltip Colors ---
            primaryColor: '#3B82F6',  // Primary color used for beacon/focus ring (blue-500)
            arrowColor: '#2563EB',    // Arrow matches the blue tooltip background (blue-600)
            backgroundColor: '#2563EB',// Background of the tooltip box (blue-600)
            textColor: '#FFFFFF',     // Default text color inside tooltip (white)
          },
          // Style the main tooltip container
          tooltip: {
            backgroundColor: '#2563EB', // Explicitly set tooltip box background
            borderRadius: '8px',
            padding: '1rem 1.25rem',   // Tailwind's p-4/p-5 equivalent
            color: '#FFFFFF',         // Ensure text color is white
            fontSize: '0.9rem',       // Slightly smaller font size
            textAlign: 'left',
          },
          // Style the different parts within the tooltip
          tooltipContainer: {
              textAlign: 'left', // Keep content left-aligned
          },
          tooltipTitle: {
             color: '#FFFFFF',
             fontWeight: 'bold',
             margin: '0 0 0.75rem 0', // Add bottom margin
             fontSize: '1.1rem',
             borderBottom: '1px solid rgba(255, 255, 255, 0.2)', // Optional separator line
             paddingBottom: '0.5rem',
          },
          tooltipContent: {
              color: '#E5E7EB', // Light gray/off-white text (gray-200)
              padding: '0.25rem 0',
              lineHeight: '1.5',
          },
          // Style the buttons for contrast on the blue background
          buttonNext: {
            backgroundColor: '#FFFFFF', // White button background
            color: '#1D4ED8',         // Dark blue text (blue-700)
            borderRadius: '20px',     // Pill shape
            padding: '0.5rem 1rem',   // Tailwind's py-2 px-4 equivalent
            fontWeight: '600',        // Semibold
            fontSize: '0.875rem',     // Text-sm
          },
          buttonBack: {
            color: '#D1D5DB',         // Light gray text (gray-300)
            marginLeft: 'auto',       // Push to left within footer
            marginRight: '0.5rem',    // Space before next button
            fontSize: '0.875rem',
          },
          buttonSkip: {
            color: '#FBBF24',         // Amber/Yellow color for Skip (amber-400)
            fontSize: '0.875rem',
          },
          buttonClose: {
             color: '#FFFFFF',         // White 'X' close button
             // Defaults usually look okay, adjust positioning if needed
             // height: '14px',
             // width: '14px',
             // top: '15px',
             // right: '15px',
          },
          // Style the progress indicator (e.g., "2 / 5")
          progress: {
              color: '#A5B4FC', // Lighter blue text (indigo-300)
              fontSize: '0.8rem',
          },
        }}
        // --- END OF STYLES PROP ---
      />
      {/* --- End Joyride Component --- */}

      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />
      <Navbar /> {/* Ensure Navbar has necessary data-tour-id attributes */}
      <HealthcareBot /> {/* Ensure Chatbot has necessary data-tour-id attributes */}
      <Routes>
        {/* Ensure elements *inside* these pages have necessary data-tour-id attributes */}
        <Route path='/' element={<Home />} />
        <Route path='/doctors' element={<Doctors />} />
        <Route path='/doctors/:speciality' element={<Doctors />} />
        <Route path='/login' element={<Login />} />
        <Route path='/about' element={<About />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/NearbyDoctors' element={<DoctorForm />} />
        <Route path='/search-results' element={<SearchResults />} />
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