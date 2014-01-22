//Copyright 2014, Small Picture, Inc.
	//Last update: 1/22/2014; 11:55:36 AM

var myVersion = "0.4";
var s3path = "/tmp.scripting.com/blog"; //where we store all the files we create
var s3defaultType = "text/plain";
var s3defaultAcl = "public-read";
var myTableName = "smallpictcom";
var myDomain = "smallpict.com";

var http = require ("http");
var request = require ("request");
var urlpack = require ("url");
var AWS = require ("aws-sdk");
var s3 = new AWS.S3 ();
var db = new AWS.DynamoDB ();

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
		type = s3defaultType;
		}
	if (acl == undefined) {
		acl = s3defaultAcl;
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
var getNameRecord = function (recordkey, callback) { //if looking up dave.smallpict.com info, recordkey == dave
	var params = {
		TableName: myTableName,
		AttributesToGet: [
			"opmlUrl", "packageUrl", "whenCreated"
			],
		Key: {
			name: {"S": recordkey}
			}
		}
	db.getItem (params, function (err, data) {
		callback (data);
		});
	}
var isNameDefined = function (recordkey, callback) {
	getNameRecord (recordkey, function (data) {
		callback (data.Item != undefined);
		});
	}

function addNameRecord (recordkey, opmlUrl, callback) { //add "dave" to give the name dave.smallpict.com to the outline
	httpReadUrl (opmlUrl, function (httptext) {
		var packageUrl = scrapeTagValue (httptext, "linkHosting");
		var params = {
			TableName: myTableName,
			Item: {
				name: {"S": recordkey},
				opmlUrl: {"S": opmlUrl},
				packageUrl: {"S": packageUrl},
				whenCreated: {"S": new Date ().toString ()}
				}
			};
		db.putItem (params, function (err, data) {
			if (callback != undefined) {
				callback (err, data);
				}
			});
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
var isNumeric = function (ch) {
	return ((ch >= '0') && (ch <= '9'));
	}
var cleanName = function (name) {
	var s = "";
	for (var i = 0; i < name.length; i++) {
		var ch = name [i];
		if (isAlpha (ch) || isNumeric (ch)) {
			s += ch;
			}
		}
	return (s.toLowerCase (s));
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
		writeStaticFile (s3path + path, htmltext, "text/html");
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
var server = http.createServer (function (httpRequest, httpResponse) {
	console.log (httpRequest.url);
	
	var parsedUrl = urlpack.parse (httpRequest.url, true);
	
	switch (parsedUrl.pathname.toLowerCase ()) {
		case "/pingpackage":
			httpResponse.writeHead (200, {"Content-Type": "application/json"});
			
			handlePackagePing (parsedUrl.query.link);
			
			var x = {"url": parsedUrl.query.link};
			var s = "getData (" + JSON.stringify (x) + ")";
			httpResponse.end (s);    
			
			break;
		case "/isnameavailable":
			var name = cleanName (parsedUrl.query.name);
			
			httpResponse.writeHead (200, {"Content-Type": "text/html"});
			
			if (name.length == 0) {
				httpResponse.end ("");    
				}
			else {
				if (name.length < 4) {
					httpResponse.end ("Name must be 4 or more characters.");
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
						httpResponse.end ("<span style=\"color: " + color + ";\">" + name + "." + myDomain + " " + answer + " available.</span>")
						});
					}
				}
			
			break;
		case "/newoutlinename":
			var recordkey = cleanName (parsedUrl.query.name), url = parsedUrl.query.url;
			
			console.log ("Create new outline name: " + recordkey + ", url=" + url);
			
			httpResponse.writeHead (200, {"Content-Type": "application/json"});
			
			if (url == undefined) {
				var x = {flError: true, errorString: "Can't assign the name because there is no <i>url</i> parameter provided."};
				console.log ("No url parameter.");
				httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
				}
			else {
				isNameDefined (recordkey, function (fldefined) {
					if (fldefined) {
						var x = {flError: true, errorString: "Can't assign the name '" + recordkey + "' to the outline because there already is an outline with that name."};
						console.log ("Name is defined.");
						httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
						}
					else {
						addNameRecord (recordkey, url, function (err, data) {
							if (err) {
								console.log ("There was an error: " + JSON.stringify (err));
								httpResponse.end ("getData (" + JSON.stringify (err) + ")");    
								}
							else {
								var x = {flError: false, name: recordkey + "." + myDomain};
								console.log ("No error: " + recordkey + "." + myDomain);
								httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
								}
							});
						}
					});
				}
			break;
		case "/version":
			httpResponse.writeHead (200, {"Content-Type": "text/plain"});
			httpResponse.end (myVersion);    
			break;
		default:
			httpResponse.writeHead (404, {"Content-Type": "text/plain"});
			httpResponse.end ("404 Not Found");
			break;
		}
	});
server.listen (1337);
