const mongoose = require('mongoose');
const Patient = require('./models/Patient'); // Adjust path if needed
const fs = require('fs');
require('dotenv').config();

// MongoDB connection
mongoose.connect('mongodb://padwekarsanchit:4Rasrdkfv2nTnusp@cluster0-shard-00-00.kte3u.mongodb.net:27017,cluster0-shard-00-01.kte3u.mongodb.net:27017,cluster0-shard-00-02.kte3u.mongodb.net:27017/?ssl=true&replicaSet=atlas-opn2io-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('Failed to connect to MongoDB:', err));

// Load doctors data from JSON file
const data = JSON.parse(fs.readFileSync('./patients.json', 'utf8'));

// Insert data into the Doctor collection
const seedDatabase = async () => {
  try {
    await Patient.insertMany(data.patients);
    console.log('Doctors data has been successfully added to the database');
  } catch (error) {
    console.error('Error inserting data:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the seed function
// seedDatabase();
