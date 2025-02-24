const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Route to upload audio file
app.post("/upload", upload.single("audio"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const inputPath = req.file.path;
    const compressedPath = path.join(uploadDir, `compressed-${req.file.filename}`);

    // Compress audio using ffmpeg
    ffmpeg(inputPath)
        .audioBitrate("128k")
        .toFormat("mp3")
        .on("end", () => {
            fs.unlinkSync(inputPath); // Remove original file after compression
            res.json({ message: "File uploaded and compressed", filename: `compressed-${req.file.filename}` });
        })
        .on("error", (err) => {
            console.error(err);
            res.status(500).json({ message: "Error compressing file" });
        })
        .save(compressedPath);
});

// Route to stream audio files in chunks
app.get("/stream/:filename", (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": "audio/mp3",
        });

        file.pipe(res);
    } else {
        res.writeHead(200, { "Content-Length": fileSize, "Content-Type": "audio/mp3" });
        fs.createReadStream(filePath).pipe(res);
    }
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
