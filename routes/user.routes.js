const express = require('express');
const router = express.Router();
const userSchema = require('../models/Users')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

router.get('/register', (req, res) => {
    res.render("register");
});

router.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        
        if (!email || !username || !password) {
            return res.render('register', {
                error: 'All fields are required',
                values: { email, username }
            });
        }

        if (password.length < 8) {
            return res.render('register', {
                error: 'Password must be at least 8 characters long',
                values: { email, username }
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('register', {
                error: 'Please enter a valid email address',
                values: { email, username }
            });
        }

        const existingUser = await userSchema.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.render('register', {
                error: existingUser.email === email ? 'Email already exists' : 'Username already exists',
                values: { email, username }
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new userSchema({
            email,
            username,
            password: hashedPassword,
            createdAt: new Date()
        });

        await newUser.save();
        const userUploadDir = path.join('uploads', newUser._id.toString());
        if (!fs.existsSync(userUploadDir)) {
            fs.mkdirSync(userUploadDir, { recursive: true });
        }

        res.redirect('/login?registered=true');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('register', {
            error: 'An error occurred during registration. Please try again.',
            values: { email, username }
        });
    }
});
router.get('/login', (req, res) => {
    const registered = req.query.registered === 'true';
    res.render("login", {
        error: null,
        success: registered ? 'Registration successful! Please login with your credentials.' : null
    });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for email:', email);

        const user = await userSchema.findOne({ email });
        if (!user) {
            console.log('No user found with email:', email);
            return res.render('login', { error: 'Invalid email or password' });
        }

        console.log('User found:', user.username);
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch for user:', user.username);
            return res.render('login', { error: 'Invalid email or password' });
        }

        console.log('Password matched for user:', user.username);
        const token = jwt.sign(
            { _id: user._id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        console.log('JWT token created and cookie set for user:', user.username);
        res.redirect('/upload');
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'An error occurred during login' });
    }
});

router.get('/logout', (req, res) => {
    
    res.clearCookie('token');
    res.redirect('/login');
});

module.exports = router;
