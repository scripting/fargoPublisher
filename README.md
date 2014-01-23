### What is Fargo Publisher?

Fargo Publisher is a node.js app that connects to <a href="http://fargo.io/">Fargo</a> to publish a folder of HTML docs.

An upcoming release of Fargo has a new built-in content management system that creates static HTML files. All that's needed is a way to flow those files to a static HTTP server. That's what Fargo Publisher does. 

It defines an open protocol that any app can use to connect to static storage, no matter where the content originates. This implementation stores the files in Amazon S3, but a fork of this project could store them in files, or in another content server. 

It's open source, using the MIT License. 

This document includes information you need to install a server, and technical information for implementers.



### How to deploy

You must have a current node.js installation.

Install request, AWS and if necessary url. 

Set environment variables for AWS: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.

Set environment variables with your S3 paths.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;xxx

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;yyy





### Todo list

Parameterize using environment variables. See <a href="http://stackoverflow.com/questions/4870328/how-to-read-environment-variable-in-node-js">howto</a>.

Determine the S3 buckets to use for the Fargo 2 beta deploy.

Import data from smallpict.com.

Fix the pingpackage call to use the name not the url of the outline.

How do we backup the database?



