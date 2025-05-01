import React, { useState, useRef, useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';

const HealthcareBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const symptoms = text.split(",").map(s => s.trim());
    setMessages(prev => [...prev, { type: 'user', content: text }]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symptoms }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Server error');

      let botReply = 'Sorry, no data';
      if (data.predicted_disease) {
        const conf = (data.confidence * 100).toFixed(1);
        botReply = `I think you might be suffering from <strong>${data.predicted_disease}</strong>.`;

        if (data.explanation) {
          botReply += `<br/><br/><strong>Explanation:</strong> ${data.explanation}`;
        }
      } else if (data.error) {
        botReply = `<strong>Error:</strong> ${data.error}`;
      }

      setMessages(prev => [...prev, { type: 'bot', content: botReply }]);
    } catch (error) {
      setMessages(prev => [...prev, { type: 'error', content: `<strong>Error:</strong> ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600"
        >
          <ChatBubbleIcon />
        </button>
      )}

      {isOpen && (
        <div className="w-96 h-[600px] bg-white rounded-lg shadow-xl flex flex-col">
          <div className="bg-blue-500 p-4 rounded-t-lg flex justify-between items-center">
            <h2 className="text-white font-semibold">Healthcare Assistant</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-600 rounded-full p-1"
            >
              <CloseIcon />
            </button>
          </div>

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`mb-4 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-2 rounded-lg ${
                  msg.type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                }`}>
                  <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                </div>
              </div>
            ))}
            {isLoading && <CircularProgress size={24} className="m-auto" />}
          </div>

          <div className="border-t bg-white p-4 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type your symptoms separated by commas..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage(message)}
              className="flex-1 px-4 py-2 border rounded-full focus:outline-none"
            />
            <button
              onClick={() => handleSendMessage(message)}
              disabled={!message.trim()}
              className="bg-blue-500 text-white p-2 rounded-full disabled:opacity-50"
            >
              <SendIcon />
            </button>
            <button onClick={() => fileInputRef.current.click()} className="p-2 rounded-full">
              {/* Reserved for file upload */}
            </button>
            {/* <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" /> */}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthcareBot;
