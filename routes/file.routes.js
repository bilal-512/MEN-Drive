const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const { auth } = require('../middleware/auth');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const userDir = path.join(uploadDir, req.user._id.toString());
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: function (req, file, cb) {
        
        const uniqueSuffix = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9\-_\.]/g, '_');
        cb(null, `${uniqueSuffix}-${sanitizedName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        
        const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
        }
    }
});

router.get('/upload', auth, (req, res) => {
    res.render('upload');
});

const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.render('upload', {
                message: {
                    type: 'error',
                    text: 'File is too large. Maximum size is 10MB.'
                }
            });
        }
    } else if (err) {
        return res.render('upload', {
            message: {
                type: 'error',
                text: err.message
            }
        });
    }
    next();
};

router.post('/upload', auth, handleMulterError, upload.single('file'), async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.render('upload', {
                message: {
                    type: 'error',
                    text: 'Please log in to upload files'
                }
            });
        }

        if (!req.file) {
            return res.render('upload', {
                message: {
                    type: 'error',
                    text: 'Please select a file to upload'
                }
            });
        }

        const newFile = new File({
            filename: req.file.filename,
            originalname: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadedBy: req.user._id 
        });

        await newFile.save();

        res.redirect('/files');
    } catch (error) {
        console.error('Upload error:', error);
        if (req.file) {
            fs.unlink(req.file.path, (unlinkError) => {
                if (unlinkError) console.error('Error deleting file:', unlinkError);
            });
        }

        res.render('upload', {
            message: {
                type: 'error',
                text: error.message || 'Error uploading file. Please try again.'
            }
        });
    }
});

router.get('/files', auth, async (req, res) => {
    try {
        const { search, type, sort } = req.query;
        const query = { uploadedBy: req.user._id };
        if (search) {
            query.$or = [
                { originalname: { $regex: search, $options: 'i' } },
                { filename: { $regex: search, $options: 'i' } }
            ];
        }
        if (type) {
            query.mimetype = new RegExp(type, 'i');
        }
        let sortQuery = { uploadedAt: -1 }; 
        if (sort === 'name') {
            sortQuery = { originalname: 1 };
        } else if (sort === 'size') {
            sortQuery = { size: -1 };
        }

        const files = await File.find(query)
            .sort(sortQuery)
            .populate('uploadedBy', 'username');
        const totalStorage = await File.aggregate([
            { $match: { uploadedBy: req.user._id } },
            { $group: { _id: null, total: { $sum: '$size' } } }
        ]);

        const storageUsed = totalStorage[0]?.total || 0;

        res.render('files', {
            files,
            error: null,
            search,
            type,
            sort,
            storageUsed: (storageUsed / (1024 * 1024)).toFixed(2) // Convert to MB
        });
    } catch (error) {
        console.error('Error fetching files:', error);
        res.render('files', {
            files: [],
            error: 'Error fetching files. Please try again later.',
            search: '',
            type: '',
            sort: '',
            storageUsed: 0
        });
    }
});

module.exports = router;
