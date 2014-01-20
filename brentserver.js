
var writeStaticFile = function (path, filetext, type) {
	if (type == undefined) {
		type = "text/plain";
		}
	var params = {
		ACL: "public-read",
		ContentType: type,
		Body: filetext,
		Bucket: "tmp.scripting.com",
		Key: path
		};
	s3.putObject (params, function (err, data) { 
		console.log ("S3 object put");
		console.log (err);
		console.log (data);
		});
	}


console.log ("Brent's server app");
var AWS = require ("aws-sdk");
console.log ("AWS initialized");
var s3 = new AWS.S3 ();
console.log ("S3 initialized");

writeStaticFile ("testing/helloJitsu.txt", "hello world");

console.log ("Entering loop.");
var http = require ('http');
var counter = 0;
var server = http.createServer(function(request, response) {
	response.writeHead(200, {'Content-Type': 'text/plain'});
	var color = 'blue';
	if (counter % 2 === 1) {
		color = 'no, green';
		}
	response.end(color);
	writeStaticFile ("testing/" + counter + ".txt", "hello world");
	counter++;
	});
server.listen (1337);
