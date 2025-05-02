import React, { useState, useRef, useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile'; // Keep if file upload is intended later
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import { Alert } from '@mui/material'; // For displaying errors nicely

const HealthcareBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
      // Initial bot message
      { type: 'bot', content: 'Hi there! How can I help you today? Describe your symptoms (e.g., headache, fever).' }
  ]);
  const [inputMessage, setInputMessage] = useState(''); // Renamed state variable
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(''); // State for error messages
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null); // Keep for future file upload feature

  // Scroll to bottom on new message or loading state change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Function to add a message to the state
  const addMessage = (type, content) => {
      setMessages(prev => [...prev, { type, content }]);
  };

  // Handle sending text messages
  const handleSendMessage = async () => {
    const text = inputMessage.trim();
    if (!text) return;

    addMessage('user', text); // Add user message immediately
    setInputMessage(''); // Clear input field
    setIsLoading(true); // Show loading indicator
    setError(''); // Clear previous errors

    // Assuming your Python API endpoint for prediction
    const predictUrl = 'http://localhost:5000/predict'; // Make sure this is correct

    try {
      // Prepare symptoms array (handle comma separation)
       const symptoms = text.split(',').map(s => s.trim()).filter(s => s); // Filter empty strings

       if (symptoms.length === 0) {
           throw new Error("Please provide valid symptoms separated by commas.");
       }

      const response = await fetch(predictUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symptoms }), // Send symptoms as array
      });

      const data = await response.json();

      if (!response.ok) {
          // Throw error with message from backend if available
          throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      // Process successful response
      let botReply = "I couldn't determine a likely condition based on the symptoms provided. Please consult a doctor."; // Default reply
      if (data.predicted_disease) {
        // const conf = data.confidence ? (data.confidence * 100).toFixed(1) : 'N/A'; // Handle missing confidence
        // botReply = `Based on the symptoms, it might be ${data.predicted_disease} (Confidence: ${conf}%). Remember, this is not a diagnosis. Please consult a doctor.`;
        botReply = `Based on your symptoms, one possibility could be ${data.predicted_disease}. However, this is just a suggestion and not a diagnosis. Please consult a healthcare professional for accurate advice.`;

      } else if (data.message) { // Handle cases where backend sends a message instead of prediction
          botReply = data.message;
      }

      addMessage('bot', botReply); // Add bot's reply

    } catch (err) {
        console.error("Chatbot API Error:", err);
        // Add error message to chat and set error state
        const errorMessage = `Error: ${err.message || 'Could not get a response.'}`;
        addMessage('error', errorMessage);
        setError(err.message || 'Could not get a response.');
    } finally {
      setIsLoading(false); // Hide loading indicator
    }
  };

  // Placeholder for file upload functionality
  const handleFileUpload = async () => {
    const file = fileInputRef.current.files[0];
    if (!file) return;
    // Implement file upload logic here if needed in the future
    addMessage('user', `Selected file: ${file.name} (Upload not implemented yet)`);
    console.log("File selected:", file);
     toast.info("File upload feature is not yet implemented in this chatbot.");
  };

  // Handle Enter key press in input
  const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !isLoading) {
          handleSendMessage();
      }
  };

  return (
    // --- Joyride Target on the main container ---
    <div className="fixed bottom-4 right-4 z-50" data-tour-id="chatbot-icon">
      {/* Chat Bubble Icon (when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
          aria-label="Open Chatbot"
        >
          <ChatBubbleIcon />
        </button>
      )}

      {/* Chat Window (when open) */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[500px] sm:h-[600px] bg-white rounded-lg shadow-xl flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-blue-600 p-3 rounded-t-lg flex justify-between items-center text-white">
            <h2 className="font-semibold text-base">AI Health Assistant</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-blue-100 hover:text-white hover:bg-blue-700 rounded-full p-1 focus:outline-none focus:ring-1 focus:ring-white"
              aria-label="Close Chatbot"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>

          {/* Message Area */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`inline-block py-2 px-3 rounded-lg max-w-[80%] break-words text-sm ${
                  msg.type === 'user' ? 'bg-blue-500 text-white rounded-br-none' :
                  msg.type === 'bot' ? 'bg-gray-200 text-gray-800 rounded-bl-none' :
                  'bg-red-100 text-red-700 border border-red-300 rounded-bl-none' // Style for error messages
                }`}>
                  {/* Render content safely - prevents potential XSS if content could be malicious */}
                  {msg.content}
                </div>
              </div>
            ))}
            {/* Loading Indicator */}
            {isLoading && (
                <div className="flex justify-center py-2">
                     <CircularProgress size={20} />
                 </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t bg-white p-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about symptoms..."
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              disabled={isLoading}
            />
            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-600 text-white p-2 rounded-full disabled:opacity-50 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
              aria-label="Send Message"
            >
              <SendIcon fontSize="small"/>
            </button>
            {/* Attach File Button (optional) */}
            {/*
            <button onClick={() => fileInputRef.current?.click()} className="text-gray-500 p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400" aria-label="Attach File">
              <AttachFileIcon fontSize="small"/>
            </button>
            <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf"/>
            */}
          </div>
            {/* Error Display Area */}
            {error && (
                <div className="p-2 border-t bg-red-50">
                    <Alert severity="error" onClose={() => setError('')} sx={{ fontSize: '0.8rem', padding: '2px 8px' }}>
                        {error}
                    </Alert>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default HealthcareBot;