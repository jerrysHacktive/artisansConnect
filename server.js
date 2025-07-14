const app = require('./app');


//App Port
const APP_PORT = process.env.APP_PORT;

// Database Connection





//Start the sever
app.listen(APP_PORT, () => {
  logger.info(`server running on port: ${APP_PORT}`);
});