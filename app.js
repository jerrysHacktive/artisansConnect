const express = require('express');
const cors = require('cors');
const authRoute = require('./routes/authRoute');

const app = express();

// middleware
app.use(cors('*')); //allows frontend request
app.use(express.json()); // parse JSON bodies
// parse form data
app.use(
  express.urlencoded({
    extended: true,
  })
);

//Routes
app.use('/api/v1/auth', authRoute);

module.exports = app;
