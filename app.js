const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const ParseServer = require('parse-server').ParseServer;

const port = process.env.PORT || 1337;
const parseMasterKey = process.env.MASTER_KEY || 'KQdF126IZFZarl4mLAGu5ix6h';
const parseAppId = process.env.APP_ID || 'r2iHRgNfOM8lih4';
const mongoDBUser = process.env.MONGO_USER || 'admin';
const mongoDBPassword = process.env.MONGO_PASSWORD || 'Es0REXOXP7KC04f2kngktBNwC';

app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(bodyParser.json());

const api = new ParseServer({
  databaseURI: `mongodb://${mongoDBUser}:${mongoDBPassword}@ds217970.mlab.com:17970/supfile`, // Connection string for your MongoDB database
  cloud: '/home/myApp/cloud/main.js', // Absolute path to your Cloud Code
  appId: parseAppId,
  masterKey: parseMasterKey,
  serverURL: 'http://localhost:1337/parse'
});

// Serve the Parse API on the /parse URL prefix
app.use('/parse', api);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});