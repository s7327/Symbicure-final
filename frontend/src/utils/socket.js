import { io } from "socket.io-client";

// Set the server URL (you can replace the URL with your server's URL in production)
const socket = io("http://localhost:4000"); // Or your backend URL

export { socket };