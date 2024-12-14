const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { userSignUpValidator, userLoginValidator } = require('../validators/userValidators');

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { error } = userSignUpValidator.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Error creating user');
  }
});

router.post('/login', async (req, res) => {
//   const { error } = userLoginValidator.validate(req.body);
//   if (error) return res.status(400).send(error.details[0].message);

  const { username, password } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (!user.rows.length) return res.status(400).send('Invalid credentials');

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) return res.status(400).send('Invalid credentials');

    const token = jwt.sign({ id: user.rows[0].id }, 'secretKey', { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).send('Error logging in');
  }
});

module.exports = router;
