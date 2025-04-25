import jwt from "jsonwebtoken";

const authAdmin = async (req, res, next) => {
    // --- Prioritize standard Authorization header ---
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else {
        // Fallback to 'atoken' for compatibility if needed, but prefer Authorization
        token = req.headers.atoken; // Ensure frontend sends this casing if using fallback
        if (token) console.warn("Auth Admin Middleware: Using legacy 'atoken' header. Prefer 'Authorization: Bearer <token>'.");
    }

    // Check if token exists
    if (!token) {
        console.log("Auth Admin Middleware: Token missing");
        return res.status(401).json({ success: false, message: 'Not Authorized: Admin token required' }); // 401 Unauthorized
    }

    try {
        const secret = process.env.JWT_SECRET;
        // Ensure JWT secret is available
        if (!secret) {
            console.error("CRITICAL: JWT_SECRET missing in environment variables for admin auth.");
            return res.status(500).json({ success: false, message: 'Server configuration error.' });
        }

        // Verify the token and decode the payload
        const decodedPayload = jwt.verify(token, secret);

        // --- Check the payload for admin role/identifier ---
        // Ensure the payload structure matches what's signed in loginAdmin
        if (decodedPayload.role !== 'admin' || decodedPayload.id !== process.env.ADMIN_EMAIL) {
            console.log("Auth Admin Middleware: Invalid token payload - not admin or ID mismatch.");
            return res.status(403).json({ success: false, message: 'Forbidden: Not a valid admin session' }); // Use 403 Forbidden
        }

        // Optional: Attach admin identifier if needed by subsequent routes
        // req.adminId = decodedPayload.id;

        next(); // Token is valid and represents an admin

    } catch (error) {
        console.error("Auth Admin Middleware Error:", error.message);
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
             return res.status(401).json({ success: false, message: 'Not Authorized: Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
             return res.status(401).json({ success: false, message: 'Not Authorized: Invalid token format' });
        }
        // Generic fallback for other verification errors
        res.status(401).json({ success: false, message: 'Not Authorized: Invalid token' });
    }
};

export default authAdmin;