var fs = require('fs');
var spdy = require('spdy');

var backbone = fs.createReadStream('./backbone.js');
var underscore = fs.createReadStream('./underscore.js');
var applicationjs = fs.createReadStream('./application.js');

var options = {
  key: fs.readFileSync('newkeys/server.key'),
  cert: fs.readFileSync('newkeys/server.crt'),
  ca: fs.readFileSync('newkeys/server.csr')
};

var server = spdy.createServer(options, function(request, response) {

  var jsFiles = [['/underscore.js', underscore],
                 ['/backbone.js', backbone], 
                 ['/application.js', applicationjs]];

  var matchedJsFile = jsFiles.filter(function(filePair) { return filePair.indexOf(request.url) === 0 });
  if (request.url.indexOf('/favicon.ico') === 0) {
    // handle the favicon.ico request from browsers
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.end("404 Not Found");
  } else if (matchedJsFile.length) {
    // handle the regular http request for the javascript file
    console.log('sending match file : ', matchedJsFile[0][0])
    response.writeHead(200, {'content-type': 'application/javascript'});
    matchedJsFile[0][1].pipe(response);
  } else {
    // spdy push all files in jsFiles
    jsFiles.forEach(function streamFile (filePair) {
      var stream = response.push(filePair[0], {
        request: {
          accept: '*/*'
        },
        response: {
          'content-type': 'application/javascript'
        }
      }, function() { 
        console.log('pushed :', filePair[0]);
      });

      // error must be handled or uncaught exception will crash the app
      stream.on('error', function() {
        console.log('error pushing: ' + filePair[0]);
      });

      filePair[1].pipe(stream);      
    });
    
    // send the page response
    response.writeHead(200, {'content-type': 'text/html'});
    var message = "No SPDY for you!"
    if (request.isSpdy){
      message = "YAY! SPDY Works!"
    }
    response.end(
      "<html>" + 
        "<head>" +
          "<title>First SPDY App!</title>" +
          "<script src='/underscore.js'></script>" +
          "<script src='/backbone.js'></script>" +
          "<script src='/application.js'></script>" +
        "<head>" +
        "<body>" +
          "<h1>" + message + "</h1>" +
        "</body>" +
      "<html>");
    console.log('Page sent!\n');
  }  
});

server.listen(8081, function(){
  console.log("SPDY Server started on 8081");
});