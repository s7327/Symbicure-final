// src/pages/ChatWithDoctor.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { socket } from '../utils/socket'; // Import socket utility
import '../styles/chat.css'; // Import the chat CSS file

const ChatWithDoctor = () => {
  const { appointmentId } = useParams();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await axios.get(`/api/chats/${appointmentId}`);
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    socket.emit('joinRoom', { appointmentId });

    socket.on('receiveMessage', (newMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    return () => {
      socket.off('receiveMessage');
    };
  }, [appointmentId]);

  const sendMessage = async () => {
    if (message.trim()) {
      try {
        const { data } = await axios.post('/api/chat/send', {
          appointmentId,
          sender: 'user', // You can modify this to handle different roles (doctor or user)
          message,
        });

        socket.emit('sendMessage', {
          appointmentId,
          senderId: 'user', // 'user' or 'doctor'
          message,
        });

        setMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  return (
    <div>
      <h2>Chat with Doctor</h2>
      <div>
        {messages.map((msg, index) => (
          <div key={index} className={msg.sender === 'doctor' ? 'doctor' : 'user'}>
            <p>{msg.message}</p>
            <p>{new Date(msg.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default ChatWithDoctor;
