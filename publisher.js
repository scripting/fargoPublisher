//Copyright 2014, Small Picture, Inc.

var http = require ("http");
var request = require ("request");
var urlpack = require ("url");
var AWS = require ("aws-sdk");
var s3 = new AWS.S3 ();

var httpReadUrl = function (url, callback) {
	request (url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback (body) 
			}
		});
	
	}
var writeStaticFile = function (path, data, type, acl) {
	var bucketname = "";
	if (type == undefined) {
		type = "text/plain";
		}
	if (acl == undefined) {
		acl = "public-read";
		}
	
	//split path into bucketname and path -- like this: /tmp.scripting.com/testing/one.txt
		if (path.length > 0) {
			if (path [0] == "/") { //delete the slash
				path = path.substr (1); 
				}
			var ix = path.indexOf ("/");
			bucketname = path.substr (0, ix);
			path = path.substr (ix + 1);
			}
	
	var params = {
		ACL: acl,
		ContentType: type,
		Body: data,
		Bucket: bucketname,
		Key: path
		};
	s3.putObject (params, function (err, data) { 
		console.log ("Wrote: http://" + bucketname + "/" + path);
		});
	}
var padWithZeros = function (num, ctplaces) {
	var s = num.toString ();
	while (s.length < ctplaces) {
		s = "0" + s;
		}
	return (s);
	}
var isAlpha = function (ch) {
	return (((ch >= 'a') && (ch <= 'z')) || ((ch >= 'A') && (ch <= 'Z')));
	}
var scrapeTagValue = function (sourcestring, tagname) {
	var s = sourcestring; //work with a copy
	var opentag = "<" + tagname + ">", closetag = "</" + tagname + ">";
	var ix = s.indexOf (opentag);
	if (ix >= 0) {
		s = s.substr (ix + opentag.length);
		ix = s.indexOf (closetag);
		if (ix >= 0) {
			s = s.substr (0, ix);
			return (s);
			}
		}
	return ("");
	}
function parsePackages (s) {
	var magicpattern = "<[{~#--- ", ix, path, htmltext;
	while (s.length > 0) {
		ix = s.indexOf (magicpattern);
		if (ix < 0) {
			break;
			}
		s = s.substr (ix + magicpattern.length);
		ix = s.indexOf ("\n");
		path = s.substr (0, ix);
		s = s.substr (ix + 1);
		ix = s.indexOf (magicpattern);
		if (ix < 0) {
			htmltext = s;
			}
		else {
			htmltext = s.substr (0, ix);
			s = s.substr (ix);
			}
		console.log ("\"" + path + "\" == " + htmltext.length + " characters.");
		writeStaticFile ("/tmp.scripting.com/blog" + path, htmltext, "text/html");
		}
	}
var handlePackagePing = function (urloutline) {
	console.log ("handlePackagePing: " + urloutline);
	httpReadUrl (urloutline, function (httptext) {
		var urlpackage = scrapeTagValue (httptext, "linkHosting");
		console.log ("package url: " + urlpackage);
		httpReadUrl (urlpackage, function (packagetext) {
			console.log ("package text: " + packagetext.length + " chars.");
			parsePackages (packagetext);
			});
		});
	}

console.log ("starting server");
var counter = 0;
var server = http.createServer (function (request, response) {
	console.log (request.url);
	
	var parsedUrl = urlpack.parse (request.url, true);
	
	switch (parsedUrl.pathname.toLowerCase ()) {
		case "/pingpackage":
			response.writeHead (200, {"Content-Type": "application/json"});
			
			handlePackagePing (parsedUrl.query.link);
			
			var x = {"url": parsedUrl.query.link};
			var s = "getData (" + JSON.stringify (x) + ")";
			response.end (s);    
			
			break;
		default:
			response.writeHead (404, {"Content-Type": "text/plain"});
			response.end ("404 Not Found");
			break;
		}
	});
server.listen (1337);
