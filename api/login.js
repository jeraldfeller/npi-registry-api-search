// api/login.js

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }
  
    const { password } = req.body;
  
    if (!password) {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }
  
    const validPassword = process.env.PASSWORD;
  
    if (password === validPassword) {
      // Set an HTTP-only cookie
      res.setHeader('Set-Cookie', 'auth=true; HttpOnly; Path=/; Max-Age=86400'); // 1 day expiration
      res.status(200).json({ message: 'Authentication successful.' });
    } else {
      res.status(401).json({ error: 'Invalid password.', currentPassword: password, validPassword: validPassword });
    }
  };
  