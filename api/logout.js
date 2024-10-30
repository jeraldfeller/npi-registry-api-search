// api/logout.js

module.exports = async (req, res) => {
    // Overwrite the auth cookie to expire it
    res.setHeader('Set-Cookie', 'auth=deleted; HttpOnly; Path=/; Max-Age=0');
    res.status(200).json({ message: 'Logged out successfully.' });
  };
  