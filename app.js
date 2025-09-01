const express = require("express");
const path = require("path");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const app = express();
const connection = require('./config/dbconfig')
const userRoutes = require('./routes/user.routes');
const fileRoutes = require('./routes/file.routes');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
connection();
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: true
}));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/", userRoutes);
app.use("/", fileRoutes);

app.get('/', (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }
    try {
        jwt.verify(token, require('./middleware/auth').JWT_SECRET);
        return res.redirect('/files');
    } catch (error) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

app.use((req, res) => {
    res.status(404).render('error', {
        message: 'Page not found',
        error: { status: 404 }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});
