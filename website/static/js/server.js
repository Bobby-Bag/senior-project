    const express = require('express');
    const multer = require('multer');
    const path = require('path');
    const app = express();
    const port = 3000;

    // Configure multer for file uploads
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/');
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    });

    const upload = multer({ storage: storage });

    // Serve static files from the "uploads" directory
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Endpoint for file uploads
    app.post('/upload_photo', upload.single('file'), (req, res) => {
        if (!req.file) {
            return res.status(400).send({ message: 'No file uploaded.' });
        }
        const imageUrl = `/uploads/${req.file.filename}`;
        res.status(200).send({ message: 'Upload successful', imageUrl: imageUrl });
    });

    // Simulated endpoint for adding a pin
    app.post('/add_pin', express.json(), (req, res) => {
        const { lat, lng } = req.body;
        // Implement pin saving logic here
        res.status(200).send({ message: 'Pin added successfully!' });
    });

    // Simulated endpoint for deleting a pin
    app.post('/delete_pin', express.json(), (req, res) => {
        const { lat, lng } = req.body;
        // Implement pin deletion logic here
        res.status(200).send({ message: 'Pin deleted successfully!' });
    });

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });