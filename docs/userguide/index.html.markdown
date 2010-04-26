---
layout: default
title: Bespin User's Guide
subtitle: Introduction
---

What Is Bespin?
---------------

Bespin aims to be a top-of-the-line text editor that lives in your browser. It is
based on the latest web standards that are shipping in modern browsers.

Requirements
------------

Bespin requires a "modern browser" with support for HTML5 and specifically the
Canvas element with the ability to draw text. Our current list of supported
browsers is:

* Firefox 3.5+
* Chrome 2.0+
* Safari 4.0+

How Can I Use Bespin?
---------------------

Depending on what you're trying to accomplish and how much time you're willing 
to invest, there are several ways in which you can use Bespin:

* use https://bespin.mozillalabs.com without downloading anything
* [download Bespin Embedded](http://ftp.mozilla.org/labs/bespin/Embedded) for use in your own applications
* set up your own Bespin server (not for the faint of heart!)

This guide is primarily geared toward people using the Bespin server at 
bespin.mozillalabs.com, but there are topics covered that also apply in the
other uses of Bespin.

Getting Help
------------

Beyond this documentation, Bespin also has mailing lists and a feedback
forum. Take a look at the [Bespin Project homepage](http://mozillalabs.com/bespin/)
for links to these resources.

Getting Started
---------------

Create an account or log in at bespin.mozillalabs.com. Once you have logged in,
your screen will look something like this:

![Bespin 0.7.1 screenshot](images/Bespin-0.7.1-screenshot.png)

As noted in the screenshot, the top part of the window is the editor itself.
At the bottom of the screen is a command line, which you use to make Bespin
do all kinds of things. When the cursor is in the command line, the command
output is displayed. By default, when you're editing the output is not
displayed so that you get more room for editing. There's a little pin in the
upper left of the output window that you can click to pin the output and
make it visible all the time.

Commands
--------

Beyond basic typing, everything you do in Bespin is controlled by a "command".
Commands can be entered on the command line, or invoked by keyboard control.

Over time, we expect to build additional user interface for working with
commands. For now, it's enough to know that commands are how Bespin gets
things done. One great thing about commands, as noted in the 
[Plugin Guide](../pluginguide/index.html), is that they're easy to write.

The `help` command is a useful command to know: it will list all of the
commands available to you right now. This Users Guide will mention some
commands in the context of larger topics, but the up-to-date list of
commands is available via `help`.

Keyboard Control
----------------

Bespin's keyboard controls are very configurable. A command can provide a
default key binding. Those bindings can be changed by keymapping plugins
and further through configurations that you set.

Any keybindings mentioned in this guide are subject to change by plugins
and configuration, so keep that in mind. Also, if we talk about `cmd-J`,
that means `cmd-J` on the Mac and `ctrl-J` on Windows.

Speaking of `cmd-J`, that is an incredibly useful shortcut. That will
bounce you back and forth between the editor and the command line. Since
the command line is an important part of Bespin's UI, you'll want to be
able to get there without having to reach for the mouse.

Working with Files
------------------

Bespin supports a filesystem of files and directories, just like any other
editor. When you're entering a command that uses a file or directory in 
Bespin, the file that you specify on the command line is taken to be
relative to the file that is currently open in the editor. The `ls` command lists the files. So, `ls` alone gives you the files in the directory that the currently opened file is in. `ls /` gives you the files at the root.

The `newfile` command gives you a blank buffer to start coding in. You then use `saveas` to put that newfile in it's place. Note that when you do so, you'll need to provide an absolute path to where the file should go.

You can delete a file or directory with the `rm` command. You should add a 
trailing "/" whenever you want to work with a directory.

Use the `open` command to open a file. `open` features powerful completion 
that works across all of your Bespin files to find the best match.

Settings
--------

Our plan is to make Bespin a very configurable editor. You can see the list
of available settings and change them by using the `set` command.


Bespin's History
----------------

The Bespin project was created by Ben Galbraith and Dion Almaer in 2008 and
then brought to Mozilla Labs at the end of that year. Following the first 
public release in February 2009, the Bespin team (now a combination of
Mozilla employees and open source contributors) produced a series of
releases up to version 0.4.4 in September 2009. After that, the project
"rebooted" the client side code to build a newer, better structure for
adding the planned features. In November 2009, the first reboot code was
released as Bespin Embedded 0.5. In April 2010, Bespin 0.7 became the
first rebooted client/server release.