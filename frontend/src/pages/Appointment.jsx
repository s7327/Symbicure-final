import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { assets } from '../assets/assets';
import RelatedDoctors from '../components/RelatedDoctors'; // Assuming this component exists and works
import axios from 'axios';
import { toast } from 'react-toastify';

const Appointment = () => {
    const { docId } = useParams();
    // Ensure getDoctosData is retrieved if you call it after booking
    const { doctors, currencySymbol, backendUrl, token, getDoctosData } = useContext(AppContext);
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const [docInfo, setDocInfo] = useState(null); // Initialize as null
    const [docSlots, setDocSlots] = useState([]); // Available slots grouped by day
    const [slotIndex, setSlotIndex] = useState(0); // Index of the selected day (0-6)
    const [selectedTime, setSelectedTime] = useState(''); // The selected time string (e.g., "10:30 AM")
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [bookingInProgress, setBookingInProgress] = useState(false);

    const navigate = useNavigate();

    // Effect to find the specific doctor's info when doctors list or docId changes
    useEffect(() => {
        if (doctors.length > 0 && docId) {
            const foundDoc = doctors.find((doc) => doc._id === docId);
            if (foundDoc) {
                setDocInfo(foundDoc);
                 // Reset selections when doctor changes
                 setSlotIndex(0);
                 setSelectedTime('');
                 setDocSlots([]); // Clear old slots before recalculating
            } else {
                 toast.error("Doctor not found.");
                 setDocInfo(null); // Reset if doctor not found
                 // Optionally navigate back or show an error message
                 // navigate('/doctors');
            }
        }
    }, [doctors, docId]);

    // Effect to calculate available slots when docInfo is set
    useEffect(() => {
        // Function to calculate slots
        const getAvailableSlots = () => {
            if (!docInfo || !docInfo.slots_booked) {
                console.log("Doctor info or slots_booked not available yet.");
                return; // Exit if docInfo or slots_booked isn't ready
            }

            setLoadingSlots(true);
            const calculatedSlots = [];
            const today = new Date();

            for (let i = 0; i < 7; i++) {
                const currentDate = new Date(today);
                currentDate.setDate(today.getDate() + i);
                currentDate.setSeconds(0, 0); // Reset seconds/ms

                const endTime = new Date(currentDate);
                endTime.setHours(21, 0, 0, 0); // End time 9:00 PM

                // Adjust start time
                if (i === 0) { // If it's today
                     const now = new Date();
                     // Start from next hour or 10 AM, whichever is later
                     const startHour = Math.max(10, now.getHours() + 1);
                     currentDate.setHours(startHour, 0, 0, 0); // Start on the hour
                } else {
                    currentDate.setHours(10, 0, 0, 0); // Start at 10:00 AM for future days
                }


                const timeSlotsForDay = [];
                const day = currentDate.getDate();
                const month = currentDate.getMonth() + 1; // Use 1-12 month format for key check
                const year = currentDate.getFullYear();
                // Format for checking against backend keys
                const backendSlotDateKey = `${day}_${month}_${year}`;
                const bookedTimesForDate = docInfo.slots_booked[backendSlotDateKey] || []; // Get booked times or empty array

                // console.log(`Checking slots for ${backendSlotDateKey}. Booked:`, bookedTimesForDate);


                while (currentDate < endTime) {
                    // Format time for display AND for checking against backend array
                    // Ensure this format EXACTLY matches what's stored in slots_booked array on backend
                    const formattedTime = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); // e.g., "10:00 AM"

                    // Check if this formatted time is in the booked list for the date
                    const isBooked = bookedTimesForDate.includes(formattedTime);

                    if (!isBooked) {
                        // Add available slot
                        timeSlotsForDay.push({
                            datetime: new Date(currentDate), // Store full Date object for reference
                            time: formattedTime // Store the formatted time string
                        });
                    } else {
                        // console.log(`Slot ${formattedTime} on ${backendSlotDateKey} is booked.`);
                    }

                    // Increment time by 30 minutes for the next loop iteration
                    currentDate.setMinutes(currentDate.getMinutes() + 30);
                }

                // Only add the day if there are available slots
                if (timeSlotsForDay.length > 0) {
                    calculatedSlots.push(timeSlotsForDay);
                } else {
                     // Optionally add an empty array or a placeholder if you want to show days with no slots
                     // calculatedSlots.push([]); // Or handle this in rendering
                }
            }
            setDocSlots(calculatedSlots);
            setLoadingSlots(false);
        };

        // Only run calculation if docInfo is available
        if (docInfo) {
            getAvailableSlots();
        }

    }, [docInfo]); // Rerun only when docInfo changes


    // Function to handle booking the selected appointment
    const bookAppointment = async () => {
        if (!token) {
            toast.warning('Please log in to book an appointment.');
            return navigate('/login');
        }

        // Validate that a time slot is selected
        if (!selectedTime) {
            toast.warning('Please select a time slot.');
            return;
        }

         // Validate that the selected day has slots (shouldn't happen if UI is correct, but good check)
         if (!docSlots[slotIndex] || docSlots[slotIndex].length === 0) {
             toast.error('No slots available for the selected day.');
             return;
         }

        // Find the Date object corresponding to the selected day index (use the first slot's datetime)
        // We need this only to extract the correct date components for the backend key
        const selectedDateObject = docSlots[slotIndex][0].datetime;

        const day = selectedDateObject.getDate();
        // --- FIX: Add +1 to getMonth() ---
        const month = selectedDateObject.getMonth() + 1; // Use 1-12 format
        // --- END FIX ---
        const year = selectedDateObject.getFullYear();

        // Construct the date key string in the format expected by the backend (e.g., "5_7_2024")
        const slotDateToSend = `${day}_${month}_${year}`;
        // The time string is already stored correctly in selectedTime state (e.g., "10:30 AM")

        console.log("Attempting to book:", { docId, slotDate: slotDateToSend, slotTime: selectedTime }); // Log data being sent

        setBookingInProgress(true);
        try {
            const { data } = await axios.post(
                `${backendUrl}/api/user/book-appointment`,
                { docId, slotDate: slotDateToSend, slotTime: selectedTime }, // Send corrected date and selected time
                { headers: { token } }
            );

            if (data.success) {
                toast.success(data.message || "Appointment booked successfully!");
                // Optional: Refresh doctor data immediately if needed, otherwise rely on navigation
                // await getDoctosData(); // Refresh full doctor list (might be slow)
                navigate('/my-appointments'); // Navigate to appointments page
            } else {
                // Handle specific errors from backend if available
                toast.error(data.message || "Failed to book appointment.");
            }

        } catch (error) {
            console.error("Booking Error:", error.response || error);
            toast.error(error.response?.data?.message || "An error occurred during booking.");
        } finally {
            setBookingInProgress(false);
        }
    };

    // Render loading state or message if doctor info isn't loaded yet
    if (!docInfo) {
        // Check if doctors list itself is still loading
        if (doctors.length === 0) {
             return <div className='text-center my-20 text-gray-500'>Loading doctor data...</div>;
        }
        // If doctors are loaded but specific doc not found
        return <div className='text-center my-20 text-red-500'>Doctor information not available.</div>;
    }

    // Main component render
    return (
        <div className="my-8">

            {/* ---------- Doctor Details ----------- */}
            <div className='flex flex-col sm:flex-row gap-6 mb-10'> {/* Increased gap */}
                <div className='flex-shrink-0 w-full sm:w-64 md:w-72'> {/* Fixed width for image container */}
                    <img
                        className='w-full h-auto rounded-lg object-cover bg-gray-100 border'
                        src={docInfo.image || assets.default_avatar} // Add fallback
                        alt={`Dr. ${docInfo.name}`}
                        onError={(e) => { e.target.onerror = null; e.target.src = assets.default_avatar;}}
                    />
                </div>

                {/* Changed structure slightly for better alignment */}
                <div className='flex-1 space-y-4'>
                    <div className='flex items-center gap-2'>
                        <h1 className='text-3xl font-semibold text-gray-800'>{docInfo.name}</h1>
                        <img className='w-5 h-5' src={assets.verified_icon} alt="Verified" />
                    </div>
                    <div className='flex items-center gap-3 text-sm text-gray-600'>
                        <p>{docInfo.degree} - <span className="font-medium text-primary">{docInfo.speciality}</span></p>
                        {docInfo.experience && <span className='py-0.5 px-2 border text-xs rounded-full bg-gray-100'>{docInfo.experience} Exp.</span>}
                    </div>
                    <div>
                        <h2 className='flex items-center gap-1 text-sm font-medium text-gray-700 mb-1'>
                           About <img className='w-3 h-3' src={assets.info_icon} alt="info" />
                        </h2>
                        <p className='text-sm text-gray-600 leading-relaxed'>{docInfo.about || 'No additional information available.'}</p>
                    </div>
                    <p className='text-base font-medium text-gray-700 pt-2'>
                        Appointment Fee: <span className='text-lg font-semibold text-gray-900'>{currencySymbol}{docInfo.fees}</span>
                    </p>
                </div>
            </div>

            {/* ---------- Booking Slots ---------- */}
            <div className='mt-8 border-t pt-6'>
                <h2 className='text-xl font-semibold text-gray-700 mb-4'>Select Appointment Slot</h2>

                {/* Date Selection */}
                <div className='flex gap-3 items-center w-full overflow-x-auto pb-4 mb-4'>
                    {loadingSlots && <p className="text-gray-500">Loading slots...</p>}
                    {!loadingSlots && docSlots.length === 0 && <p className="text-gray-500">No available slots found for the next 7 days.</p>}
                    {!loadingSlots && docSlots.map((daySlots, index) => (
                         // Ensure daySlots[0] exists before accessing its datetime
                         daySlots && daySlots.length > 0 && daySlots[0].datetime ? (
                            <button
                                onClick={() => { setSlotIndex(index); setSelectedTime(''); }} // Reset time selection when day changes
                                key={index}
                                className={`text-center py-3 px-4 min-w-[60px] rounded-lg cursor-pointer transition-colors duration-200 ${slotIndex === index ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                            >
                                <p className="text-xs font-medium">{daysOfWeek[daySlots[0].datetime.getDay()]}</p>
                                <p className="text-lg font-bold">{daySlots[0].datetime.getDate()}</p>
                            </button>
                         ) : null // Don't render button if day has no slots or data is missing
                    ))}
                </div>

                {/* Time Selection */}
                 {/* Show time slots only if a valid day is selected and slots exist */}
                 {!loadingSlots && docSlots[slotIndex] && docSlots[slotIndex].length > 0 && (
                     <div className='flex flex-wrap items-center gap-3 mt-4'>
                         <h3 className="w-full text-sm font-medium text-gray-600 mb-1">Available Times:</h3>
                         {docSlots[slotIndex].map((slot, timeIdx) => (
                             <button
                                 onClick={() => setSelectedTime(slot.time)}
                                 key={timeIdx}
                                 className={`text-sm flex-shrink-0 px-4 py-1.5 rounded-full cursor-pointer border transition-colors duration-200 ${slot.time === selectedTime ? 'bg-primary text-white border-primary font-semibold' : 'text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                             >
                                 {/* Display time without .toLowerCase() unless intended */}
                                 {slot.time}
                             </button>
                         ))}
                     </div>
                 )}

                {/* Booking Button */}
                <div className="mt-8">
                    <button
                        onClick={bookAppointment}
                        disabled={!selectedTime || bookingInProgress} // Disable if no time selected or booking is happening
                        className='bg-primary text-white text-base font-medium px-10 py-3 rounded-full hover:bg-blue-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                        {bookingInProgress ? 'Booking...' : `Book Appointment for ${currencySymbol}${docInfo.fees}`}
                    </button>
                </div>
            </div>

            {/* --- Related Doctors --- */}
            {/* Ensure this component handles potential undefined speciality */}
            {docInfo.speciality && <RelatedDoctors speciality={docInfo.speciality} docId={docId} />}

        </div>
    );
};

export default Appointment;