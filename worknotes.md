### 4/23/14 by DW

<a href="http://fargo.io/blog/2014/04/23/fargoPublisher095.html">v0.95</a> -- Add the ability to define pages in Fargo Publisher in JavaScript script. 



### 3/21/14 by DW

v0.93 -- Make sure serverPrefs is defined and serverPrefs.redirects is defined, before trying to redirect through that table. 



### 3/12/14 by DW

<a href="http://fargo.io/blog/2014/03/12/fargoPublisher092.html">v0.92</a> -- If we get the address of a folder, and the folder contains an index.html file, serve that file. Pretty standard server behavior. 



### 2/24/14 by DW

v0.90 -- New item in the httpLog.json file, the number of seconds it took to process the request. Using this to monitor the server to see if increased traffic is causing it to slow down. 



### 2/19/14 AM by DW

v0.89 -- if we're not redirecting, and the path ends with "/", get index.html. Pretty standard server stuff.



### 2/17/14 by DW

<a href="http://fargo.io/blog/2014/02/17/fargoPublisher088.html">v.088</a> implements a new configuration option, whether you want Publisher to redirect to the content stored on S3 or serve it directly. 



### 2/15/14 by DW

v0.87 implements the getenclosureinfo endpoint. It takes a URL as a parameter, and returns the length and type of the file it points to. This is used in creating the &lt;enclosure> elements in RSS feeds.



### 2/13/14 by DW

v0.86 implements the httpurlschanged enpoint. It gets a set of URLs and returns the dates when they last changed. Used in the <a href="http://fargo.io/docs/workgroup.html">Fargo for Workgroups</a> feature. 



### 2/12/14 by DW

Version 0.85 implements hits-all-time and hits-today, and rolls over the date at midnight GMT.

Version 0.84 does a reverse DNS lookup on the client IP address. However it doesn't yield much useful info, as you can see from my <a href="http://beta.fargo.io/data/stats/httpLog.json">httpLog file</a>.



### 2/11/14 by DW

Version 0.83 fixes bugs added in 0.82. Hardened the server, so it reports its own errors in the log file instead of crashing. 

Version 0.82. Maintain a new stats file, httpLog.json.

Version 0.81. Fixed a bug where redirects would recurse indefinitely. 

<a href="http://fargo.io/blog/2014/02/11/fargoPublisher080.html">Version 0.80</a>. Two new API endpoints, one that returns server status in JSON, for monitoring apps and one that does an HTTP request for Fargo running in the browser. 



### 2/10/14 by DW

<a href="http://fargo.io/blog/2014/02/10/newReleaseOfFargoPublisher.html">Updated publisher</a> to version 0.79. Now it redirects to user sites if you point the domain at the server.



### 2/9/14 by DW

<a href="http://scripting.com/2014/02/06/herokuForPoetsBeta.html">Heroku How To</a>: Get your own Fargo Publisher server running on Heroku. 

<a href="http://scripting.com/2014/02/09/whyFargo2TechnologyIsInteresting.html">Why Fargo 2 technology is exciting</a>. How the new CMS hooks into Fargo Publisher. 



### 1/30/14 by DW

There's now a "ct" in each element in changes.json, which counts the number of times the site has been updated.



### 1/29/14 by DW

The first stats file is being maintained, <a href="http://beta.fargo.io/data/stats/changes.json">changes.json</a>.

It's a reverse-chronologic list of updated outlines. 

Patterned after <a href="http://www.weblogs.com/api.html#10">changes.xml</a> which we used to bootstrap weblogs.com, in 2000.



### 1/28/14 by DW

Got boston.scripting.com:5337 up, running the latest publisher.js.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Hooked it up to Fargo -- it works.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Got redirects to work, with a module on Buffalo server. 

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Because Boston is running on port 5337 and not 80, I had to have this running in Frontier for now.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Going to let this config settle in for a bit, and get everyone ready for a public beta of Fargo2.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Nodejitsu didn't work out for deploying fargoPublisher. I wrote it up on the Fargo2 list.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Now we don't really have a cloning strategy for poets to run the server. 





### 1/27/14 by DW

Spent the day getting node.js set up on a Linux instance on Amazon. Lots of learning. Many thanks for Dan MacTough for guiding me through it! :-)

Along the way I thought I found out why my instance stopped loading on Nodejitsu (didn't turn out to be the problem though). I changed the app from running on port 1337 to port 80. There's a Unix rule that only root can run on ports less than 1024. So I went back to 1337. 

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;His message: "That is a permission error caused by a non privileged user trying to listen on a privileged port. Only root can listen on ports <= 1024. For now, just prefix your command with sudo. That isn't safe for production, but one step at a time. Next step will be either to listen on a nonprivileged port and use a proxy, or find a safe way to listen on port 80."





### 1/26/14 by DW

Mapped *.smallpict.com to my Nodejitsu server

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Added the hostname to the string echoed on each request.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Added the wildcard to the domains element in the package.json file, although the Nodejitsu docs don't say anything about how to have a whole domain map to a NJ app.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Haven't been able to test it because NJ is calling an error on loading the new version, version 0.65.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;As with a lot of this stuff, I'm floating on air, not sure what I'm doing, trying things out, and looking for something that works. 



Started the worknotes file, to document work I'm actively doing on fargoPublisher. 

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;It's an <a href="https://github.com/scripting/fargoPublisher/blob/master/opml/worknotes.opml">outline</a> in the OPML folder, and a <a href="https://github.com/scripting/fargoPublisher/blob/master/worknotes.md">markdown file</a> at the top level.





