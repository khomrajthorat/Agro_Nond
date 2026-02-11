import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication middleware
 * Verifies JWT token from HttpOnly Cookie or Authorization header
 */
export async function requireAuth(req, res, next) {
  try {
    let token;

    // 1. Check Cookie (Primary for Web)
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    // 2. Check Header (Fallback for Mobile/API)
    else if (req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '');
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Find user in DB
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    // console.error('Auth middleware error:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth middleware
 * Attaches user if token is valid, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    let token;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '');
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
        }
      } catch (err) {
        // Token invalid, ignore
      }
    }

    next();
  } catch (error) {
    // Continue without user
    next();
  }
}

/**
 * Role-based access middleware
 * Use after requireAuth
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.userRole = req.user.role;
    next();
  };
}

export default requireAuth;
