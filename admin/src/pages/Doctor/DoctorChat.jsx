// admin/src/pages/Doctor/DoctorChat.jsx

import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { DoctorContext } from '../../context/DoctorContext'; // Adjust path if needed
import { toast } from 'react-toastify';

let socket = null; // Manage socket instance

function DoctorChat() {
    const { appointmentId } = useParams();
    const { dToken, backendUrl, docUserId } = useContext(DoctorContext);

    // Map context values
    const token = dToken;
    const userId = docUserId; // Doctor's ID

    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [isConnected, setIsConnected] = useState(socket?.connected || false);
    const [error, setError] = useState(null);
    const [appointmentInfo, setAppointmentInfo] = useState(null);
    const messagesEndRef = useRef(null);

    const senderId = userId; // Doctor's ID

    // --- RENDER LOG 1 ---
    // console.log("[RENDER] DoctorChat State - isConnected:", isConnected, "loadingHistory:", loadingHistory, "token:", !!token, "senderId:", !!senderId);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // --- Socket Connection useEffect ---
    useEffect(() => {
        if (!appointmentId || !backendUrl || !token || !senderId) {
            // console.log("[DEBUG] Socket Effect: Missing required data.", { appointmentId, backendUrl, token: !!token, senderId });
            setError("Chat unavailable. Missing required information. Please log in again.");
            setIsConnected(false);
            if (socket) socket.disconnect();
            return;
        }
        if (!socket || (!socket.connected && !socket.connecting)) {
             if (socket) { /*console.log("[DEBUG] Socket Effect: Disconnecting previous socket before reconnecting.");*/ socket.disconnect(); }
            // console.log("[DEBUG] Socket Effect: Attempting to connect socket to", backendUrl);
            setError(null);
            socket = io(backendUrl, { auth: { token }, reconnectionAttempts: 3 });

            socket.on('connect', () => {
                 // console.log("[DEBUG] Socket: Connected. ID:", socket.id);
                 setIsConnected(true); setError(null);
                 // console.log("[DEBUG] Socket: Emitting joinRoom for:", appointmentId);
                 socket.emit('joinRoom', { appointmentId });
            });
            socket.on('disconnect', (reason) => {
                 // console.log("[DEBUG] Socket: Disconnected.", reason);
                 setIsConnected(false);
                 if (reason !== 'io client disconnect') setError("Chat disconnected.");
            });
            socket.on('connect_error', (err) => {
                 // console.error("[DEBUG] Socket: Connection error:", err.message);
                 setIsConnected(false);
                 setError(`Connection failed: ${err.message}.`);
            });
            socket.on('receiveMessage', (msg) => {
                 // console.log("[DEBUG] Socket: Received message:", msg);
                 if (msg && msg.message && (msg.sender || msg.senderId) && msg.timestamp) {
                     const formattedMsg = { ...msg, senderId: msg.senderId || msg.sender };
                     setMessages(prev => [...prev, formattedMsg]);
                 } else { /*console.warn("[DEBUG] Socket: Received malformed message object", msg);*/ }
            });
            socket.on('joinError', (data) => { /*console.error("[DEBUG] Join Error:", data.message);*/ setError(`Error joining room: ${data.message}`); });
            socket.on('sendError', (data) => { toast.error(`Send Error: ${data.message}`); });
        } else {
             setIsConnected(socket.connected);
              if(socket.connected) {
                   // console.log("[DEBUG] Socket Effect: Already connected, ensuring room join for:", appointmentId);
                   socket.emit('joinRoom', { appointmentId });
              }
        }
        return () => {
            // console.log("[DEBUG] Socket Effect Cleanup: Component unmounting.");
        };
    }, [appointmentId, backendUrl, token, senderId]);

    // --- Fetch History + Appointment Info useEffect ---
    useEffect(() => {
        if (!appointmentId || !backendUrl || !token) {
            setLoadingHistory(false);
            if (!token) setError("Cannot load history: Missing authentication token.");
            // console.log("[DEBUG] History Effect: Prerequisites missing.", { appointmentId, backendUrl, token: !!token });
            return;
        }
        let isMounted = true;
        const fetchChatData = async () => {
            // console.log("[DEBUG] History: Starting fetch for", appointmentId); // LOG 1
            setLoadingHistory(true); setError(null);
            try {
                const messagesUrl = `${backendUrl}/api/chats/${appointmentId}`;
                const headers = { headers: { Authorization: `Bearer ${token}` } };
                // console.log("[DEBUG] History: Sending request to", messagesUrl, "with token:", !!token); // LOG 2
                const messagesResponse = await axios.get(messagesUrl, headers);
                // console.log("[DEBUG] History: Request successful, Status:", messagesResponse.status); // LOG 3
                // console.log("[DEBUG] History: Raw response data:", JSON.stringify(messagesResponse.data, null, 2)); // LOG 4

                if (isMounted) {
                    // console.log("[DEBUG] History: Request successful, processing response..."); // LOG 5
                    if (Array.isArray(messagesResponse.data)) {
                        const formattedMessages = messagesResponse.data.map(msg => ({ ...msg, senderId: msg.senderId || msg.sender }));
                        // console.log("[DEBUG] History: Messages formatted, attempting setMessages with", formattedMessages.length, "messages."); // LOG 6
                        setMessages(formattedMessages);
                        // console.log("[DEBUG] History: setMessages called successfully."); // LOG 7
                    } else {
                        // console.error("[DEBUG] History: Unexpected response format inside isMounted:", messagesResponse.data); // LOG 8
                        setMessages([]); setError("Failed to load chat history: Invalid data format.");
                    }
                     // console.log("[DEBUG] History: Finished processing response inside isMounted."); // LOG 9
                } else { /*console.log("[DEBUG] History: Component unmounted before processing response.");*/ }
            } catch (err) {
                 if (isMounted) {
                    // console.error("[DEBUG] History: CATCH BLOCK - Error fetching data:", err); // LOG 10
                    const errorMsg = err.response?.data?.message || err.message || "An unknown error occurred";
                    setError(`Failed to load chat: ${errorMsg}`);
                    setMessages([]);
                    if (err.response?.status === 401 || err.response?.status === 403) setError("Failed to load chat: Unauthorized.");
                 } else { /*console.log("[DEBUG] History: CATCH BLOCK - Component unmounted, error occurred:", err.message);*/ }
            } finally {
                if (isMounted) {
                    // console.log("[DEBUG] History: FINALLY BLOCK - Setting loadingHistory to false."); // LOG 11
                    setLoadingHistory(false);
                } else { /*console.log("[DEBUG] History: FINALLY BLOCK - Component unmounted, not setting state.");*/ } // LOG 12
            }
        };
        fetchChatData();
        return () => { /*console.log("[DEBUG] History Effect Cleanup: Ran.");*/ isMounted = false; };
    }, [appointmentId, backendUrl, token]);

    // ScrollToBottom useEffect
    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    // sendMessage function
    const sendMessage = () => {
         if (!text.trim() || !socket || !isConnected || !senderId) {
             // console.warn("[DEBUG] Send message blocked:", {text: !!text.trim(), socket: !!socket, isConnected, senderId: !!senderId});
             return;
         };
         // console.log("[DEBUG] Sending message:", text);
         socket.emit('sendMessage', { appointmentId: appointmentId, message: text.trim() });
         setText('');
    };

    // handleKeyPress function
    const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

    // --- Calculate disabled state before return ---
    const isInputDisabled = !isConnected || loadingHistory;
    // *** RENDER LOG 2 ***
    // console.log("[RENDER] Calculated isInputDisabled:", isInputDisabled, "(!isConnected:", !isConnected, "|| loadingHistory:", loadingHistory, ")");


    // --- RETURN JSX ---
    return (
        <div className="p-4 max-w-3xl mx-auto flex flex-col h-[calc(100vh-100px)] bg-white shadow-md rounded-lg border">
            <div className="mb-2">
                <Link to="/doctor-appointments" className="text-sm text-blue-600 hover:underline">← Back to Appointments</Link>
            </div>
            <h2 className="text-xl font-semibold mb-3 text-center border-b pb-2 text-gray-700">
                Chat with Patient {appointmentInfo ? `(${appointmentInfo.userData?.name || 'N/A'})` : ''}
            </h2>
            {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-3 text-sm" role="alert">{error}</div>)}
            <div className="flex-grow border p-3 overflow-y-auto bg-gray-50 rounded mb-4 relative scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-gray-100">
                {loadingHistory && <p className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 text-gray-600">Loading history...</p>}
                {!loadingHistory && messages.length === 0 && !error && (<p className="text-center text-gray-500 py-4">No messages yet. Start the conversation!</p>)}
                {!loadingHistory && messages.map((msg, index) => {
                    const isCurrentUser = msg.senderId === senderId;
                    const messageKey = msg._id || `msg-${index}-${msg.timestamp}`;
                    return (
                        <div key={messageKey} className={`mb-3 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`inline-block max-w-[75%] px-4 py-2 rounded-xl shadow-sm ${isCurrentUser ? 'bg-cyan-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                <p className="text-sm break-words">{msg.message}</p>
                                <p className={`text-xs mt-1 text-right ${isCurrentUser ? 'text-cyan-100 opacity-80' : 'text-gray-500 opacity-80'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            {/* --- Input Area with comments removed --- */}
            <div className="flex mt-auto border-t pt-3">
                {/* Removed comment from inside the tag */}
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-grow border border-gray-300 px-3 py-2 rounded-l-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:bg-gray-100"
                    disabled={isInputDisabled} // Use calculated value
                 />
                 {/* Removed comment from inside the tag */}
                <button
                    onClick={sendMessage}
                    className="bg-cyan-500 text-white px-5 py-2 rounded-r-md hover:bg-cyan-600 transition-colors disabled:bg-cyan-300 disabled:cursor-not-allowed"
                    disabled={isInputDisabled || !text.trim()} // Use calculated value + text check
                 > Send </button>
            </div>
        </div>
    );
}

export default DoctorChat;