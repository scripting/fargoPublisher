//Copyright 2014, Small Picture, Inc.
	//Last update: 2/13/2014; 11:52:54 AM Eastern.
var http = require ("http");
var request = require ("request");
var urlpack = require ("url");
var AWS = require ("aws-sdk");
var s3 = new AWS.S3 ();
var dns = require ("dns");

var myVersion = "0.86"; 

var s3HostingPath = process.env.fpHostingPath; //where we store all the users' HTML and XML files
var s3defaultType = "text/plain";
var s3defaultAcl = "public-read";

var s3DataPath = process.env.fpDataPath;
var s3NamesPath = s3DataPath + "names/"; 
var s3StatsPath = s3DataPath + "stats/"; 
var s3SPrefsPath = s3DataPath + "prefs/"; 

var myDomain = process.env.fpDomain; //something like smallpict.com

var myPort;
if (process.env.PORT == undefined) { //it's not Heroku -- 2/1/14 by DW
	myPort = process.env.fpServerPort;
	}
else {
	myPort = process.env.PORT;
	}
if (myPort == undefined) {
	myPort = 80;
	}

var maxChanges = 100, nameChangesFile = "changes.json";
var maxHttpLog = 500, nameHttpLogFile = "httpLog.json";

var serverPrefs; //loaded at startup from prefs.json in the prefs folder on S3 -- 2/11/14 by DW
var namePrefsFile = "prefs.json";

var serverStats = {
	today: 0,
	ctHits: 0, 
	ctHitsThisRun: 0,
	ctHitsToday: 0,
	whenServerStart: 0,
	httpLog: []
	};

var urlsChangedData = []; //used in the /httpurlschanged endpoint -- 2/13/14 by DW


function consoleLog (s) {
	console.log (new Date ().toLocaleTimeString () + " -- " + s);
	}
function stringLower (s) {
	return (s.toLowerCase ());
	}
function endsWith (s, possibleEnding, flUnicase) {
	if ((s == undefined) || (s.length == 0)) { 
		return (false);
		}
	var ixstring = s.length - 1;
	if (flUnicase == undefined) {
		flUnicase = true;
		}
	if (flUnicase) {
		for (var i = possibleEnding.length - 1; i >= 0; i--) {
			if (stringLower (s [ixstring--]) != stringLower (possibleEnding [i])) {
				return (false);
				}
			}
		}
	else {
		for (var i = possibleEnding.length - 1; i >= 0; i--) {
			if (s [ixstring--] != possibleEnding [i]) {
				return (false);
				}
			}
		}
	return (true);
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
function getNameFromSubdomain (subdomain) {
	var sections = subdomain.split (".");
	return (sections [0]);
	}
function tcpGetMyIpAddress () {
	var interfaces = require ("os").networkInterfaces ();
	for (var devName in interfaces) {
		var iface = interfaces [devName];
		for (var i = 0; i < iface.length; i++) {
			var alias = iface [i];
			if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
				return (alias.address);
				}
		}
	return ("0.0.0.0");
	}
function tcpGetDomainName (ip, callback) {
	dns.reverse (ip, function (err, domains) {
		if (err != null) {
			callback (ip); //use the IP address in place of the domain name
			}
		else {
			callback (domains); 
			}
		});
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
function sameDay (d1, d2) { 
	//returns true if the two dates are on the same day
	d1 = new Date (d1);
	d2 = new Date (d2);
	return ((d1.getFullYear () == d2.getFullYear ()) && (d1.getMonth () == d2.getMonth ()) && (d1.getDate () == d2.getDate ()));
	}
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
		if (callback != undefined) {
			callback (err, data);
			}
		});
	}
function s3Redirect (path, url) { //1/30/14 by DW -- doesn't appear to work -- don't know why
	var splitpath = s3SplitPath (path);
	var params = {
		WebsiteRedirectLocation: url,
		Bucket: splitpath.Bucket,
		Key: splitpath.Key,
		Body: " "
		};
	s3.putObject (params, function (err, data) { 
		if (err != null) {
			consoleLog ("s3Redirect: err.message = " + err.message + ".");
			}
		else {
			consoleLog ("s3Redirect: path = " + path + ", url = " + url + ", data = ", JSON.stringify (data));
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
	s3NewObject (s3NamesPath + name + ".json", JSON.stringify (obj, undefined, 3), "text/plain", "public-read", function (err, data) {
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
	s3GetObjectMetadata (s3NamesPath + name + ".json", function (metadata) {
		callback (metadata != null);
		});
	}
function getNameRecord (name, callback) {
	s3GetObject (s3NamesPath + name + ".json", function (data) {
		if (data == null) {
			callback (null);
			}
		else {
			callback (data.Body);
			}
		});
	}
function statsAddToChanges (url) { //add an item to changes.json -- 1/29/14 by DW
	var path = s3StatsPath + nameChangesFile;
	s3GetObject (path, function (data) {
		var changes, obj = new Object (), ctupdates = 0;
		
		if (data == null) {
			changes = new Array ();
			}
		else {
			changes = JSON.parse (data.Body);
			}
		
		for (var i = changes.length - 1; i >= 0; i--) { //delete all other instances of the url in the array
			if (changes [i].url == url) {
				if (changes [i].ct != undefined) {
					ctupdates = changes [i].ct;
					}
				changes.splice (i, 1);
				}
			}
		
		obj.url = url;  //add at beginning of array
		obj.when = new Date ().toString ();
		obj.ct = ++ctupdates;
		
		changes.unshift (obj);
		
		while (changes.length > maxChanges) { //keep array within max size
			changes.pop ();
			}
		
		s3NewObject (path, JSON.stringify (changes, undefined, 3));
		});
	}
function statsAddToHttpLog (httpRequest, urlRedirect, errorMessage) { //2/11/14 by DW
	var host = httpRequest.headers.host, url = httpRequest.url, ip = httpRequest.connection.remoteAddress, now = new Date ();
	
	serverStats.ctHits++;
	serverStats.ctHitsThisRun++;
	if (!sameDay (serverStats.today, now)) { //date rollover
		serverStats.today = now;
		serverStats.ctHitsToday = 0;
		}
	serverStats.ctHitsToday++;
	
	var obj = new Object ();
	obj.when = new Date ().toUTCString ();
	obj.url = "http://" + host + url;
	if (urlRedirect != undefined) {
		obj.urlRedirect = urlRedirect;
		}
	if (errorMessage != undefined) {
		obj.errorMessage = errorMessage;
		}
	
	function finishLogAdd () {
		serverStats.httpLog.unshift (obj);  //add at beginning of array
		while (serverStats.httpLog.length > maxHttpLog) { //keep array within max size
			serverStats.httpLog.pop ();
			}
		s3NewObject (s3StatsPath + nameHttpLogFile, JSON.stringify (serverStats, undefined, 3));
		}
	
	if (ip != undefined) {
		tcpGetDomainName (ip, function (domains) {
			obj.clientIp = ip;
			obj.clientNames = domains;
			finishLogAdd ();
			});
		}
	else {
		finishLogAdd ();
		}
	
	}
function loadServerStats () {
	s3GetObject (s3StatsPath + nameHttpLogFile, function (data) {
		if (data != null) {
			serverStats = JSON.parse (data.Body);
			serverStats.ctHitsThisRun = 0;
			if (serverStats.ctHitsToday == undefined) {
				serverStats.ctHitsToday = 0;
				}
			if (serverStats.today == undefined) {
				serverStats.today = new Date ().toUTCString ();
				}
			serverStats.whenServerStart = new Date ().toUTCString ();
			}
		});
	}
function loadServerPrefs () {
	s3GetObject (s3SPrefsPath + namePrefsFile, function (data) {
		if (data != null) {
			serverPrefs = JSON.parse (data.Body);
			consoleLog ("loadServerPrefs: " + data.Body);
			}
		});
	}
function parsePackages (name, s) { //name is something like "dave"
	var magicpattern = "<[{~#--- ", ix, path, htmltext, ctfiles = 0, ctchars = 0;
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
			ctfiles++;
			ctchars += htmltext.length;
			}
		}
	consoleLog (ctfiles + " files written, " + ctchars + " chars.");
	}
function handlePackagePing (subdomain) { //something like http://dave.smallpict.com/
	var parsedUrl = urlpack.parse (subdomain, true);
	var host = parsedUrl.host;
	
	if (host == undefined) { //1/31/14 by DW
		return;
		}
	if (!endsWith (host, myDomain)) { //1/29/14 by DW -- not one of our domains
		return;
		}
	
	var sections = host.split (".");
	var name = sections [0];
	
	consoleLog ("Ping received: " + host);
	
	getNameRecord (name, function (jsontext) {
		if (jsontext == null) {
			consoleLog ("Can't handle the package ping for the outline named \"" + name + "\" because there is no outline with that name.");
			}
		else {
			var obj = JSON.parse (jsontext);
			httpReadUrl (obj.opmlUrl, function (httptext) {
				var urlpackage = scrapeTagValue (httptext, "linkHosting");
				httpReadUrl (urlpackage, function (packagetext) {
					parsePackages (name, packagetext);
					
					obj.whenLastUpdate = new Date ().toString ();
					obj.urlRedirect = "http:/" + s3HostingPath + name + "/"; 
					
					if (obj.ctUpdates == undefined) { //1/31/14 by DW
						obj.ctUpdates = 0;
						}
					obj.ctUpdates++;
					
					updateNameRecord (name, obj);
					
					statsAddToChanges (subdomain); //add it to changes.json -- 1/29/14 by DW
					});
				});
			}
		});
	}

//initial console messages
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
//get previous stats, prefs -- 2/11/14 by DW
	loadServerPrefs ();
	loadServerStats ();

http.createServer (function (httpRequest, httpResponse) {
	try {
		var parsedUrl = urlpack.parse (httpRequest.url, true);
		var lowercasepath = parsedUrl.pathname.toLowerCase ();
		var now = new Date (), nowstring = now.toString ();
		var host = httpRequest.headers.host;
		var lowerhost = host.toLowerCase ();
		
		//handle HEAD request
			if (httpRequest.method == "HEAD") {
				httpRequest.end ("");
				return;
				}
		//handle redirect through the prefs/redirects table -- 2/11/14 by DW
			if (serverPrefs.redirects [lowerhost] != undefined) {
				var newurl = "http://" + serverPrefs.redirects [lowerhost] + parsedUrl.pathname;
				httpResponse.writeHead (302, {"location": newurl});
				statsAddToHttpLog (httpRequest, newurl); 
				httpResponse.end ("302 REDIRECT");    
				return;
				}
		//handle redirect through the domain we're managing -- 2/10/14 by DW
			var lowerdomain = myDomain.toLowerCase ();
			if (endsWith (lowerhost, lowerdomain)) { //something like dave.smallpict.com
				var newurl = "http:/" + s3HostingPath + getNameFromSubdomain (host) + parsedUrl.pathname;
				httpResponse.writeHead (302, {"location": newurl});
				statsAddToHttpLog (httpRequest, newurl); 
				httpResponse.end ("302 REDIRECT");    
				return;
				}
		statsAddToHttpLog (httpRequest); 
		
		switch (lowercasepath) {
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
				
				consoleLog ("Is name available? name == " + name);
				
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
				
				consoleLog ("Create new outline name: " + recordkey + ", url=" + url);
				
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
				httpResponse.writeHead (200, {"Content-Type": "text/plain"});
				httpResponse.end (myVersion);    
				break;
			case "/now": //2/9/14 by DW
				httpResponse.writeHead (200, {"Content-Type": "text/plain", "Access-Control-Allow-Origin": "*"});
				httpResponse.end (nowstring);    
				break;
			case "/httpreadurl": //2/10/14 by DW
				var type = "text/plain";
				httpReadUrl (parsedUrl.query.url, function (s) {
					if (parsedUrl.query.type != undefined) {
						type = parsedUrl.query.type;
						}
					httpResponse.writeHead (200, {"Content-Type": type, "Access-Control-Allow-Origin": "*"});
					httpResponse.end (s);    
					});
				break;
			case "/status": //2/11/14 by DW
				var myStatus = {
					version: myVersion, 
					now: now.toUTCString (), 
					whenServerStart: new Date (serverStats.whenServerStart).toUTCString (), 
					hits: serverStats.ctHits, 
					hitsToday: serverStats.ctHitsToday
					};
				httpResponse.writeHead (200, {"Content-Type": "text/plain", "Access-Control-Allow-Origin": "*"});
				httpResponse.end (JSON.stringify (myStatus, undefined, 4));    
				break;
			case "/httpurlschanged": //2/13/14 by DW
				var urlarray = [], returnstruct = {url: []}, ct = 1;
				function doArrayCheck (urlarray, ix, callback) {
					if (ix < urlarray.length) {
						var url = urlarray [ix], eTag = "";
						if (urlsChangedData [url] != undefined) {
							if (urlsChangedData [url].etag != undefined) {
								eTag = urlsChangedData [url].etag;
								}
							}
						var options = {
							uri: url,
							headers: {}
							};
						if (eTag.length > 0) {
							options.headers ["If-None-Match"] = eTag;
							}
						request (options, function (error, response, body) {
							if (!error) {
								if ((response.statusCode == 200) || (response.statusCode == 304)) {
									if (callback != undefined) {
										callback (ix, response, body);
										}
									doArrayCheck (urlarray, ix + 1, callback);
									}
								}
							});
						}
					else {
						httpResponse.writeHead (200, {"Content-Type": "application/json"});
						httpResponse.end ("getData (" + JSON.stringify (returnstruct) + ")");    
						
						}
					}
				while (true) { //get the urlX params into urlarray
					var paramname = "url" + ct++;
					if (parsedUrl.query [paramname] == undefined) { //ran out of urls
						break;
						}
					urlarray [urlarray.length] = parsedUrl.query [paramname];
					}
				
				doArrayCheck (urlarray, 0, function (ixarray, response, body) {
					var url = urlarray [ixarray], now = new Date ();
					if (urlsChangedData [url] == undefined) {
						var obj = new Object ();
						obj.whenLastCheck = now;
						obj.ctChecks = 0;
						obj.ctChanges = 0;
						urlsChangedData [url] = obj;
						}
					if (response.headers.etag != undefined) {
						urlsChangedData [url].etag = response.headers.etag;
						}
					urlsChangedData [url].whenLastCheck = now;
					urlsChangedData [url].ctChecks++;
					consoleLog ("callback: urlsChangedData [" + url + "] == " + JSON.stringify (urlsChangedData [url]));
					if (response.statusCode == 304) { //no change
						returnstruct.url [ixarray] = urlsChangedData [url].whenLastChange.toUTCString ();
						}
					else {
						urlsChangedData [url].ctChanges++;
						urlsChangedData [url].whenLastChange = now;
						returnstruct.url [ixarray] = now.toUTCString ();
						}
					});
				
				break;
			default:
				httpResponse.writeHead (404, {"Content-Type": "text/plain"});
				httpResponse.end ("\"" + parsedUrl.pathname + "\" is not one of the endpoints defined by the Fargo Publsiher API.");
				break;
			}
		}
	catch (tryError) {
		statsAddToHttpLog (httpRequest, undefined, tryError.message); 
		}
	}).listen (myPort);
