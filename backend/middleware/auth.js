// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    console.log('Auth middleware - Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    console.log('Auth middleware - User found:', req.user ? req.user.username : 'None');
    console.log('Auth middleware - User role:', req.user ? req.user.role : 'None');
    
    if (!req.user) {
      console.log('Auth middleware - User not found in database');
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    next();
  } catch (error) {
    console.log('Auth middleware - Token verification failed:', error.message);
    res.status(401).json({ 
      success: false, 
      message: 'Token is invalid or expired' 
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Optional authentication - doesn't fail if no token provided
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
      } catch (error) {
        // Token invalid, but continue without user
        console.log('Optional auth - Invalid token, continuing without user');
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};