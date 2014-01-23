### What is Fargo Publisher?

Fargo Publisher is a node.js app that connects to <a href="http://fargo.io/">Fargo</a> to publish a folder of HTML docs.

An upcoming release of Fargo has a new built-in content management system that creates static HTML files. All that's needed is a way to flow those files to a static HTTP server. That's what Fargo Publisher does. 

It defines an open protocol that any app can use to connect to static storage, no matter where the content originates. This implementation stores the files in Amazon S3, but a fork of this project could store them in files, or in another content server. 

It's open source, using the MIT License. 

This document includes information you need to install a server, and technical information for implementers.



### How names work

Each outline can be given a public name.

Rather than invent our own naming system, we're using the Internet's -- DNS.

So if I call my outline "dave" -- you can refer to it as dave.smallpict.com.

When you go to that address, you get an OPML file that contains my outline.

There's only one element of the &lt;head> section of that outline that we care about, &lt;xxx>. 

The rest of it is entirely up to the user. (And that head element is automatically put in the file by Fargo when the user chooses to name the outline).



### The user experience (set up)

The Fargo user brings the outline he or she wants to make public to the front.

Choose the <i>Name Outline</i> command in the File menu.

A dialog appears.

Type a name. While you do the software tells you whether the name is taken. It does this with a call to Fargo Publisher.

When you click OK, a message is sent to Fargo Publisher to associate that name with the public URL of the outline. Getting a public URL for a file is a feature of Dropbox that we're using.



### The user experience (publishing)

When the user publishes an outline, or a portion of an outline, it could cause many files to be rendered. 

The text of those files is saved to a package file, which is linked into the user's outline, automatically by the CMS.

When the text is fully rendered, it sends a message to the Fargo Publisher server with the name of the outline.

Publisher then reads the outline (it was registered in the previous ste) locates the package file, reads it, and breaks the package up into its compoentn files and saves it the user's folder in the S3 bucket. 

Publisher sends back to Fargo the base URL of the folder, which is then hooked into the Eye icon, which can be used to view the headline the cursor points to.



### Before deploy

You're going to need to make a few decisions before you deploy.

1. The user files will be stored in an S3 bucket. The path is an environment variable. 

2. Think about the domain for that bucket. 

3. Where do you want to store the names? It's also an S3 path. You might not want this to be public. 

For my deployment, for the initial Fargo 2 beta testers, I went with: http://beta.fargo.io/users/.

For the names 



### How to deploy

You must have a current node.js installation.

Install <a href="https://github.com/mikeal/request">request</a>, <a href="http://aws.amazon.com/sdkfornodejs/">AWS</a> and if necessary <a href="http://nodejs.org/api/url.html">url</a>. 

Set environment variables for AWS.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;AWS_ACCESS_KEY_ID

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;AWS_SECRET_ACCESS_KEY



Set environment variables with your S3 paths.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;fpStoragePath -- where the users' files will be stored.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;fpNamesPath -- where the names files will be stored. 

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;fpDomain -- the domain we're allocating (should be set, via DNS and AWS, to point to fpStoragePath).



The app is in package.js. package.json already contains all the info that node needs to run it.



### Todo list

User interface in Fargo.

Parameterize using environment variables. See <a href="http://stackoverflow.com/questions/4870328/how-to-read-environment-variable-in-node-js">howto</a>.

Determine the S3 buckets to use for the Fargo 2 beta deploy.

Import data from smallpict.com.

Fix the pingpackage call to use the name not the url of the outline.

How do we backup the database?

Need to be smarter about file types -- should HTML files really be text/plain type? 



