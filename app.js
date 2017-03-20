const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const hostname = '0.0.0.0';
const port = 8082;
const home = '/index.html';

const pythonExecutable = "python"; // use path if environmental variable not set
const pathToLocalScripts = 'py/';

const isNumber = function(val) {
  return /^-?\d+\.?\d*$/.test(val);
};

const uint8arrayToString = function(data){
  return String.fromCharCode.apply(null, data);
};

const executePythonScript = function(name, input, callback) {
  "use strict";
  const spawn = require('child_process').spawn;
  const scriptExecution = spawn(pythonExecutable, [pathToLocalScripts+name]);

  // Handle normal output
  scriptExecution.stdout.on('data', (data) => {
    if (!!callback && callback instanceof Function) {
      callback(uint8arrayToString(data));
    } else {
      console.log(uint8arrayToString(data));
    }
  });

  // Write data (remember to send only strings or numbers, otherwise python wont understand)
  let data
      = isNumber(input) ? Number(input) : JSON.stringify(input);

  scriptExecution.stdin.write(data);

  // End data write
  scriptExecution.stdin.end();
};

const mimeType = {
  '.ico': 'image/x-icon',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.eot': 'appliaction/vnd.ms-fontobject',
  '.ttf': 'aplication/font-sfnt'
};

const server = http.createServer(function(request, response) {

  const parsedUrl = url.parse(request.url, true);

  let pathname = `.${parsedUrl.pathname}`;
  let query = parsedUrl.query;
  let body = '';

  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  response.setHeader('Access-Control-Allow-Origin', '*');

  if (pathname === './api') {

    // this is likely a call for data...

    switch (request.method) {

      case "GET":

        response.write(JSON.stringify(query));
        response.statusCode = 200;
        response.end();
        break;

      case "POST":

        // Get the data as utf8 strings.
        // If an encoding is not set, Buffer objects will be received.
        request.setEncoding('utf8');

        // Readable streams emit 'data' events once a listener is added
        request.on('data', (chunk) => {
          body += chunk;
        });

        // the end event indicates that the entire body has been received
        request.on('end', () => {
          try {

            // testing data as json
            const data = JSON.parse(body);

            response.statusCode = 200;
            response.write(JSON.stringify(data));
            response.end();

          } catch (err) {

            // bad json!
            response.statusCode = 400;
            return response.end(`error: ${err.message}`);
          }
        });
        break;

      case "PUT":

        // Get the data as utf8 strings.
        // If an encoding is not set, Buffer objects will be received.
        request.setEncoding('utf8');

        // Readable streams emit 'data' events once a listener is added
        request.on('data', (chunk) => {
          body += chunk;
        });

        // the end event indicates that the entire body has been received
        request.on('end', () => {
          try {

            // testing data as json
            const data = JSON.parse(body);
            const script = data.script;
            const input = data.input;

            executePythonScript(script, input, function(output){
              "use strict";
              response.statusCode = 200;
              response.write(output);
              response.end();
            });

          } catch (err) {

            // bad json!
            response.statusCode = 400;
            return response.end(`error: ${err.message}`);
          }
        });
        break;
    }

  } else {

    // this is likely a call for an asset...

    fs.stat(pathname, function (error, stats) {
      if (error) {
        // if the file is not found, return 404
        response.statusCode = 404;
        response.end(`File ${pathname} not found!`);
        return;
      }
      // if is a directory, then look for index.html
      if (stats.isDirectory()) {
        pathname += home;
      }
      // read file from file system
      fs.readFile(pathname, function (err, data) {
        if (err) {
          response.statusCode = 500;
          response.end(`Error getting the file: ${err}.`);
        } else {
          // based on the URL path, extract the file extention. e.g. .js, .doc, ...
          const ext = path.parse(pathname).ext;
          // if the file is found, set Content-type and send data
          response.setHeader('Content-type', mimeType[ext] || 'text/plain');
          response.end(data);
        }
      });
    });
  }

}).listen(port, hostname);