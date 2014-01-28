//Copyright 2014, Small Picture, Inc.
	//Last update: 1/27/2014; 8:14:58 PM Eastern.

var myVersion = "0.65"; 

var s3HostingPath = process.env.fpHostingPath; //where we store all the users' HTML and XML files
var s3defaultType = "text/plain";
var s3defaultAcl = "public-read";

var s3DataPath = process.env.fpDataPath;
var s3NamesPath = s3DataPath + "names"; 
var s3StatsPath = s3DataPath + "stats"; 

var myDomain = process.env.fpDomain; //something like smallpict.com
var myPort = process.env.fpServerPort; //what port should the server run on?

var http = require ("http");
var request = require ("request");
var urlpack = require ("url");
var AWS = require ("aws-sdk");
var s3 = new AWS.S3 ();

function httpReadUrl (url, callback) {
	request (url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback (body) 
			}
		});
	}
function s3SplitPath (path) { //split path like this: /tmp.scripting.com/testing/one.txt -- into bucketname and path.
	var bucketname = "";
	if (path.length > 0) {
		if (path [0] == "/") { //delete the slash
			path = path.substr (1); 
			}
		var ix = path.indexOf ("/");
		bucketname = path.substr (0, ix);
		path = path.substr (ix + 1);
		}
	return ({Bucket: bucketname, Key: path});
	}
function s3NewObject (path, data, type, acl, callback) {
	var splitpath = s3SplitPath (path);
	if (type == undefined) {
		type = s3defaultType;
		}
	if (acl == undefined) {
		acl = s3defaultAcl;
		}
	var params = {
		ACL: acl,
		ContentType: type,
		Body: data,
		Bucket: splitpath.Bucket,
		Key: splitpath.Key
		};
	s3.putObject (params, function (err, data) { 
		console.log ("s3NewObject: http://" + splitpath.Bucket + "/" + splitpath.Key);
		if (callback != undefined) {
			callback (err, data);
			}
		});
	}
function s3GetObjectMetadata (path, callback) {
	var params = s3SplitPath (path);
	s3.headObject (params, function (err, data) {
		callback (data);
		});
	}
function s3GetObject (path, callback) {
	var params = s3SplitPath (path);
	s3.getObject (params, function (err, data) {
		callback (data);
		});
	}

function updateNameRecord (name, obj, callback) { 
	s3NewObject (s3NamesPath + "/" + name + ".json", JSON.stringify (obj, undefined, 3), "text/plain", "public-read", function (err, data) {
		if (callback != undefined) {
			callback (err, data);
			}
		});
	}
function addNameRecord (name, opmlUrl, callback) { 
	var data = {
		"name": name,
		"opmlUrl": opmlUrl,
		"whenCreated": new Date ().toString ()
		};
	updateNameRecord (name, data, callback);
	}
function isNameDefined (name, callback) {
	s3GetObjectMetadata (s3NamesPath + "/" + name + ".json", function (metadata) {
		callback (metadata != null);
		});
	}
function getNameRecord (name, callback) {
	s3GetObject (s3NamesPath + "/" + name + ".json", function (data) {
		if (data == null) {
			callback (null);
			}
		else {
			callback (data.Body);
			}
		});
	}

function padWithZeros (num, ctplaces) {
	var s = num.toString ();
	while (s.length < ctplaces) {
		s = "0" + s;
		}
	return (s);
	}
function isAlpha (ch) {
	return (((ch >= 'a') && (ch <= 'z')) || ((ch >= 'A') && (ch <= 'Z')));
	}
function isNumeric (ch) {
	return ((ch >= '0') && (ch <= '9'));
	}
function cleanName (name) {
	var s = "";
	for (var i = 0; i < name.length; i++) {
		var ch = name [i];
		if (isAlpha (ch) || isNumeric (ch)) {
			s += ch;
			}
		}
	return (s.toLowerCase (s));
	}
function scrapeTagValue (sourcestring, tagname) {
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
function parsePackages (name, s) { //name is something like "dave"
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
		
		if (path.length > 0) {
			if (path [0] == "/") { //delete leading slash, if present
				path = path.substr (1);
				}
			s3NewObject (s3HostingPath + name + "/" + path, htmltext, "text/html");
			}
		}
	}
function handlePackagePing (subdomain) { //something like http://dave.smallpict.com/
	var parsedUrl = urlpack.parse (subdomain, true);
	var sections = parsedUrl.host.split (".");
	var name = sections [0];
	
	
	getNameRecord (name, function (jsontext) {
		var obj = JSON.parse (jsontext);
		httpReadUrl (obj.opmlUrl, function (httptext) {
			var urlpackage = scrapeTagValue (httptext, "linkHosting");
			httpReadUrl (urlpackage, function (packagetext) {
				parsePackages (name, packagetext);
				
				obj.whenLastUpdate = new Date ().toString ();
				obj.urlRedirect = "http:/" + s3HostingPath + name + "/"; 
				updateNameRecord (name, obj);
				});
			});
		});
	}

var server = http.createServer (function (httpRequest, httpResponse) {
	if (httpRequest.method == "HEAD") {
		httpRequest.end (null);
		}
	else {
		var parsedUrl = urlpack.parse (httpRequest.url, true);
		
		console.log (parsedUrl.pathname);
		
		switch (parsedUrl.pathname.toLowerCase ()) {
			case "/pingpackage":
				httpResponse.writeHead (200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "fargo.io"});
				
				handlePackagePing (parsedUrl.query.link);
				
				var x = {"url": parsedUrl.query.link};
				var s = "getData (" + JSON.stringify (x) + ")";
				httpResponse.end (s);    
				
				break;
			case "/isnameavailable":
				function sendStringBack (s) {
					var x = {"message": s};
					httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
					}
				httpResponse.writeHead (200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "fargo.io"});
				
				var name = cleanName (parsedUrl.query.name);
				
				if (name.length == 0) {
					sendStringBack ("");    
					}
				else {
					if (name.length < 4) {
						sendStringBack ("Name must be 4 or more characters.");
						}
					else {
						isNameDefined (name, function (fldefined) {
							var color, answer;
							if (fldefined) {
								color = "red";
								answer = "is not";
								}
							else {
								color = "green";
								answer = "is";
								}
							sendStringBack ("<span style=\"color: " + color + ";\">" + name + "." + myDomain + " " + answer + " available.</span>")
							});
						}
					}
				
				break;
			case "/newoutlinename":
				var recordkey = cleanName (parsedUrl.query.name), url = parsedUrl.query.url;
				
				console.log ("Create new outline name: " + recordkey + ", url=" + url);
				
				httpResponse.writeHead (200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "fargo.io"});
				
				if (url == undefined) {
					var x = {flError: true, errorString: "Can't assign the name because there is no <i>url</i> parameter provided."};
					httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
					}
				else {
					isNameDefined (recordkey, function (fldefined) {
						if (fldefined) {
							var x = {flError: true, errorString: "Can't assign the name '" + recordkey + "' to the outline because there already is an outline with that name."};
							httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
							}
						else {
							addNameRecord (recordkey, url, function (err, data) {
								if (err) {
									httpResponse.end ("getData (" + JSON.stringify (err) + ")");    
									}
								else {
									var x = {flError: false, name: recordkey + "." + myDomain};
									httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
									}
								});
							}
						});
					}
				break;
			case "/geturlfromname":
				var name = cleanName (parsedUrl.query.name);
				httpResponse.writeHead (200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "fargo.io"});
				getNameRecord (name, function (jsontext) {
					if (jsontext == null) {
						var x = {flError: true, errorString: "Can't open the outline named '" + name + "' because there is no outline with that name."};
						httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
						}
					else {
						var obj = JSON.parse (jsontext);
						var x = {flError: false, url: obj.opmlUrl};
						httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
						}
					});
				break;
			case "/version":
				httpResponse.writeHead (200, {"Content-Type": "text/plain", "Access-Control-Allow-Origin": "fargo.io"});
				httpResponse.end (myVersion);    
				break;
			default:
				httpResponse.writeHead (404, {"Content-Type": "text/plain", "Access-Control-Allow-Origin": "fargo.io"});
				httpResponse.end ("404 Not Found");
				break;
			}
		}
	});

if (myPort == undefined) {
	myPort = 80;
	}

server.listen (myPort);

console.log ("");
console.log ("");
console.log ("Fargo Publisher server v" + myVersion + ".");
console.log ("");
console.log ("S3 data path == " + s3DataPath + ".");
console.log ("S3 names path == " + s3NamesPath + ".");
console.log ("S3 stats path == " + s3StatsPath + ".");
console.log ("Domain == " + myDomain + ".");
console.log ("Port == " + myPort + ".");
console.log ("");
