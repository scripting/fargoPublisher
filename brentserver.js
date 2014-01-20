//Copyright 2014, Small Picture, Inc.
	//1/19/14 by DW
		//This is a shell for developing the functionality of the Fargo back-end.
		//When done, it will take requests saying that a named outline has updated.
		//It will know how to find the OPML, and from there, to find a "package" of updates.
		//Which it will then parse, and upload to a bucket on S3.
		//Still have a ways to go, but it's fun, and a lot is working! :-)

var AWS = require ("aws-sdk");
var s3 = new AWS.S3 ();
var http = require ("http");

//parseUri 1.2.2
	// (c) Steven Levithan <stevenlevithan.com>
	// MIT License
	http://blog.stevenlevithan.com/archives/parseuri
	
	function parseUri (str) {
		var	o   = parseUri.options,
			m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
			uri = {},
			i   = 14;
	
		while (i--) uri[o.key[i]] = m[i] || "";
	
		uri[o.q.name] = {};
		uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
			if ($1) uri[o.q.name][$1] = $2;
		});
	
		return uri;
	};
	
	parseUri.options = {
		strictMode: false,
		key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
		q:   {
			name:   "queryKey",
			parser: /(?:^|&)([^&=]*)=?([^&]*)/g
		},
		parser: {
			strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
			loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
		}
	};
var httpReadUrl = function (url, callback) {
	var httpoptions, httptext = "", httpmethod = "GET";
	//set httpoptions with info from url
		var x = parseUri (url);
		if (x.port.length == 0) {
			x.port = "80";
			}
		httpoptions = {
			host: x.host,
			port: x.port,
			path: x.path,
			method: httpmethod
			};
	var req = http.request (httpoptions, function (res) {
		res.setEncoding ("utf8");
		res.on ("data", function (chunk) {
			httptext += chunk;
			});
		res.on ("end", function () {
			callback (httptext);
			});
		});
	req.on ("error", function (e) {
		console.log ("httpReadUrl error: " + e.message);
		});
	req.end ();
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
		httpReadUrl ("http://" + bucketname + "/" + path, function (s) {
			console.log ("httpReadUrl: " + s + ".");
			});
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
	writeStaticFile ("/tmp.scripting.com/testing/" + padWithZeros (counter, 4) + ".txt", new Date ().toString ());
	counter++;
	});
server.listen (1337);
