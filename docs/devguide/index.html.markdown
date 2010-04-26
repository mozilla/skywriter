---
title: Bespin Developer's Guide
subtitle: Getting Started
layout: default
---

Installing the Bespin Server
----------------------------

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

This will start the Bespin server. You can now access the Bespin editor at http://localhost:4020/editor/ in you browser.

Have fun!

## Run SproutCore's build server ##

If you are hacking on SproutCore, you'll want to run SproutCore's build server. Additionally, you'll need:

*Git 
*Ruby 1.8 or 1.9 (1.9 is faster)
*The following RubyGems: `rack jeweler json_pure extlib erubis thor`

  <code>gem install rack jeweler json_pure extlib erubis thor</code>

Optionally, you may want the thin library, which will improve performance over the default WEBrick:

    gem install thin

Install additional SproutCore stuff within bespinclient using:

   paver install_sproutcore -g

Here's how you start up:

  paver server.abbot=1 start

You can now access the Bespin editor at http://localhost:4020/editor/ in you browser.

## Contributing to Bespin ##

For details see:
:[[Labs/Bespin/Contributing]]
