var AWS = require ("aws-sdk");
var s3 = new AWS.S3 ();
var http = require ('http');

var writeStaticFile = function (path, data, type, acl) {
	var bucketname = "tmp.scripting.com";
	if (type == undefined) {
		type = "text/plain";
		}
	if (acl == undefined) {
		acl = "public-read";
		}
	var params = {
		ACL: acl,
		ContentType: type,
		Body: data,
		Bucket: bucketname,
		Key: path
		};
	s3.putObject (params, function (err, data) { 
		console.log ("Wrote S3 file: http://" + bucketname + "/" + path);
		});
	}

console.log ("starting server");
var counter = 0;
var server = http.createServer(function(request, response) {
	response.writeHead(200, {'Content-Type': 'text/plain'});
	var color = 'blue';
	if (counter % 2 === 1) {
		color = 'no, green';
		}
	response.end(color);
	writeStaticFile ("testing/" + counter + ".txt", new Date ().toString ());
	counter++;
	});
server.listen (1337);
