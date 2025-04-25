import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { AppContext } from '../context/AppContext'; // Adjust path as needed
import { toast } from 'react-toastify'; // For error feedback

let socket = null; // Define socket variable outside component to manage instance

function Chat() {
    const { appointmentId } = useParams();
    // Get userId from context - CRITICAL
    const { token, backendUrl, userId } = useContext(AppContext);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [isConnected, setIsConnected] = useState(socket?.connected || false); // Track socket connection
    const [error, setError] = useState(null); // Store connection/fetch errors
    const messagesEndRef = useRef(null); // Ref for scrolling

    // Determine senderId reliably
    const senderId = userId; // Directly use userId from context

    // Scroll to bottom function
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    },[]);

    // Effect for Socket Connection & Message Handling
    useEffect(() => {
        // Prevent connection attempt if essential info is missing
        if (!appointmentId || !backendUrl || !token || !senderId) {
            console.log("Chat Effect: Missing required data. Waiting...", { appointmentId, backendUrl, token, senderId });
            setError("Chat unavailable. Missing required information (like User ID or Token). Please log in again.");
            setIsConnected(false);
            if (socket) socket.disconnect(); // Disconnect if previously connected
            return;
        }

        // Avoid reconnecting if already connected and dependencies haven't changed significantly
        if (socket && socket.connected && socket._opts?.auth?.token === token && socket._opts?.query?.appointmentId === appointmentId) {
             console.log("Chat Effect: Socket already connected with same params.");
             setIsConnected(true);
             setError(null); // Clear previous errors
             return;
        }

        // Disconnect previous socket if it exists before creating a new one
        if (socket) {
            console.log("Chat Effect: Disconnecting previous socket...");
            socket.disconnect();
            socket = null;
        }

        console.log("Chat Effect: Attempting to connect socket to", backendUrl);
        setError(null); // Clear previous errors

        // Initialize socket connection
        socket = io(backendUrl, {
            auth: { token }, // Send token for backend authentication
            // Optional: query parameters can also be used if needed by backend
            // query: { appointmentId }
             reconnectionAttempts: 3, // Limit reconnection attempts
             timeout: 10000, // Connection timeout
        });

        // --- Socket Event Listeners ---
        socket.on('connect', () => {
            console.log("Chat: Socket connected successfully. ID:", socket.id);
            setIsConnected(true);
            setError(null);
            // Join the specific appointment room AFTER successful connection
            console.log("Chat: Emitting joinRoom for:", appointmentId);
            socket.emit('joinRoom', { appointmentId });
        });

        socket.on('disconnect', (reason) => {
            console.log("Chat: Socket disconnected.", reason);
            setIsConnected(false);
            // Only set error if it wasn't a manual disconnect
            if (reason !== 'io client disconnect') {
                 setError("Chat disconnected. Trying to reconnect...");
            }
        });

        socket.on('connect_error', (err) => {
            console.error("Chat: Socket connection error:", err.message);
            setIsConnected(false);
            setError(`Connection failed: ${err.message}. Please check your connection or try again later.`);
            // Optional: Show specific error using toast
            // toast.error(`Chat connection failed: ${err.message}`);
        });

        // Listen for new messages broadcast by the server
        socket.on('receiveMessage', (msg) => {
            console.log("Chat: Received new message:", msg);
            if (msg && msg.message && (msg.sender || msg.senderId) && msg.timestamp) {
                 // Map 'sender' from backend model to 'senderId' if needed for consistency
                 const formattedMsg = { ...msg, senderId: msg.senderId || msg.sender };
                setMessages(prevMessages => [...prevMessages, formattedMsg]);
            } else {
                console.warn("Chat: Received malformed message object", msg);
            }
        });

         // Listen for potential errors emitted from backend (optional but good)
         socket.on('joinError', (data) => {
             console.error("Chat: Error joining room:", data.message);
             setError(`Error joining chat room: ${data.message}`);
             toast.error(`Error joining chat room: ${data.message}`);
             // Potentially disconnect if join fails due to auth?
             // socket.disconnect();
         });
         socket.on('sendError', (data) => {
             console.error("Chat: Error sending message:", data.message);
             toast.error(`Failed to send message: ${data.message}`);
             // Optionally remove optimistic message if implemented
         });

        // --- Cleanup Logic ---
        return () => {
            console.log("Chat Cleanup: Disconnecting socket and removing listeners.");
            if (socket) {
                socket.off('connect');
                socket.off('disconnect');
                socket.off('connect_error');
                socket.off('receiveMessage');
                socket.off('joinError');
                socket.off('sendError');
                socket.disconnect();
                socket = null; // Clear the instance
                setIsConnected(false); // Explicitly set disconnected state
            }
        };

    }, [appointmentId, backendUrl, token, senderId]); // Dependencies

    // Effect for Fetching Initial Messages
    useEffect(() => {
        if (!appointmentId || !backendUrl || !token) {
            setLoadingHistory(false);
            return;
        }

        const fetchMessages = async () => {
            console.log("Chat History: Fetching for", appointmentId);
            setLoadingHistory(true);
            setError(null); // Clear previous fetch errors
            try {
                const url = `${backendUrl}/api/chats/${appointmentId}`;
                const headers = { headers: { token } };
                const response = await axios.get(url, headers);

                console.log("Chat History: Response data:", response.data);

                if (Array.isArray(response.data)) {
                     // Map 'sender' from backend model to 'senderId' if needed
                     const formattedMessages = response.data.map(msg => ({
                         ...msg,
                         senderId: msg.senderId || msg.sender
                     }));
                    setMessages(formattedMessages);
                } else {
                    console.error("Chat History: Unexpected response format:", response.data);
                    setMessages([]);
                     setError("Failed to load chat history: Invalid data format.");
                }
            } catch (err) {
                console.error("Chat History: Error fetching messages:", err.response?.data || err.message);
                 setError(`Failed to load chat history: ${err.response?.data?.message || err.message}`);
                setMessages([]); // Clear messages on error
                 // toast.error(`Failed to load chat history: ${err.response?.data?.message || err.message}`);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchMessages();
    }, [appointmentId, backendUrl, token]); // Dependencies for fetching

    // Effect for Scrolling to Bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Function to send a new message
    const sendMessage = () => {
        if (!text.trim()) return;
        if (!socket || !isConnected) {
            console.error("Chat: Cannot send message, socket not connected.");
            toast.error("Cannot send message. Not connected to chat.");
            return;
        }
        if (!senderId) {
            console.error("Chat: Cannot send message, user ID not found.");
            toast.error("Cannot send message. User identity unknown.");
            return;
        }

        console.log("Chat: Sending message:", text, "by sender:", senderId, "to room:", appointmentId);

        // Emit message via socket - Backend handles saving & broadcasting
        socket.emit('sendMessage', {
            appointmentId: appointmentId,
            message: text.trim()
            // Backend will use the authenticated socket.user.userId as sender
        });

        setText(''); // Clear input field immediately
    };

    // Handle pressing Enter key to send message
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // === Render Logic ===

    return (
        <div className="p-4 max-w-2xl mx-auto flex flex-col h-[calc(100vh-150px)] bg-white shadow-md rounded-lg"> {/* Adjust height as needed */}
            <h2 className="text-xl font-semibold mb-3 text-center border-b pb-2 text-gray-700">Appointment Chat</h2>

            {/* Error Display Area */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-3 text-sm" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

             {/* Connection Status Indicator */}
             {/* <div className={`text-xs text-center mb-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                 {isConnected ? 'Connected' : 'Disconnected'}
             </div> */}

            {/* Messages container */}
            <div className="flex-grow border p-3 overflow-y-auto bg-gray-50 rounded mb-4 relative scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-gray-100">
                {loadingHistory && <p className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 text-gray-600">Loading history...</p>}

                {!loadingHistory && messages.length === 0 && !error && (
                    <p className="text-center text-gray-500 py-4">No messages yet. Start the conversation!</p>
                )}

                {!loadingHistory && messages.map((msg, index) => {
                    // Compare msg.senderId (or msg.sender) with the context's userId
                    const isCurrentUser = msg.senderId === senderId;
                    // Use msg._id from database for key
                    const messageKey = msg._id || `msg-${index}-${msg.timestamp}`; // Fallback key

                    return (
                        <div key={messageKey} className={`mb-3 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                             {/* Optional: Display sender name/initial if not current user */}
                             {/* {!isCurrentUser && <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 flex items-center justify-center text-xs text-gray-600">Dr</div>} */}
                            <div
                                className={`inline-block max-w-[75%] px-4 py-2 rounded-xl shadow-sm ${
                                    isCurrentUser
                                        ? 'bg-blue-500 text-white rounded-br-none'
                                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                }`}
                            >
                                <p className="text-sm break-words">{msg.message}</p>
                                <p className={`text-xs mt-1 text-right ${
                                    isCurrentUser
                                        ? 'text-blue-100 opacity-80'
                                        : 'text-gray-500 opacity-80'
                                }`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                 })}
                {/* Empty div at the end to scroll to */}
                <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="flex mt-auto border-t pt-3">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-grow border border-gray-300 px-3 py-2 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    disabled={!isConnected || loadingHistory} // Disable input if not connected or loading history
                />
                <button
                    onClick={sendMessage}
                    className="bg-blue-500 text-white px-5 py-2 rounded-r-md hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                    disabled={!isConnected || loadingHistory || !text.trim()} // Disable send if not connected, loading, or no text
                >
                    Send
                </button>
            </div>
        </div>
    );
}

export default Chat;