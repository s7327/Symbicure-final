import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext'; // Context import
import axios from 'axios';
import { toast } from 'react-toastify';
import { assets } from '../assets/assets'; // Assets for fallback images/icons

const MyAppointments = () => {
    // Destructure needed values from context (including currencySymbol)
    const { backendUrl, token, userId, currencySymbol } = useContext(AppContext);
    const navigate = useNavigate();

    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true); // Start in loading state
    const [paymentProcessing, setPaymentProcessing] = useState(null);
    const [cancelling, setCancelling] = useState(null);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Format date string like 'dd_mm_yyyy' to 'dd Mon yyyy'
    const slotDateFormat = (slotDate) => {
        if (!slotDate || typeof slotDate !== 'string') return 'Invalid Date';
        const parts = slotDate.split('_');
        if (parts.length !== 3) return 'Invalid Date Format';
        const day = parts[0];
        const monthIndex = Number(parts[1]) - 1; // Corrected index (0-11)
        const year = parts[2];
        if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return 'Invalid Month';
        return `${day} ${months[monthIndex]} ${year}`;
    };


    // Fetch user's appointments
    const getUserAppointments = async () => {
        if (!token || !backendUrl) { setLoading(false); setAppointments([]); return; }
        setLoading(true);
        try {
            const { data } = await axios.get(`${backendUrl}/api/user/appointments`, { headers: { token } });
            if (data.success) {
                const sortedAppointments = (data.appointments || []).sort((a, b) => {
                    if (a.cancelled !== b.cancelled) return a.cancelled ? 1 : -1;
                    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
                    return new Date(b.date) - new Date(a.date);
                });
                setAppointments(sortedAppointments);
            } else { toast.error(data.message || "Failed to fetch appointments."); setAppointments([]); }
        } catch (error) {
            console.error("Error fetching appointments:", error.response || error);
             if (error.response?.status === 401) { toast.error("Session expired. Please log in again."); }
             else { toast.error(error.response?.data?.message || "Error fetching appointments."); }
             setAppointments([]);
        } finally { setLoading(false); }
    };

    // Cancel an appointment
    const cancelAppointment = async (appointmentId) => {
        if (!token || !backendUrl) return;
        if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
        setCancelling(appointmentId);
        try {
            const { data } = await axios.post(`${backendUrl}/api/user/cancel-appointment`, { appointmentId }, { headers: { token } });
            if (data.success) { toast.success(data.message || "Appointment cancelled."); await getUserAppointments(); }
            else { toast.error(data.message || "Failed to cancel appointment."); }
        } catch (error) { console.error("Error cancelling appointment:", error.response || error); toast.error(error.response?.data?.message || "Error cancelling appointment."); }
        finally { setCancelling(null); }
    };

    // --- Payment Logic (Keep your actual implementation) ---
     const initPay = (order) => {
         console.log("Initializing Razorpay with order:", order);
          if (!window.Razorpay) { toast.error("Razorpay SDK not loaded."); setPaymentProcessing(null); return; }
          const options = { /* ... your options ... */ };
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response){ /* ... */ setPaymentProcessing(null); });
          rzp.open();
     };
     const appointmentRazorpay = async (appointmentId, amount, docName, userName, userEmail, userPhone) => {
         if (!token || !backendUrl) return;
         setPaymentProcessing(appointmentId);
         console.log("Initiating Razorpay for appointment:", appointmentId);
         try {
              const createOrderUrl = `${backendUrl}/api/user/payment-razorpay`;
              const { data } = await axios.post(createOrderUrl, { appointmentId, amount }, { headers: { token } });
              if (data.success && data.order) {
                 const orderWithOptions = { /* ... add notes ... */ };
                 initPay(orderWithOptions);
              } else { toast.error(data.message || "Failed to initiate payment."); setPaymentProcessing(null); }
         } catch (error) { console.error("Error initiating Razorpay payment:", error.response || error); toast.error(error.response?.data?.message || "Error initiating payment."); setPaymentProcessing(null); }
     };
     const appointmentStripe = async (appointmentId) => {
          if (!token || !backendUrl) return;
          setPaymentProcessing(appointmentId);
          console.log("Initiating Stripe for appointment:", appointmentId);
          try {
             const stripeSessionUrl = `${backendUrl}/api/user/payment-stripe`;
             const { data } = await axios.post(stripeSessionUrl, { appointmentId }, { headers: { token } });
             if (data.success && data.session_url) { window.location.replace(data.session_url); }
             else { toast.error(data.message || "Failed to initiate Stripe payment."); setPaymentProcessing(null); }
          } catch (error) { console.error("Error initiating Stripe payment:", error.response || error); toast.error(error.response?.data?.message || "Error initiating Stripe payment."); setPaymentProcessing(null); }
     };
    // --- End Payment Logic ---


    // Fetch appointments when component mounts or token changes
    useEffect(() => {
        if (token && backendUrl) { getUserAppointments(); }
        else { setLoading(false); setAppointments([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, backendUrl]);


    // --- Render Logic ---

    // 1. Show Loading state
    if (loading) { return <div className="text-center text-gray-500 my-20 text-lg">Loading your appointments...</div>; }
    // 2. Show Login prompt if not logged in
    if (!token) { return ( <div className="text-center text-gray-600 my-20 text-lg"> Please <Link to="/login" className="text-primary font-semibold underline hover:text-blue-700">log in</Link> to view your appointments. </div> ); }
    // 3. Show message if logged in but no appointments
    if (appointments.length === 0) { return <div className="text-center text-gray-500 my-20 text-lg">You have no appointments scheduled yet.</div>; }

    // 4. Render the list of appointments
    return (
        <div className='my-12 min-h-[60vh]'>
            <p className='pb-3 text-2xl font-semibold text-gray-800 border-b border-gray-300 mb-8'>My Appointments</p>

            <div className='space-y-6'>
                {appointments.map((item, index) => (
                    <div key={item._id || index} className='grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-5 p-5 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow duration-200'>
                        {/* Doctor Image */}
                        <div className='flex justify-center md:justify-start items-center'>
                            <img
                                className='w-28 h-28 md:w-32 md:h-32 rounded-full object-cover bg-gray-100 border'
                                src={item.docData?.image || assets.default_avatar}
                                alt={`Dr. ${item.docData?.name || 'N/A'}`}
                                onError={(e) => { e.target.onerror = null; e.target.src = assets.default_avatar;}}
                            />
                        </div>

                        {/* Appointment Details */}
                        <div className='text-sm text-gray-600 space-y-1.5'>
                             <p className='text-gray-800 text-xl font-semibold'>Dr. {item.docData?.name || 'N/A'}</p>
                             <p className='text-primary font-medium'>{item.docData?.speciality || 'N/A'}</p>
                            {item.docData?.address && (
                                <div className='mt-1'>
                                    <p className='text-gray-700 font-medium'>Address:</p>
                                    <p>{item.docData.address.line1}</p>
                                    {item.docData.address.line2 && <p>{item.docData.address.line2}</p>}
                                </div>
                             )}
                             <p className='pt-1'> <span className='font-medium text-gray-800'>Date & Time:</span> {slotDateFormat(item.slotDate)} | {item.slotTime || 'N/A'} </p>
                             <p> <span className='font-medium text-gray-800'>Fees:</span> <span className='ml-1 font-semibold text-gray-700'>{currencySymbol}{item.amount != null ? item.amount : 'N/A'}</span> </p>
                             <p> <span className='font-medium text-gray-800'>Status:</span> {item.cancelled ? <span className='text-red-600 font-semibold ml-1'>Cancelled</span> : item.isCompleted ? <span className='text-green-600 font-semibold ml-1'>Completed</span> : item.payment ? <span className='text-blue-600 font-semibold ml-1'>Confirmed (Paid)</span> : <span className='text-yellow-600 font-semibold ml-1'>Pending Payment</span>} </p>
                        </div>

                        {/* Action Buttons */}
                        <div className='flex flex-col gap-2.5 justify-center items-center md:items-end text-sm text-center'>
                             {/* Payment buttons */}
                             {!item.cancelled && !item.payment && !item.isCompleted && (
                                <div className="flex flex-col gap-2 w-full sm:w-48">
                                     <button onClick={() => appointmentStripe(item._id)} disabled={paymentProcessing === item._id} className='w-full py-2 px-4 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'>
                                         {paymentProcessing === item._id ? 'Processing...' : <img className='max-h-5' src={assets.stripe_logo} alt="Stripe" />}
                                     </button>
                                     <button onClick={() => appointmentRazorpay(item._id, item.amount, item.docData?.name, item.userData?.name, item.userData?.email, item.userData?.phone)} disabled={paymentProcessing === item._id} className='w-full py-2 px-4 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'>
                                         {paymentProcessing === item._id ? 'Processing...' : <img className='max-h-5' src={assets.razorpay_logo} alt="Razorpay" />}
                                     </button>
                                 </div>
                             )}
                             {/* Paid Indicator */}
                             {!item.cancelled && item.payment && !item.isCompleted && ( <button className='w-full sm:w-48 py-2 border border-green-500 rounded text-green-600 bg-green-50 cursor-default font-medium'>Paid</button> )}
                             {/* Completed Indicator */}
                             {item.isCompleted && ( <button className='w-full sm:w-48 py-2 border border-gray-400 rounded text-gray-500 bg-gray-100 cursor-default font-medium'>Completed</button> )}
                             {/* Cancelled Indicator */}
                             {item.cancelled && !item.isCompleted && ( <button className='w-full sm:w-48 py-2 border border-red-500 rounded text-red-500 bg-red-50 cursor-default font-medium'>Cancelled</button> )}
                             {/* Cancel Button */}
                             {!item.cancelled && !item.isCompleted && ( <button onClick={() => cancelAppointment(item._id)} disabled={cancelling === item._id || paymentProcessing === item._id} className='w-full sm:w-48 py-2 border border-red-500 rounded text-red-500 hover:bg-red-600 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium'> {cancelling === item._id ? 'Cancelling...' : 'Cancel Appointment'} </button> )}

                            {/* --- *** REVISED Chat Button Logic *** --- */}
                            {/* Condition: Show ONLY if appointment is NOT cancelled */}
                            {!item.cancelled && (
                                <Link
                                    to={`/chat/${item._id}`} // Links to the chat page
                                    className="w-full sm:w-48 mt-2 bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700 transition-all duration-300 font-medium"
                                    // Apply data-tour-id for the guided tour to target this button
                                    data-tour-id={index === 0 ? "appointment-chat-button" : undefined}
                                >
                                    Chat with Doctor
                                </Link>
                            )}
                            {/* --- *** End REVISED Chat Button Logic *** --- */}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyAppointments;