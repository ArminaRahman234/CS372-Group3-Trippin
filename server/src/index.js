// installs the libraries to run express and cors
// entry point for the backend api
const express = require('express');
const cors = require('cors');

// creates the server object
const app = express();

// browser will want to naturally block the request because 5173 != 5000, this says its ok
app.use(cors());

// takes the json information it recieves and converts it to a js object
app.use(express.json());

// this will be a good place to think about adding routes later on

// just a quick check to make sure that everything is running ok
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// this is where the server actually starts up
// sets the port to what we set or just defaults to 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));