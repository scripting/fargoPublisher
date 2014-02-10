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





