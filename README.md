### What is Fargo Publisher?

A JavaScript project to connect to <a href="http://fargo.io/">Fargo</a> to publish a folder of HTML docs.

An upcoming release of Fargo has a new built-in content management system that creates static HTML files. All that's needed is a way to flow those files to a static HTTP server. That's what Fargo Publisher does. 

It establishes a very simple set of calls that Fargo implements to connect up to a storage server. This implementation stores the files in Amazon S3, but a fork of this code could store them in files, or in another content server. 

This document includes information you need to install this server, and technical information for implementers.



### Todo list

Parameterize using environment variables. See <a href="http://stackoverflow.com/questions/4870328/how-to-read-environment-variable-in-node-js">howto</a>.

Determine the S3 buckets to use for the Fargo 2 beta deploy.

Import data from smallpict.com.

Fix the pingpackage call to use the name not the url of the outline.

How do we backup the database?



