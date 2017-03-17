const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const hostname = '0.0.0.0';
const port = 8082;
const home = '/index.html';

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

  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  response.setHeader('Access-Control-Allow-Origin', '*');

  if (pathname === './api') {

    // this is likely a call for data...

    switch (request.method) {

      case "GET":

        let query = parsedUrl.query;

        response.write(JSON.stringify(query));
        response.statusCode = 200;
        response.end();
        break;

      case "POST":

        let body = '';

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

        response.statusCode = 200;
        response.write("Python to sum-up.");
        response.end();
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