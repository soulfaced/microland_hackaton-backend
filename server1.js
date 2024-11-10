const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

const genAI = new GoogleGenerativeAI('AIzaSyD9t12PoKOLSARse-P2OHXcAyM2ClRfRQU');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

app.use(bodyParser.json());
app.use(express.static('public'));

let chatHistory = [];

// Load patient data from JSON file
const patientData = JSON.parse(fs.readFileSync('./patients.json', 'utf-8'));

// Helper function to get patient info by email or ID
const getPatientInfo = (email) => patientData.patients.find(patient => patient.email === email);

app.post('/ask', async (req, res) => {
    const { question, email } = req.body;

    if (!question || !email) {
        return res.status(400).json({ error: 'Both question and patient email are required' });
    }

    // Retrieve patient info based on email
    const patient = getPatientInfo(email);

    if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
    }

    // Create the prompt with patient data and chat history
    const prompt = `
    You're a healthcare-focused AI assistant specializing in providing detailed medical guidance, including information on diseases, home remedies, appointment scheduling, emergency responses, symptoms analysis, diet, and health tips. 

    You can also perform symptom checking based on input. If a user question is unclear, ask one question at a time and then wait for the reply then ask another question , till all your doubts are clear, ask for more details. Politely redirect non-medical queries by explaining you're here to assist with healthcare. 
    you should be able to prescribe medication, provide information on diseases, and give health tips.

Patient Information:
Name: ${patient.name}
Age: ${patient.age}
Gender: ${patient.gender}
Location: ${patient.location}
Medical History: ${patient.medicalHistory.join(', ')}

Conversation history:
${chatHistory.map((entry, index) => `Q${index+1}: ${entry.question}\nA${index+1}: ${entry.answer}`).join('\n')}

Q: ${question}
A:`;

    try {
        const result = await model.generateContent(prompt);
        const answer = result.response.text();

        chatHistory.push({ question, answer });

        res.status(200).json({ answer });
    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({ error: 'Error generating content' });
    }
});

// Clear chat history endpoint
app.post('/clear-chat', (req, res) => {
    chatHistory = [];
    res.status(200).json({ message: 'Chat history cleared' });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
