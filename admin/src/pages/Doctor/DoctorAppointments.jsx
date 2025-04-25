import React, { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom'; // <-- Import Link
import { DoctorContext } from '../../context/DoctorContext';
import { AppContext } from '../../context/AppContext'; // For formatting functions
import { assets } from '../../assets/assets'; // Assuming assets holds your icons

const DoctorAppointments = () => {
    // Ensure dToken is included if API calls within context need it implicitly
    const { dToken, appointments, getAppointments, cancelAppointment, completeAppointment } = useContext(DoctorContext);
    const { slotDateFormat, calculateAge, currency } = useContext(AppContext);

    useEffect(() => {
        // Fetch appointments when component mounts or token changes
        if (dToken) {
            getAppointments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dToken]); // Dependency array includes dToken

    return (
        <div className='w-full max-w-6xl m-5'> {/* Consider full width/height layout */}
            <p className='mb-3 text-lg font-medium'>My Appointments</p>

            {/* Add loading state indicator */}
            {/* {loading && <p>Loading appointments...</p>} */}

            <div className='bg-white border rounded text-sm max-h-[calc(100vh-150px)] overflow-y-scroll shadow-sm scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'> {/* Adjusted height */}
                {/* Table Header */}
                <div className='sticky top-0 bg-gray-50 grid grid-cols-[0.5fr_2fr_1fr_1fr_2fr_1fr_1.5fr] gap-1 py-3 px-6 border-b max-sm:hidden'> {/* Adjusted grid cols */}
                    <p className='font-semibold text-gray-600'>#</p>
                    <p className='font-semibold text-gray-600'>Patient</p>
                    <p className='font-semibold text-gray-600'>Payment</p>
                    <p className='font-semibold text-gray-600'>Age</p>
                    <p className='font-semibold text-gray-600'>Date & Time</p>
                    <p className='font-semibold text-gray-600'>Fees</p>
                    <p className='font-semibold text-gray-600 text-center'>Action</p> {/* Centered Action */}
                </div>

                {/* Table Body */}
                {appointments && appointments.length > 0 ? (
                    appointments.map((item, index) => (
                        <div className='grid grid-cols-[0.5fr_2fr_1fr_1fr_2fr_1fr_1.5fr] gap-1 items-center text-gray-600 py-3 px-6 border-b hover:bg-gray-50 max-sm:flex max-sm:flex-col max-sm:items-start max-sm:p-4 max-sm:gap-2' key={item._id || index}> {/* Use _id for key */}
                            <p className='max-sm:hidden'>{index + 1}</p> {/* Start count from 1 */}
                            {/* Patient Info */}
                            <div className='flex items-center gap-2'>
                                <img src={item.userData?.image || assets.profile_icon} className='w-8 h-8 rounded-full object-cover' alt="" />
                                <p className='font-medium text-gray-800'>{item.userData?.name || 'N/A'}</p>
                            </div>
                             {/* Payment Status */}
                             <div>
                                 <p className={`text-xs inline-block px-2 py-0.5 rounded-full border ${item.payment ? 'border-green-400 text-green-600 bg-green-50' : 'border-orange-400 text-orange-600 bg-orange-50'}`}>
                                     {item.payment ? 'Paid Online' : 'CASH'}
                                 </p>
                             </div>
                             {/* Age */}
                             <p>{item.userData?.dob ? calculateAge(item.userData.dob) : 'N/A'}</p>
                             {/* Date & Time */}
                            <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
                            {/* Fees */}
                            <p>{currency}{item.amount}</p>
                            {/* Action Buttons & Chat Link */}
                            <div className='flex items-center justify-center gap-1 max-sm:w-full max-sm:justify-start'> {/* Centered actions */}
                                {item.cancelled ? (
                                    <p className='text-red-500 text-xs font-semibold px-2 py-1 bg-red-50 rounded'>Cancelled</p>
                                ) : item.isCompleted ? (
                                    <p className='text-green-600 text-xs font-semibold px-2 py-1 bg-green-50 rounded'>Completed</p>
                                ) : (
                                    <>
                                        {/* Cancel Button */}
                                        <button onClick={() => cancelAppointment(item._id)} title="Cancel Appointment" className="p-1.5 hover:bg-red-100 rounded-full">
                                            <img className='w-5 h-5' src={assets.cancel_icon} alt="Cancel" />
                                        </button>
                                        {/* Complete Button */}
                                        <button onClick={() => completeAppointment(item._id)} title="Mark as Completed" className="p-1.5 hover:bg-green-100 rounded-full">
                                            <img className='w-5 h-5' src={assets.tick_icon} alt="Complete" />
                                        </button>
                                    </>
                                )}
                                {/* --- CHAT LINK --- */}
                                {/* Show chat link maybe always, or only for active/paid appointments? */}
                                {!item.cancelled && ( // Example: Show if not cancelled
                                    <Link
                                        to={`/doctor/chat/${item._id}`} // Route to doctor chat
                                        title="Chat with Patient"
                                        className="p-1.5 hover:bg-blue-100 rounded-full ml-1" // Added margin
                                    >
                                        {/* Use a chat icon from your assets */}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                         </svg>
                                     </Link>
                                 )}
                                 {/* --- END CHAT LINK --- */}
                             </div>
                         </div>
                     ))
                 ) : (
                     // Message when no appointments found
                     <p className='text-center text-gray-500 py-10'>No appointments found.</p>
                 )}
             </div>
         </div>
     );
 };

 export default DoctorAppointments;