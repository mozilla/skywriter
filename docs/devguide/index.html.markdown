---
title: Bespin Developer's Guide
subtitle: Getting Started
layout: default
---

Installing the Bespin Server
----------------------------

Important note: The Bespin Server is going to undergo a complete rework.
You can read more about this in the [Bespin Server Roadmap](http://groups.google.com/group/bespin/browse_thread/thread/6de8c718d64232a0)
that was posted to the mailing list.


To work on Bespin, you'll need to install the Bespin server on your local computer.

You can easily get Bespin's Python server running on your local Mac or Linux machine (see note about Windows below).

## Prerequisites ##

You will need the following installed on your system to get Bespin up and running: 

* Mercurial 
* Python 2.5 or 2.6 

Python 2.6 is preferred.

**NOTE FOR LINUX USERS:** *If you are running on a Linux system, you will likely need a "python-dev" and "ruby1.8-dev" (on Ubuntu; possibly "python-devel" elsewhere) package installed, if you do not already have it. If you want to build the embedded release, you will want libyaml: the package on Ubuntu is "libyaml-dev".* 

**NOTE FOR MAC USERS:** *You will need Xcode installed.* 

**NOTE FOR WINDOWS USERS:** *Most Bespin developers are using unix-like platforms. Bespin's server should be able to run on Windows, though. You'll need a C compiler, and you can use Microsoft's free [http://www.microsoft.com/Express/VC/ Visual C++] compiler. As an alternative, you can use [http://www.cygwin.com/ Cygwin] or [http://www.mingw.org/ MinGW] to have a unix-like environment on your Windows system.*

## Getting Started ##

Run:

    hg clone http://hg.mozilla.org/labs/bespinclient/
    hg clone http://hg.mozilla.org/labs/bespinserver/
    cd bespinclient

This will get the Bespin client and Python Bespin server code checked out. The `bespinclient/` directory is the "main" directory that you'll use.

To set up Bespin for the first time, run:

    python bootstrap.py --no-site-packages
  
to get the environment set up. This is built around [http://pypi.python.org/pypi/virtualenv](virtualenv). Please watch for helpful hints and instructions on screen.

In Unix-like environments, the next step is to activate the virtualenv using this command:

    source bin/activate

on Windows, the command is Scripts/activate.bat

Once the virtualenv is activate, you need to get the server set up:

    paver install_server

And the first time around, you're also going to want to get a database set up:

    paver create_db

If you have some trouble on macos x like the error message: ImportError: No module named `xxx'
It's probably cause the server side is not completely installed so try:

    cd ../bespinserver
    paver develop
    paver create_db

## Starting the development server ##

If you are no longer (or not yet) in the virtualenv environment run within the bespinclient directory:

  source bin/activate

To start the server execute:

  paver start

This will start the Bespin server. You can now access the Bespin editor at http://localhost:8080/ in you browser.

Have fun!

## Coding Conventions ##

JavaScript code should follow the [Crockford Code Conventions](http://javascript.crockford.com/code.html). With a few minor modifications:

* Namespaces: Crockford does not mention namespaces, probably because owning the global namespace allows you to use as much as you want. Our code is likely to be used in many different places so we should not pollute the global namespace needlessly. Our code is organized in [http://commonjs.org/specs/modules/1.0.html CommonJS] modules, so every variable should either be a "var" or attached to the "exports" object.

* _private: We agree that prefixing variables with an underscore provides no actual protection, however we think of it as a warning. "Use of this member is unsupported and likely to break without warning in future revisions". In early versions of Bespin where we are experimenting a lot, allowing 3rd parties to join in the experiment is valuable. As Bespin becomes more stable and finalized, we might expect underscored members to be replaced with closure scoped variables.

* Documentation: Bespin JavaScript is documented with [JSDoc](http://code.google.com/p/jsdoc-toolkit/w/list), which in practice means prefixing functions with a set of comments that use various tags.

* var first: The standard recommends putting var statements as the first statements in the function body. Crockford doesn't always follow this advice and we reserve the right to follow this lead ;-)
