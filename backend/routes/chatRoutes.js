// routes/chatRoutes.js
const express = require('express');
const ChatMessage = require('../models/ChatMessage'); // Mongoose model
const router = express.Router();

// Get messages for a specific appointment
router.get('/:appointmentId', async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    const messages = await ChatMessage.find({ appointmentId }).sort({ timestamp: 1 }); // Sort by timestamp
    res.json({ success: true, messages });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Error fetching chat messages' });
  }
});

// Send a new message
router.post('/send', async (req, res) => {
  try {
    const { appointmentId, sender, message } = req.body;

    if (!appointmentId || !sender || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Save the message in the database
    const newMessage = new ChatMessage({
      appointmentId,
      sender,
      message,
    });

    await newMessage.save();

    // Emit the message to all clients connected to this appointment via Socket.IO
    const io = req.app.get('socketio');
    io.to(appointmentId).emit('new-message', newMessage);

    res.json({ success: true, message: 'Message sent successfully', newMessage });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Error sending message' });
  }
});

module.exports = router;
