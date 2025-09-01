const jwt = require('jsonwebtoken');

const JWT_SECRET = 'this-is-secret'; 

const auth = (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

module.exports = { auth, JWT_SECRET };
