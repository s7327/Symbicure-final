# SymbiCure

MediCure is a **full-stack doctor appointment booking system** built using the **MERN stack**. It allows patients to search for nearby doctors based on specialization, location, and availability. The system also integrates a **chatbot** to assist users with queries and appointment-related assistance.

## Features

- **Doctor Search**: Find doctors based on specialization, location, and availability.
- **Appointment Booking**: Securely book appointments with preferred doctors.
- **Admin Panel**: Manage doctors and appointments.
- **Chatbot Integration**: AI-powered chatbot for assistance.
- **User Authentication**: Secure login for patients and doctors.

## Tech Stack

- **Frontend**: React.js, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Token)
- **Chatbot**: AI-powered chatbot integration

## Installation and Setup

Follow these steps to run the project locally:

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/medicure.git
cd medicure
```

### 2. Install Dependencies
#### Backend
```bash
cd backend
npm install
```
#### Frontend
```bash
cd frontend
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the `backend` directory and add the following variables:
```env
PORT=4000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```


### 4. Download the Pre-trained Models
The AI-powered chatbot relies on pre-trained model files. Download the model files (.pkl and .pt) from Hugging Face:

[Download the models here](https://huggingface.co/s7327/symbicure_models/tree/main)

Once downloaded, place these model files in the following directory:


### 5. Start the Backend Server
```bash
cd backend
npm run server
```

### 6. Start the Frontend Server
```bash
cd frontend
npm run dev
```

### 7. **Chatbot Integration**
The chatbot is integrated using an AI-powered API to assist users with booking and general queries.

## Contribution
Feel free to contribute to this project. Fork the repository and submit a pull request with improvements.


