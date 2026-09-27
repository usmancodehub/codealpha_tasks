const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const authorization = req.header('Authorization');
  const [scheme, token] = authorization?.split(' ') || [];
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user || decoded;
    next();
  } catch (e) {
    res.status(400).json({ msg: 'Token is not valid' });
  }
};