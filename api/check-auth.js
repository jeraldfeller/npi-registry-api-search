// api/check-auth.js

module.exports = async (req, res) => {
    const authCookie = req.headers.cookie
      ? req.headers.cookie.split('; ').find((row) => row.startsWith('auth='))
      : null;
  
    if (authCookie && authCookie.split('=')[1] === 'true') {
      res.status(200).json({ authenticated: true });
    } else {
      res.status(200).json({ authenticated: false });
    }
  };
  