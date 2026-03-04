const jwt = require('jsonwebtoken');

// WARNING: Hardcoded secret for testbed purposes only. Do not use in production.
const JWT_SECRET = process.env.JWT_SECRET || 'telemetry_testbed_secret_key';

/**
 * Middleware to verify JWT and attach user payload to the request.
 */
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
    }
}

/**
 * Middleware factory to restrict access to specific roles.
 * @param {string[]} allowedRoles Array of roles (e.g., ['Admin', 'HR'])
 */
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ error: 'Unauthorized: User role not found' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
        }

        next();
    };
}

module.exports = {
    verifyToken,
    requireRole,
    JWT_SECRET // Exporting for the auth router to sign tokens
};
