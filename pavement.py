#  ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1
# 
# The contents of this file are subject to the Mozilla Public License  
# Version
# 1.1 (the "License"); you may not use this file except in compliance  
# with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
# 
# Software distributed under the License is distributed on an "AS IS"  
# basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the  
# License
# for the specific language governing rights and limitations under the
# License.
# 
# The Original Code is Bespin.
# 
# The Initial Developer of the Original Code is Mozilla.
# Portions created by the Initial Developer are Copyright (C) 2009
# the Initial Developer. All Rights Reserved.
# 
# Contributor(s):
# 
# ***** END LICENSE BLOCK *****
# 
import sys
import subprocess

from paver.easy import *
import paver.virtual

options(
    version=Bunch(
        number="0.6",
        name="Reboot1",
        api="4"
    ),
    virtualenv=Bunch(
        paver_command_line="initial"
    ),
    server=Bunch(
        # set to true to allow connections from other machines
        address="",
        port=8080,
        try_build=False,
        dburl=None,
        async=False,
        config_file=path("devconfig.py"),
        directory=path("../bespinserver/").abspath(),
        clientdir=path.getcwd()
    ),
    server_pavement=lambda: options.server.directory / "pavement.py"
)

@task
def install_narwhal():
    narwhal = path("narwhal")
    if not narwhal.exists():
        sh("git clone git://github.com/dangoor/narwhal.git")
        sh("narwhal/bin/sea tusk install jack")
        sh("narwhal/bin/sea tusk install qunit")
    
    packages = ["bespin-core", "bespin-supported", "bespin-labs", 
                "bespin-build"]
    for package in packages:
        client_package = path("src/%s" % package)
        # yikes! this won't work on Windows
        sh("ln -sf %s narwhal/packages/" % (client_package.abspath()))

@task
@needs(["install_narwhal"])
def initial():
    """Initial setup help."""
    venv_command = "Scripts/activate.bat" if sys.platform == 'win32' \
        else "source bin/activate"
    linux_note = "" if not sys.platform.startswith("linux") else """

    *** NOTE FOR LINUX USERS: If you are running on a Linux system, you will 
    likely need a "python-dev" (on Ubuntu, possibly python-devel elsewhere) 
    package installed and either the libc-dev or libc6-dev package, if you 
    do not already have them.

"""
    
    mac_note = "" if not sys.platform.startswith("darwin") else """

    *** NOTE FOR MAC USERS: You will need Xcode installed.
    
    If you put your Bespin checkout in a directory
    that has a space in the directory name, the bootstrap script will fail
    with an error "no such file or directory" because there will be
    scripts generated with an invalid shebang (#!) line.

"""

    win_note = "" if not sys.platform.startswith("win") else """

    Note about running on Windows
    -----------------------------

    The current, up-to-date Bespin backend is written in Python. Because
    Python is cross-platform, it should be possible (and likely not too
    difficult) to make the backend work on Windows once Python 2.5 is
    installed. However, this has not been tested and there are likely two
    issues:

    1. some libraries used by Bespin try to compile C code (*)
    2. some paths may not be correct on Windows systems

    Microsoft offers free command line compilers that work well with
    Python.

"""
    print """Welcome to the Bespin Developer Build!

We want to get your development server up and running quickly.
If you run into trouble, please head over to the Bespin
Googlegroup and we can help:

http://groups.google.com/group/bespin/

We maintain a Python-based web server that is easy to get
running in development. It works with Python 2.5 or 2.6
only.
%s%s%s
The Python server lives in a separate Mercurial repository.
To get the Python server installed, run these two commands:

%s
paver install_server
""" % (mac_note, linux_note, win_note, venv_command)

@task
def install_server(options):
    """Install or update the development server."""
    call_pavement(options.server_pavement, "develop")
    print """
Look for error messages in the output above. If everything looks
good, you can start the server by running:

paver start
"""

@task
def start(options):
    """Starts the BespinServer on localhost port 8080 for development.
    
    You can change the port and allow remote connections by setting
    server.port or server.address on the command line.
    
    paver server.address=your.ip.address server.port=8000 start
    
    will allow remote connections (assuming you don't have a firewall
    blocking the connection) and start the server on port 8000.
    """
    subprocess.Popen("narwhal/bin/sea jackup -p 8081".split(), stdout=sys.stdout)
    args = " ".join("%s=%s" % (key, value) 
        for key, value in options.server.items())
    call_pavement(options.server_pavement, args + " start")
    
@task
def docs(options):
    """Builds the documentation."""
    if not path("src/growl").exists():
        sh("pip install -r requirements.txt")
    builddir = path("build")
    builddir.mkdir()
    docsdir = builddir / "docs"
    sh("growl.py . ../%s" % docsdir, cwd="docs")
    
@task
@needs(['docs'])
def release_embed(options):
    sh("narwhal/bin/sea buildbespin")
    builddir = path("build")
    version = options.version.number
    outputdir = path("build") / ("BespinEmbedded-%s" 
        % (version))
    if outputdir.exists():
        outputdir.rmtree()
    outputdir.mkdir()
    path("LICENSE.txt").copy(outputdir)
    (builddir / "docs").copytree(outputdir / "docs")
    (builddir / "BespinEmbed.js").copy(outputdir / "BespinEmbed.js")
    sh("tar czf BespinEmbedded-%s.tar.gz BespinEmbedded-%s" % \
        (version, version), cwd="build")
    