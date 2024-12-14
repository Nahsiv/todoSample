const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Access Denied');

  try {
    // for time being now taken hard coded need to fix this in the next build 
    const verified = jwt.verify(token, 'secretKey');
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [verified.id]);
    if (!user.rows.length) return res.status(401).send('Invalid Token');
    req.user = user.rows[0];
    req.body.user_id = verified.id;
    next();
  } catch (err) {
    res.status(400).send('Invalid Token');
  }
};

module.exports = { authenticate };
