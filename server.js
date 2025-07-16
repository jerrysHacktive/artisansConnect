const app = require('./app');
const mongoose = require('mongoose');
require('dotenv').config();

//App Port
const APP_PORT = process.env.APP_PORT || 5000;

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.log('MongoDB Atlas connection error:', err));

//Start the sever
app.listen(APP_PORT, () => {
  console.log(`server running on port: ${APP_PORT}`);
});
