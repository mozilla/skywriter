---
layout: default
title: Bespin User's Guide
subtitle: Version Control System Integration
---


Version Control
---------------

Bespin is able to use a version control system (VCS) to keep track of the history of your project's files. Using Bespin in conjunction with an external VCS is also a great way to get files in and out of a Bespin server.

#### The Basics ####

Bespin currently supports the Mercurial distributed VCS. You can add version control to a project using the command `hg init`. If you have never used a distributed VCS before, you might consider reading the [http://en.wikipedia.org/wiki/Distributed_revision_control Wikipedia article on the subject].

If you are starting to use Bespin with an existing project, you can ''clone'' a remote repository.

##### Securely accessing remote systems #####

In order to access remote VCSes, Bespin stores your login information for those remote systems in a private '''keychain'''. Your keychain file is encrypted with a password that is distinct from your login password and that you will need to type in whenever Bespin is accessing the remote system. Using a distributed VCS, you don't need to type this password in often.

Bespin supports username and password-based access to remote systems. It can also use SSH, and Bespin will generate a public/private keypair that you can use on the remote system. The private key is stored in your keychain. You can get your public key using the command:

  keychain getkey

If your remote repository is at a site like [http://bitbucket.org](Bitbucket), it is easy to copy and paste this public key into the web interface of the site to get read and write access to your repositories from Bespin.

##### VCS Commands #####

For security reasons, Bespin supports only a subset of VCS operations. We plan to expand the number of commands and VCSes supported over time.

##### vcs clone #####

The clone command will clone (or checkout) a remote repository. This command provides an interface for entering the different parameters needed to get set up. Since clone provides access to remote resources, you will need to enter your keychain password.

The main fields are:

URL
: URL of the repository (generally an http, https or ssh URL)

Project name
: name of the project to create in Bespin. You can leave this blank, and Bespin will use what comes after the last / in the URL.

VCS Type
: which version control system is used by this repository

VCS User
: For distributed VCSes (Mercurial, Git), what username should appear in your commits for this project. You can also use the global Bespin setting "vcsuser" to set this value.

Authentication
: None (used for read-only access to public repositories), Only for writing (if it's a public repository that you have write access to) and For reading and writing (if it's a private repository)

If you tell Bespin, via the Authentication options, that you have write access to the repository, additional fields will be displayed so that you can configure the write access.

Keychain password
: password used to store your remote login credentials securely on the Bespin server

Push to URL
: Sometimes you will use a different URL for pushing than pulling, perhaps using http to pull and ssh to push. This allows you to set the URL for pushing.

Authentication type
: Bespin can use SSH for authentication or username/password. See the `keychain getkey` command for more information about Bespin's SSH authentication.

Username
: You should always fill in the username that you will be using to log into the remote system

Password
: If you are using username/password authentication rather than SSH, you will type in your password here. This password will be stored in your encrypted Bespin keychain.

##### hg init #####

If you don't need to maintain your files in a remote version control system, you can use the `hg init` command to initialize a Mercurial repository for the currently selected Bespin project.

##### vcs add #####

Adds files to the version control system. This concept is familiar in most VCSes. If you create a new file, it is not automatically placed under version control. `vcs add` on its own will add the '''current''' file to the VCS. `vcs add -a` will add all files. You can also list specific files within the currently selected Bespin project.

This does not access remote files, so you will not need your keychain password for this command.

##### vcs commit #####

Commits changes '''to the local repository''' within Bespin. You need to provide a commit message, which you should put in quotes on the command line.

This does not access remote files, so you will not need your keychain password for this command.

##### vcs diff #####

Shows you the differences between your current set of files and what's checked into the local repository in Bespin. Without any options, `vcs diff` will show a diff for the current file. `vcs diff -a` shows diffs for all of the files and you can also list specific filenames within the current project for which you'd like to see diffs.

This does not access remote files, so you will not need your keychain password for this command.

##### keychain getkey #####

As mentioned in the section ''Securely accessing remote systems'', Bespin will generate an SSH public/private keypair for you. The `keychain getkey` command will display your public key so that you can copy and paste it into the remote host. After you do that, Bespin should be able to access the remote system.

When your key is first generated, you will need to enter your keychain password so that Bespin can securely store your private key in your keychain file. After this initial key generation step, you will not need to enter your keychain password for the `keychain getkey` command.

##### vcs push #####

Push committed revisions to the remote repository.

This will require your keychain password.

##### vcs remove #####

The files that you list for this command will be deleted ''and'' removed from version control.

This does not access remote files, so you will not need your keychain password for this command.

##### vcs resolved #####

If you pull changes from a remote repository and the resulting merge had conflicts, the `vcs resolved` command will allow you to tell the VCS that the conflicts have been resolved so that you can then commit the merge to the local repository.

Similar to other VCS commands, by default `vcs resolved` will mark the current file as resolved. `vcs resolved -a` will mark all files as resolved, and you can also list individual files in the current project.

This does not access remote files, so you will not need your keychain password for this command.

##### vcs revert #####

If you decide that you're not happy with changes you've made, you can revert your checked out copies of the files to the last revision in the local Bespin repository. `vcs revert` will revert the current file. `vcs revert -a` will revert all files, and you can also individually list files in the current project that you'd like to revert.

This does not access remote files, so you will not need your keychain password for this command.

##### vcs status #####

Display the status of your working copy (which files have been modified, added and removed, for example).

This does not access remote files, so you will not need your keychain password for this command.

##### vcs update #####

Update your working copy with changes from the remote repository, merging them in as necessary. For Mercurial, this is equivalent to "hg fetch" (which in turn is "hg pull" followed by either "hg update" or "hg merge" depending on whether there were any changes).

