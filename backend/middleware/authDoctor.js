import jwt from 'jsonwebtoken';

// Doctor authentication middleware
const authDoctor = async (req, res, next) => {
    // Prefer Authorization header, fallback to custom 'dtoken' header
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else {
        token = req.headers.dtoken; // Fallback to custom header used by frontend
    }

    if (!token) {
        console.log("Auth Doctor Middleware: Token missing");
        return res.status(401).json({ success: false, message: 'Not Authorized: Doctor token required' });
    }
    try {
        // Verify the token
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);

        // --- Attach the decoded ID as req.userId for consistency ---
        if (!token_decode.id) {
            console.error("Auth Doctor Middleware: Token payload missing 'id'.");
            return res.status(401).json({ success: false, message: 'Not Authorized: Invalid token payload' });
        }
        req.userId = token_decode.id; // <-- Attach ID as userId

        next(); // Proceed to next middleware/handler
    } catch (error) {
        console.error("Auth Doctor Middleware Error:", error.message);
        res.status(401).json({ success: false, message: 'Not Authorized: Invalid or expired token' });
    }
};

export default authDoctor;