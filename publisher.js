//Copyright 2014-2015, Small Picture, Inc.
	//Last update: &lt;%now%&gt; Eastern.
var myVersion = "0.97", myProductName = "Fargo Publisher"; 

var http = require ("http");
var request = require ("request");
var urlpack = require ("url");
var AWS = require ("aws-sdk");
var s3 = new AWS.S3 ();
var dns = require ("dns");
var os = require ("os");
var fs = require ("fs"); //5/10/15 by DW

var fnameConfig = "config.json"; //5/9/15 by DW

var s3HostingPath = process.env.fpHostingPath; //where we store all the users' HTML and XML files
var s3defaultType = "text/plain";
var s3defaultAcl = "public-read";

var s3DataPath = process.env.fpDataPath;
var s3NamesPath; 
var s3StatsPath; 
var s3SPrefsPath; 
var s3SScriptsPath; 

var myDomain = process.env.fpDomain; //something like smallpict.com

var flRedirect = process.env.fpRedirect; //if false, we just return the content from the s3 cache, instead of redirecting to it -- 2/17/14 by DW
if (flRedirect == undefined) {
	flRedirect = true;
	}
else {
	flRedirect = getBoolean (flRedirect);
	}

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
function stringContains (s, whatItMightContain, flUnicase) { //11/9/14 by DW
	if (flUnicase === undefined) {
		flUnicase = true;
		}
	if (flUnicase) {
		s = s.toLowerCase ();
		whatItMightContain = whatItMightContain.toLowerCase ();
		}
	return (s.indexOf (whatItMightContain) != -1);
	}
function stringCountFields (s, chdelim) {
	var ct = 1;
	if (s.length == 0) {
		return (0);
		}
	for (var i = 0; i < s.length; i++) {
		if (s [i] == chdelim) {
			ct++;
			}
		}
	return (ct)
	}
function stringNthField (s, chdelim, n) {
	var splits = s.split (chdelim);
	if (splits.length >= n) {
		return splits [n-1];
		}
	return ("");
	}
function isAlpha (ch) {
	return (((ch >= 'a') && (ch <= 'z')) || ((ch >= 'A') && (ch <= 'Z')));
	}
function isNumeric (ch) {
	return ((ch >= '0') && (ch <= '9'));
	}
function secondsSince (when) { //2/24/14 by DW
	var now = new Date ();
	return ((now - when) / 1000);
	}
function kilobyteString (num) { //1/24/15 by DW
	num = Number (num) / 1024;
	return (num.toFixed (2) + "K");
	}
function megabyteString (num) { //1/24/15 by DW
	var onemeg = 1024 * 1024;
	if (num <= onemeg) {
		return (kilobyteString (num));
		}
	num = Number (num) / onemeg;
	return (num.toFixed (2) + "MB");
	}
function gigabyteString (num) { //1/24/15 by DW
	var onegig = 1024 * 1024 * 1024;
	if (num <= onegig) {
		return (megabyteString (num));
		}
	num = Number (num) / onegig;
	return (num.toFixed (2) + "GB");
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
function getBoolean (val) { 
	switch (typeof (val)) {
		case "string":
			if (stringLower (val) == "true") {
				return (true);
				}
			break;
		case "boolean":
			return (val);
			break;
		case "number":
			if (val == 1) {
				return (true);
				}
			break;
		}
	return (false);
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
function statsAddToHttpLog (httpRequest, urlRedirect, errorMessage, startTime) { //2/11/14 by DW
	var host = httpRequest.headers.host, url = httpRequest.url, ip = httpRequest.connection.remoteAddress, now = new Date ();
	if (startTime == undefined) {
		startTime = new Date ();
		}
	serverStats.ctHits++;
	serverStats.ctHitsThisRun++;
	serverStats.version = myVersion;  //2/24/14 by DW
	if (!sameDay (serverStats.today, now)) { //date rollover
		serverStats.today = now;
		serverStats.ctHitsToday = 0;
		}
	serverStats.ctHitsToday++;
	
	var obj = new Object ();
	obj.when = now.toUTCString ();
	obj.secs = secondsSince (startTime); //2/24/14 by DW
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
function loadServerStats (callback) {
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
		if (callback !== undefined) {
			callback ();
			}
		});
	}
function loadServerPrefs (callback) {
	s3GetObject (s3SPrefsPath + namePrefsFile, function (data) {
		if (data != null) {
			serverPrefs = JSON.parse (data.Body);
			}
		if (callback !== undefined) {
			callback ();
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
function handleRequest (httpRequest, httpResponse) { //5/10/15 by DW
	try {
		var parsedUrl = urlpack.parse (httpRequest.url, true);
		var lowercasepath = parsedUrl.pathname.toLowerCase ();
		var now = new Date (), nowstring = now.toString ();
		var host, port, lowerhost, referrer;
		
		//set host, port -- 5/10/15 by DW
			host = httpRequest.headers.host;
			if (stringContains (host, ":")) {
				port = stringNthField (host, ":", 2);
				host = stringNthField (host, ":", 1);
				}
			else {
				port = 80;
				}
			lowerhost = host.toLowerCase ();
		//handle HEAD request
			if (httpRequest.method == "HEAD") {
				httpRequest.end ("");
				return;
				}
		//handle redirect through the prefs/redirects table -- 2/11/14 by DW
			if ((serverPrefs != undefined) && (serverPrefs.redirects != undefined)) {
				if (serverPrefs.redirects [lowerhost] != undefined) {
					var newurl = "http://" + serverPrefs.redirects [lowerhost] + parsedUrl.pathname;
					httpResponse.writeHead (302, {"location": newurl});
					statsAddToHttpLog (httpRequest, newurl, undefined, now); 
					httpResponse.end ("302 REDIRECT");    
					return;
					}
				}
			
		//handle redirect through the domain we're managing -- 5/10/15 by DW
			var flhosted = false, lowerdomain = myDomain.toLowerCase (), usethishost;
			if (endsWith (lowerhost, lowerdomain)) {
				flhosted = true;
				usethishost = host;
				}
			else {
				var forwardedhost = httpRequest.headers ["x-forwarded-host"];
				if (forwardedhost !== undefined) {
					if (endsWith (forwardedhost.toLowerCase (), lowerdomain)) {
						flhosted = true;
						usethishost = forwardedhost;
						}
					}
				}
			if (flhosted) { //something like dave.smallpict.com
				var s3path = s3HostingPath + getNameFromSubdomain (usethishost) + parsedUrl.pathname;
				if (flRedirect) { //2/17/14 by DW
					var newurl = "http:/" + s3path;
					httpResponse.writeHead (302, {"location": newurl});
					statsAddToHttpLog (httpRequest, newurl, undefined, now); 
					httpResponse.end ("302 REDIRECT");    
					}
				else {
					var contentType = "text/html";
					
					if (endsWith (s3path, "/")) { //2/19/14 by DW
						s3path += "index.html";
						}
					
					if (parsedUrl.pathname.toLowerCase () == "/favicon.ico") { //2/26/14 by DW
						s3path = "/fargo.io/favicon.ico";
						contentType = "image/gif";
						}
					
					s3GetObject (s3path, function (data) {
						if (data == null) {
							s3GetObject (s3path + "/index.html", function (data) {
								if (data == null) {
									httpResponse.writeHead (404, {"Content-Type": "text/plain"});
									statsAddToHttpLog (httpRequest, undefined, undefined, now); 
									httpResponse.end ("There is no content to display at \"" + s3path + "\".");
									}
								else {
									httpResponse.writeHead (200, {"Content-Type": contentType});
									statsAddToHttpLog (httpRequest, undefined, undefined, now); 
									httpResponse.end (data.Body);    
									}
								});
							}
						else {
							httpResponse.writeHead (200, {"Content-Type": contentType});
							statsAddToHttpLog (httpRequest, undefined, undefined, now); 
							httpResponse.end (data.Body);    
							}
						});
					}
				console.log (now.toLocaleTimeString () + ": " + s3HostingPath + getNameFromSubdomain (usethishost) + parsedUrl.pathname);
				return;
				}
		//set referrer -- 5/10/15 by DW
			referrer = httpRequest.headers.referer;
			if (referrer == undefined) {
				referrer = "";
				}
			
		//log the request -- 5/10/15 by DW
			var client = httpRequest.connection.remoteAddress;
			if (httpRequest.headers ["x-forwarded-for"] !== undefined) {
				client = httpRequest.headers ["x-forwarded-for"];
				}
			dns.reverse (client, function (err, domains) {
				var freemem = gigabyteString (os.freemem ()); //1/24/15 by DW
				if (!err) {
					if (domains.length > 0) {
						client = domains [0];
						}
					}
				console.log (now.toLocaleTimeString () + " " + freemem + " " + httpRequest.method + " " + host + ":" + port + " " + lowercasepath + " " + referrer + " " + client);
				});
		
		switch (lowercasepath) {
			case "/pingpackage":
				httpResponse.writeHead (200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "fargo.io"});
				
				handlePackagePing (parsedUrl.query.link);
				
				var x = {"url": parsedUrl.query.link};
				var s = "getData (" + JSON.stringify (x) + ")";
				
				statsAddToHttpLog (httpRequest, undefined, undefined, now); 
				httpResponse.end (s);    
				
				break;
			case "/isnameavailable":
				function sendStringBack (s) {
					var x = {"message": s};
					statsAddToHttpLog (httpRequest, undefined, undefined, now); 
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
				
				consoleLog ("Create new outline name: " + recordkey + ", url=" + url);
				
				httpResponse.writeHead (200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "fargo.io"});
				
				if (url == undefined) {
					var x = {flError: true, errorString: "Can't assign the name because there is no <i>url</i> parameter provided."};
					statsAddToHttpLog (httpRequest, undefined, x.errorString, now); 
					httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
					}
				else {
					isNameDefined (recordkey, function (fldefined) {
						if (fldefined) {
							var x = {flError: true, errorString: "Can't assign the name '" + recordkey + "' to the outline because there already is an outline with that name."};
							statsAddToHttpLog (httpRequest, undefined, x.errorString, now); 
							httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
							}
						else {
							addNameRecord (recordkey, url, function (err, data) {
								if (err) {
									statsAddToHttpLog (httpRequest, undefined, err, now); 
									httpResponse.end ("getData (" + JSON.stringify (err) + ")");    
									}
								else {
									var x = {flError: false, name: recordkey + "." + myDomain};
									statsAddToHttpLog (httpRequest, undefined, undefined, now); 
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
						statsAddToHttpLog (httpRequest, undefined, undefined, now); 
						httpResponse.end ("getData (" + JSON.stringify (x) + ")");    
						}
					});
				break;
			case "/version":
				httpResponse.writeHead (200, {"Content-Type": "text/plain"});
				statsAddToHttpLog (httpRequest, undefined, undefined, now); 
				httpResponse.end (myVersion);    
				break;
			case "/now": //2/9/14 by DW
				httpResponse.writeHead (200, {"Content-Type": "text/plain", "Access-Control-Allow-Origin": "*"});
				httpResponse.end (nowstring);    
				statsAddToHttpLog (httpRequest, undefined, undefined, now); 
				break;
			case "/httpreadurl": //2/10/14 by DW
				var type = "text/plain";
				httpReadUrl (parsedUrl.query.url, function (s) {
					if (parsedUrl.query.type != undefined) {
						type = parsedUrl.query.type;
						}
					httpResponse.writeHead (200, {"Content-Type": type, "Access-Control-Allow-Origin": "*"});
					statsAddToHttpLog (httpRequest, undefined, undefined, now); 
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
				statsAddToHttpLog (httpRequest, undefined, undefined, now); 
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
						statsAddToHttpLog (httpRequest, undefined, undefined, now); 
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
			case "/getenclosureinfo": //2/15/14 by DW
				if (parsedUrl.query.url != undefined) {
					var options = {
						uri: parsedUrl.query.url,
						method: "HEAD"
						};
					request (options, function (error, response, body) {
						var flhaveresult = false;
						if (!error) {
							if (response.statusCode == 200) {
								httpResponse.writeHead (200, {"Content-Type": "application/json"});
								statsAddToHttpLog (httpRequest, undefined, undefined, now); 
								httpResponse.end ("getData (" + JSON.stringify ({length: response.headers ["content-length"], type: response.headers ["content-type"]}) + ")");    
								flhaveresult = true;
								}
							}
						if (!flhaveresult) {
							httpResponse.writeHead (200, {"Content-Type": "application/json"});
							httpResponse.end ("getData (" + JSON.stringify ({flError: true}) + ")");
							}
						});
					}
				break;
			default: //see if it's in the scripts folder, if not 404 -- 4/5/14 by DW
				var scriptpath = s3SScriptsPath + lowercasepath.substr (1) + ".js"; //drop leading / on lowercasepath
				s3GetObject (scriptpath, function (data) {
					if (data == null) {
						httpResponse.writeHead (404, {"Content-Type": "text/plain"});
						httpResponse.end ("\"" + parsedUrl.pathname + "\" is not one of the endpoints defined by the Fargo Publisher API.");
						}
					else {
						try {
							var val = eval (data.Body.toString ());
							statsAddToHttpLog (httpRequest, undefined, undefined, now); 
							httpResponse.writeHead (200, {"Content-Type": "text/html"});
							httpResponse.end (val.toString ());    
							}
						catch (err) {
							httpResponse.writeHead (503, {"Content-Type": "text/plain"});
							httpResponse.end (err.message);    
							}
						}
					});
				break;
				
			}
		}
	catch (tryError) {
		statsAddToHttpLog (httpRequest, undefined, tryError.message, now); 
		httpResponse.writeHead (500, {"Content-Type": "text/plain", "Access-Control-Allow-Origin": "*"});
		httpResponse.end (tryError.message);    
		}
	}
function loadConfig (callback) { //5/10/15 by DW
	fs.readFile (fnameConfig, function (err, data) {
		if (!err) {
			var config = JSON.parse (data.toString ());
			if (config.fpHostingPath !== undefined) {
				s3HostingPath = config.fpHostingPath;
				}
			if (config.fpDataPath !== undefined) {
				s3DataPath = config.fpDataPath;
				}
			if (config.fpDomain !== undefined) {
				myDomain = config.fpDomain;
				}
			if (config.fpRedirect !== undefined) {
				flRedirect = config.fpRedirect;
				}
			if (config.fpServerPort !== undefined) {
				myPort = config.fpServerPort;
				}
			}
		if (callback !== undefined) {
			callback ();
			}
		});
	}

function startup () {
	loadConfig (function () {
		s3NamesPath = s3DataPath + "names/"; 
		s3StatsPath = s3DataPath + "stats/"; 
		s3SPrefsPath = s3DataPath + "prefs/"; 
		s3SScriptsPath = s3DataPath + "scripts/"; 
		loadServerPrefs (function () {
			loadServerStats (function () {
				console.log ("\n" + myProductName + " v" + myVersion + " on port " + myPort + ".");
				console.log ("\nS3 data path == " + s3DataPath);
				console.log ("Domain == " + myDomain);
				console.log ("Redirect == " + getBoolean (flRedirect));
				console.log ("");
				http.createServer (handleRequest).listen (myPort);
				});
			});
		});
	}

startup ();

