const express = require('express');
const cors = require('cors');

const app = express();

// middleware
app.use(cors()); //allows frontend request
app.use(express.json()); // parse JSON bodies
app.use(
  express.urlencoded({
    extended: true,
  })
); // parse from data

//Routes

//Error Handling
app.all('*', (req, res, next) => {
  next(new AppError(`Cant find ${req.originalUrl} on this server`, 404));
});

app.use(globalError); //

module.exports = app;
