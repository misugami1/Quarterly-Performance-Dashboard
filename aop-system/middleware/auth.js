const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // This extracts the user ID and attaches it to the request
    req.user = decoded; 
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};