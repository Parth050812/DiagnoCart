// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // ✅ ADD THIS
const bodyParser = require('body-parser');
const testRoutes = require('./routes/testroutes');
const authRoutes = require('./routes/authRoutes');
const bookTestRoutes = require('./routes/bookTestRoutes');
const geocodeRoutes = require('./routes/geoCodeRotes');
const trackRoutes = require('./routes/trackroutes');
const contactRoutes = require('./routes/contactRoutes');

const PORT = process.env.PORT || 5000;
const session = require('express-session');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const fetch = require('node-fetch'); // you already have dotenv
const jsonrepair = require('@stdlib/json-repair');
const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(cors({
  origin: 'https://diagnokart-l9i5.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));




// ✅ ENABLE CORS WITH EXPLICIT OPTIONS
// app.use(cors({
//   origin: 'http://127.0.0.1:5500', // 👈 Allow frontend origin (Live Server)
//   methods: ['GET', 'POST'],
//   allowedHeaders: ['Content-Type']
// }));
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SECERET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000  // 1 day
  }
}));



// ✅ Body parser to read JSON


// ✅ Routes
app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', bookTestRoutes);
app.use('/api', geocodeRoutes);
app.use('/api', trackRoutes);
app.use('/api', contactRoutes);


const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_LLM_MODEL = 'gemini-2.0-flash';
const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_LLM_MODEL}:generateContent?key=${GOOGLE_API_KEY}`;


function cleanExtractedLines(rawText) {
    const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean);

    const validLines = [];
    const gibberishLines = [];

    for (let line of lines) {
        const alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
        const totalCount = line.length;

        const ratio = totalCount > 0 ? alphaCount / totalCount : 0;

        if (ratio > 0.4 && line.length > 6) {
            validLines.push(line);
        } else {
            gibberishLines.push(line);
        }
    }

    return {
        cleanedText: validLines.join('\n'),
        gibberishInfo: gibberishLines.length > 0
            ? `Note: Some lines were unreadable or gibberish and were ignored:\n${gibberishLines.slice(0, 5).join('\n')}${gibberishLines.length > 5 ? '\n...' : ''}`
            : ''
    };
}

async function runOCR(imagePath) {
    const result = await Tesseract.recognize(imagePath, 'eng');
    return result.data.text;
}

async function generateInstructionsAndTests(extractedText) {
    const contentParts = [
        {
            text: `You are a helpful medical assistant interpreting a prescription.
Your ONLY output should be a JSON object. Do NOT include any other text, conversation, or markdown besides the JSON.
Ensure all arrays are properly formatted with commas between elements, and objects within arrays are correctly structured.
All keys and string values in the JSON MUST be double-quoted.

Below is the cleaned OCR text from a prescription image. Some unreadable lines were removed for clarity.
The raw OCR text was:
"""
${extractedText}
"""

Instructions:
1. Identify each medicine name and its dosage/frequency instructions from the text.
2. If dosage is in pattern like "1–0–1", translate it to readable format:
    - 1–0–1 → Morning and night
    - 0–1–0 → Afternoon only
    - 1–1-1 → Morning, afternoon, and night
    - 1–0-0 → Morning only
    - 0–0-1 → Night only
    - *3d → Take for 3 days (e.g., "*5d" means "Take for 5 days")
3. List any specific medical tests explicitly mentioned or strongly implied in the prescription. If no tests are mentioned, suggest common general health check-up tests.

Output your response as a JSON object with the following structure:
{
  "medicines": [
    {
      "name": "Medicine Name",
      "instructions": "Clear usage instructions for Medicine (e.g., Take one tablet in the morning and at night)"
    }
  ],
  "suggested_tests": ["Test Name 1", "Test Name 2"],
  "summary": "Overall summary or general advice based on the prescription, including gibberish info if provided."
}
Remember, generate ONLY the JSON object.`,
        },
    ];

    const requestBody = {
        contents: [{
            role: "user",
            parts: contentParts
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(GOOGLE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    let part = data?.candidates?.[0]?.content?.parts?.[0];
    let jsonString = '';
    
    if (typeof part === 'object' && part !== null && part.text) {
        jsonString = part.text.trim();  // when wrapped in text
    } else if (typeof part === 'string') {
        jsonString = part.trim();       // when returned directly
    } else if (typeof part === 'object') {
        // Sometimes the model directly returns a JSON object in deployment
        return part;
    } else {
        throw new Error('Unexpected format from Gemini API: ' + JSON.stringify(part));
    }
    
    // Remove ```json markdown wrapper if present
    const markdownMatch = jsonString.match(/```json\s*([\s\S]*?)```/);
    if (markdownMatch && markdownMatch[1]) {
        jsonString = markdownMatch[1].trim();
    }
    
    try {
        const repairedJsonString = jsonrepair(jsonString);
        const parsedData = JSON.parse(repairedJsonString);
        return parsedData;
    } catch (err) {
        console.error('Failed to parse JSON from Gemini:', err);
        console.error('Raw response:', jsonString);
        return {
            medicines: [],
            suggested_tests: ['Failed to parse AI JSON. Check logs.'],
            summary: 'AI returned unparseable response. Snippet: ' + jsonString.slice(0, 300)
        };
    }
}

app.post('/api/upload', upload.single('prescription'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded.' });
        }

        const imagePath = req.file.path;

        const ocrText = await runOCR(imagePath);
        const { cleanedText, gibberishInfo } = cleanExtractedLines(ocrText);
        const aiResponse = await generateInstructionsAndTests(cleanedText + '\n\n' + gibberishInfo);

        fs.unlinkSync(imagePath);

        res.json({
            ocr_text: ocrText,
            cleaned_ocr_text: cleanedText,
            gibberish_info: gibberishInfo,
            ai_data: aiResponse
        });
    } catch (error) {
        console.error('Error in /upload route:', error); // Keeping this critical error log
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting temp file:", err);
            });
        }
        res.status(500).json({ error: 'Something went wrong while processing the prescription: ' + error.message });
    }
});






// Test route
app.get('/', (req, res) => {
  res.send('DiagnoCart Backend is Running');
});


mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error(err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

