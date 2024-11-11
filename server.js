const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  'https://chatbot-frontend-soulfaceds-projects.vercel.app',
  'http://localhost:3001',
  'https://chatbot-frontend-two-phi.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
          callback(null, origin); // Allow this origin
      } else {
          callback(new Error('Not allowed by CORS')); // Deny other origins
      }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));


// Enable trust proxy for secure cookies behind a proxy (e.g., Nginx, Heroku)
app.set('trust proxy', 1);

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
      secure: true, // Ensure this is set to true for HTTPS
      httpOnly: true, 
      sameSite: 'none', // Allows cookies to be sent across different origins
      maxAge: 1000 * 60 * 60 * 24 // 24 hours expiration
  }
}));

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize Google Generative AI with secure API key from .env
const genAI = new GoogleGenerativeAI("AIzaSyD9t12PoKOLSARse-P2OHXcAyM2ClRfRQU");
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

let chatHistory = [];

// Load JSON data
const patientData = JSON.parse(fs.readFileSync('./patients.json', 'utf-8'));
const doctorData = JSON.parse(fs.readFileSync('./doctors.json', 'utf-8'));
const doctorDataString = fs.readFileSync('./doctors.json', 'utf-8');
const medicine = fs.readFileSync('./medication.json', 'utf-8');

// Helper function to get patient info by email
const getPatientInfo = (email) => patientData.patients.find(patient => patient.email === email);

// Login route
// app.post('/login', (req, res) => {
//     const { email } = req.body;
//     const patient = getPatientInfo(email);

//     if (patient) {
//         req.session.email = email; // Save email to session
//         res.status(200).json({ message: 'Login successful', patient });
//     } else {
//         res.status(401).json({ error: 'Unauthorized: Email not found' });
//     }
// });
app.post('/login', (req, res) => {
  const { email } = req.body;
  const patient = getPatientInfo(email);

  if (patient) {
      req.session.email = email;
      req.session.save((err) => {
          if (err) {
              return res.status(500).json({ error: 'Failed to save session' });
          }
          res.status(200).json({ message: 'Login successful', patient });
      });
  } else {
      res.status(401).json({ error: 'Unauthorized: Email not found' });
  }
});


// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.status(200).json({ message: 'Logout successful' });
});

// Fetch all doctors
app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await Doctor.find();
        res.status(200).json(doctors);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ error: 'An error occurred while fetching doctors' });
    }
});

// Fetch all patients
app.get('/api/patients', async (req, res) => {
    try {
        const patients = await Patient.find();
        res.status(200).json(patients);
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ error: 'An error occurred while fetching patients' });
    }
});

// Add a new patient
app.post('/api/patients', async (req, res) => {
    const { id, name, email, age, gender, medicalHistory, location } = req.body;
    try {
        const newPatient = new Patient({ id, name, email, age, gender, medicalHistory, location });
        await newPatient.save();
        res.status(201).json({ message: 'Patient added successfully', patient: newPatient });
    } catch (error) {
        console.error('Error adding patient:', error);
        res.status(500).json({ error: 'An error occurred while adding the patient' });
    }
});

// Add a new doctor
app.post('/api/doctors', async (req, res) => {
    const { id, name, email, age, workExperience, speciality, location, timeSlot } = req.body;
    try {
        const newDoctor = new Doctor({ id, name, email, age, workExperience, speciality, location, timeSlot });
        await newDoctor.save();
        res.status(201).json({ message: 'Doctor added successfully', doctor: newDoctor });
    } catch (error) {
        console.error('Error adding doctor:', error);
        res.status(500).json({ error: 'An error occurred while adding the doctor' });
    }
});

// Chatbot endpoint
app.post('/ask', async (req, res) => {
    if (!req.session.email) {
        return res.status(401).json({ error: 'Unauthorized: Please log in' });
    }

    const { question } = req.body;
    const patient = getPatientInfo(req.session.email);

    if (!question) {
        return res.status(400).json({ error: 'A question is required' });
    }

    // Define conditions and specialties
    const conditions = { /* Define conditions and specialties as in your code */ };

    const detectedConditions = Object.keys(conditions).filter(condition =>
        question.toLowerCase().includes(condition.toLowerCase())
    );

    const availableDoctors = doctorData.doctors.filter(doctor =>
        detectedConditions.some(condition => doctor.speciality === conditions[condition]) &&
        doctor.location === patient.location
    );

    let assignedDoctor = null;
    if (availableDoctors.length > 0) {
        assignedDoctor = availableDoctors[0];
        req.session.assignedDoctor = assignedDoctor;
    }

    const prompt = `You're a healthcare-focused AI assistant specializing in providing detailed medical guidance, including information on diseases, home remedies, appointment scheduling, emergency responses, symptoms analysis, diet, and health tips. talk polietly and provide the best possible solution to the patient. take name of pateint where ever required.

    You can also perform symptom checking based on input. If a user question is unclear, ask one question at a time and then wait for the reply then ask another question , till all your doubts are clear, ask for more details. Politely redirect non-medical queries by explaining you're here to assist with healthcare. 
    you should be able to prescribe medication, provide information on diseases, and give health tips.
    if user is asking to book an appointment, ask for the preferred time slot and then confirm the appointment. you can get information about the doctor from the this :
    ${doctorDataString}
    and find doctors that can treat the patient and is from the same location, give the list of doctors .

    if user asks for the medicne and stuff you can take help from ${medicine} to provide the answers tot the patient and also help him create a proper meal plan as per his condition.

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

        res.status(200).json({
            answer,
            detectedConditions,
            assignedDoctor: assignedDoctor ? {
                name: assignedDoctor.name,
                speciality: assignedDoctor.speciality,
                location: assignedDoctor.location,
                timeSlot: assignedDoctor.timeSlot
            } : null
        });
    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({ error: 'Error generating content' });
    }
});

// Save an appointment
app.post('/save-appointment', (req, res) => {
    const { patientName, doctorName, doctorID, speciality, location, timeSlot, condition } = req.body;

    const filePath = path.join(__dirname, 'appointments.json');
    let appointments = [];

    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        appointments = JSON.parse(data);
    }

    const newAppointment = {
        patientName, doctorName, doctorID, speciality, location, timeSlot, condition,
        appointmentDate: new Date().toISOString()
    };

    appointments.push(newAppointment);
    fs.writeFileSync(filePath, JSON.stringify(appointments, null, 2));

    res.status(200).json({ message: 'Appointment booked successfully', appointment: newAppointment });
});

// Connect to MongoDB
mongoose.connect("mongodb://padwekarsanchit:4Rasrdkfv2nTnusp@cluster0-shard-00-00.kte3u.mongodb.net:27017,cluster0-shard-00-01.kte3u.mongodb.net:27017,cluster0-shard-00-02.kte3u.mongodb.net:27017/?ssl=true&replicaSet=atlas-opn2io-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB:', err));

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
