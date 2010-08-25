---
layout: default
title: Skywriter User's Guide
subtitle: Introduction
---

What Is Skywriter?
---------------

Skywriter aims to be a top-of-the-line text editor that lives in your browser. It is
based on the latest web standards that are shipping in modern browsers.

Requirements
------------

Skywriter requires a "modern browser" with support for HTML5 and specifically the
Canvas element with the ability to draw text. Our current list of supported
browsers is:

* Firefox 3.5+
* Chrome 2.0+
* Safari 4.0+

How Can I Use Skywriter?
---------------------

Depending on what you're trying to accomplish and how much time you're willing 
to invest, there are several ways in which you can use Skywriter:

* use https://skywriter.mozillalabs.com without downloading anything
* [download Skywriter Embedded](http://ftp.mozilla.org/pub/mozilla.org/labs/skywriter/Embedded/) for use in your own applications
* set up your own Skywriter server (not for the faint of heart!)

This guide is primarily geared toward people using the Skywriter server at 
skywriter.mozillalabs.com, but there are topics covered that also apply in the
other uses of Skywriter.

Getting Help
------------

Beyond this documentation, Skywriter also has mailing lists and a feedback
forum. Take a look at the [Skywriter Project homepage](http://mozillalabs.com/skywriter/)
for links to these resources.

Getting Started
---------------

Create an account or log in at skywriter.mozillalabs.com. Once you have logged in,
your screen will look something like this:

![Skywriter 0.7.1 screenshot](images/Skywriter-0.7.1-screenshot.png)

As noted in the screenshot, the top part of the window is the editor itself.
At the bottom of the screen is a command line, which you use to make Skywriter
do all kinds of things. When the cursor is in the command line, the command
output is displayed. By default, when you're editing the output is not
displayed so that you get more room for editing. There's a little pin in the
upper left of the output window that you can click to pin the output and
make it visible all the time.

Commands
--------

Beyond basic typing, everything you do in Skywriter is controlled by a "command".
Commands can be entered on the command line, or invoked by keyboard control.

Over time, we expect to build additional user interface for working with
commands. For now, it's enough to know that commands are how Skywriter gets
things done. One great thing about commands, as noted in the 
[Plugin Guide](../pluginguide/index.html), is that they're easy to write.

The `help` command is a useful command to know: it will list all of the
commands available to you right now. This Users Guide will mention some
commands in the context of larger topics, but the up-to-date list of
commands is available via `help`.

Keyboard Control
----------------

Skywriter's keyboard controls are very configurable. A command can provide a
default key binding. Those bindings can be changed by keymapping plugins
and further through configurations that you set.

Any keybindings mentioned in this guide are subject to change by plugins
and configuration, so keep that in mind. Also, if we talk about `cmd-J`,
that means `cmd-J` on the Mac and `ctrl-J` on Windows.

Speaking of `cmd-J`, that is an incredibly useful shortcut. That will
bounce you back and forth between the editor and the command line. Since
the command line is an important part of Skywriter's UI, you'll want to be
able to get there without having to reach for the mouse.

Working with Files
------------------

Skywriter supports a filesystem of files and directories, just like any other
editor. You can use the `cd` command to change the current working directory
and display the current directory with `pwd`. All file commands like `ls` to display
a list of files in the current directory or `open` to open a file work hand
in hand with the current working directory. You can also address files from the
root like `open /foo/bar.js`.

The `newfile` command gives you a blank buffer to start coding in. You then use `saveas` to put that newfile in it's place. 

You can delete a file or directory with the `rm` command. You should add a 
trailing "/" whenever you want to work with a directory.

Use the `open` command to open a file. `open` features powerful completion 
that works across all of your Skywriter files (under the current working
directory) to find the best match.

Settings
--------

Our plan is to make Skywriter a very configurable editor. You can see the list
of available settings and change them by using the `set` command. It's important,
that settings are used the same on all instances of Skywriter.

Skywriter's History
----------------

The Skywriter project was created by Ben Galbraith and Dion Almaer in 2008 and
then brought to Mozilla Labs at the end of that year. Following the first 
public release in February 2009, the Skywriter team (now a combination of
Mozilla employees and open source contributors) produced a series of
releases up to version 0.4.4 in September 2009. After that, the project
"rebooted" the client side code to build a newer, better structure for
adding the planned features. In November 2009, the first reboot code was
released as Skywriter Embedded 0.5. In April 2010, Skywriter 0.7 became the
first rebooted client/server release.