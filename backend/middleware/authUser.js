import jwt from 'jsonwebtoken';

const authUser = async (req, res, next) => {
    // Look for token in Authorization header first, then fallback to 'token' header
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract token from "Bearer <token>"
        token = authHeader.split(' ')[1];
    } else {
        // Fallback to checking 'token' header directly (as used in frontend axios calls)
        token = req.headers.token;
    }

    if (!token) {
        console.log("Auth Middleware: Token missing");
        // 401 Unauthorized
        return res.status(401).json({ success: false, message: 'Not Authorized: Access token is required' });
    }

    try {
        // Verify the token using the secret key
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);

        // Attach the user ID (from token payload) to the request object
        // Ensure your JWT payload uses 'id' for the user's MongoDB ObjectId
        if (!decodedPayload.id) {
             console.error("Auth Middleware: Token payload missing 'id' field.");
             return res.status(401).json({ success: false, message: 'Not Authorized: Invalid token payload' });
        }
        req.userId = decodedPayload.id; // Attach to req.userId

        next(); // Token is valid, proceed to the next middleware or route handler
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        // Handle different JWT errors specifically if needed (e.g., TokenExpiredError)
        // 401 Unauthorized for any verification error
        res.status(401).json({ success: false, message: 'Not Authorized: Invalid or expired token' });
    }
};

export default authUser;