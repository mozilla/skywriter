---
layout: default
title: Bespin User's Guide
subtitle: Server Roadmap
---

The Bespin Server Roadmap (2010)
================================

Normally, we wouldn't put something like future plans for the project in
the official documentation. We're making an exception in this case, because
the future has a potentially significant impact on how people use Bespin
today.

If you only care about how the roadmap pertains to you, a Bespin user,
and you don't care about a bunch of exposition and blah, blah, blah,
skip down to ["What This Means for bespin.mozillalabs.com"](#bmc).

Way back in 2009
----------------

When the project was publicly introduced in February 2009, it was billed
as "coding in the cloud". At that time, the cloud was the bespin.mozillalabs.com
server. The Bespin project in 2009 was, most definitely, an experiment.
We wanted to see where we could push the browser-based editing experience.
We wanted to see how people would use it, or want to use it.

We learned quite a bit along the way. For one thing, developers have *many*
different needs and wants. That's not surprising, when you think about all
of the different tools and languages we use every day to get our work done.

People have many different demands of their code editors. After all, they're 
tools they use all day long. We wanted to make it possible for people to
customize Bespin and extend it to do whatever they needed.

We also found that quite a few people wanted to use Bespin within their
own projects. For months, people limped along with an out-of-date editor
and a single blog post as documentation.

The "Reboot"
------------

We decided to do a huge refactoring of Bespin's code in order to support
the customizability and embeddability that people were asking for. We called
this project the "Reboot".

Bespin was rebuilt atop a plugin system with new build tooling allowing
people to create their own unique Bespin editors out of collections of
plugins for embedding in their own apps.

With the release of Bespin 0.8 (codenamed "Cheviot"), the Reboot was done.
The client side infrastructure has settled, and we are very happy with
where we will be able to take it.

Two Huge Problems
-----------------

At the beginning, Bespin approached "coding in the cloud" as one big and
interesting problem. It turned out that it was actually two huge
problems: *coding* and *the cloud*. "Coding" is the act of writing the
code (which can include a big list of features). Creating a useful text
editor with advanced features and some fun experimental stuff is a lot
of work.

"The cloud" means providing server infrastructure to handle all kinds of 
things that developers might need. And, because it's in the cloud, it
really needs to provide *everything*. As you can imagine, it wasn't
long before someone asked us about previewing PHP code. How can we run
untrusted PHP code? And people wanted to commit their code to their
git (or Subversion or Mercurial) repository. And, of course, the
infrastructure should ideally be quite reliable with a solid backup and
disaster plan, etc.

Taken together, "coding in the cloud" is an outrageously large project.

But, what if it can be broken down into much smaller, more manageable chunks?

The Reboot basically did that for the client. Developers can create Bespin
plugins to do quite a few useful things quite easily. The Bespin editor
didn't need to grow in an unbounded way... it just needed to support
developers doing the things they need to do.

What if we could do the same for the server?

"Rebooting the Server"
----------------------

We have wanted to rewrite the server in JavaScript for some time, figuring that
that would make it easier for more people to dive into the server code
and that we'd be able to share some code between client and server.

If we create a new JS server that uses the same plugin system as the client,
we can make it so that people can extend the server to do the things they
need to. For example, the server can have a "git" plugin that runs git
commands against your code that's stored on the server.

For the people who want to preview their PHP, someone could write a PHP
plugin for the server but there's still that pesky issue of running untrusted
code. But what if the user was trusted?

If the user is trusted, then many problems just disappear. So, our thinking
is that we'll create a new server and make it really easy for people to
get their own Bespin server running. Rather than "the cloud" being a single
Bespin server, we're redefining "the cloud" to be a whole bunch of
Bespin servers, each configured to suit the needs of their set of users.

This actually ties in very well with the Reboot project for the client.
The Rebooted editor code removes any explicit ties to the Python Bespin server.
There's a bespin\_server plugin that provides that link. If you're using
some other server, you just need to write a plugin that handles the
communication.

So, we're going to make a JavaScript Bespin server, but the intention is
that Bespin will provide a great editing experience, regardless of which
"cloud" it happens to be attached to.

<a name="bmc">What This Means for bespin.mozillalabs.com</a>
------------------------------------------

In short, bespin.mozillalabs.com will, over time, just become a demo site
to show off some things that Bespin can do. It may provide some useful
functionality, but there's no guarantee of that. The important thing
to remember is that it's a public site with untrusted users, which is
significantly limiting in terms of what we can easily provide.

Therefore, you should seek to get any data you care about on 
bespin.mozillalabs.com *off* of the server as soon as possible.
You can use Mercurial to push to a remote repository or use the
`export` command to export your projects (top level directories)
as zip or tgz files.

What's Next?
------------

It's going to take some time to build up great, new Bespin server software
and make it easy as pie to get running. But, that's ultimately what
we're going for.

Bespin is very useful _today_ as an editor that you can embed in your own
applications. We have some stepping stone releases in mind that will
expand the ways in which Bespin can be useful to you, leading up to
the release of the new easy-to-get-going server.

