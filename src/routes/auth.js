const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const getDbConnection = require('../db/connection');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

/**
 * Endpoint: POST /api/auth/register
 * Body: { username, password, role }
 */
router.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    const allowedRoles = ['Admin', 'HR', 'Employee'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Allowed roles are: ${allowedRoles.join(', ')}` });
    }

    try {
        const db = await getDbConnection();

        // Check if user already exists
        const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert user
        const result = await db.run(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, passwordHash, role]
        );

        return res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: result.lastID,
                username,
                role
            }
        });

    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'Internal server error during registration' });
    }
});

/**
 * Endpoint: POST /api/auth/login
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const db = await getDbConnection();

        const user = await db.get('SELECT id, username, password_hash, role FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error during login' });
    }
});

module.exports = router;
