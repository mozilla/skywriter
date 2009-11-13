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
import os
import subprocess
import urllib2
import tarfile
from cStringIO import StringIO
import webbrowser
import re

from paver.easy import *
import paver.virtual

options(
    version=Bunch(
        number="0.5",
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
    server_pavement=lambda: options.server.directory / "pavement.py",
    builddir=path("tmp"),
    install_sproutcore=Bunch(
        git=False
    )
)

@task
@cmdopts([('git', 'g', 'use git to download')])
def install_sproutcore(options):
    """Installs the versions of SproutCore that are required.
    Can optionally download using git, so that you can keep
    up to date easier."""
    abbot_path = path("abbot")
    if abbot_path.exists():
        info("abbot directory exists, no action required.")
        return
    if not options.git:
        print "download sproutcore-abbot/tiki"
        abbot_tarball = urllib2.urlopen("http://github.com/sproutit/sproutcore-abbot/tarball/tiki")
        abbot_dirname = abbot_tarball.url.split('/')[-1].split('.')[0]
        abbot_tar = tarfile.open(fileobj = StringIO(abbot_tarball.read()))
        abbot_tar.extractall()
        abbot_tar.close()
        os.rename(abbot_dirname, "abbot")
        os.rmdir("abbot/frameworks/sproutcore")

        print "download sproutcore/tiki"
        sproutcore_tarball = urllib2.urlopen("http://github.com/sproutit/sproutcore/tarball/tiki")
        sproutcore_dirname = sproutcore_tarball.url.split('/')[-1].split('.')[0]
        sproutcore_tar = tarfile.open(fileobj = StringIO(sproutcore_tarball.read()))
        sproutcore_tar.extractall(path = "frameworks")
        sproutcore_tar.close()
        os.rename("frameworks/%s" % sproutcore_dirname, "frameworks/sproutcore")

        print "download tiki"
        tiki_tarball = urllib2.urlopen("http://github.com/sproutit/tiki/tarball/master")
        tiki_dirname = tiki_tarball.url.split('/')[-1].split('.')[0]
        tiki_tar = tarfile.open(fileobj = StringIO(tiki_tarball.read()))
        tiki_tar.extractall(path = "frameworks")
        tiki_tar.close()
        os.rename("frameworks/%s" % tiki_dirname, "frameworks/tiki")
    else:
        # use git
        sh("git clone -q git://github.com/sproutit/sproutcore-abbot.git abbot")
        sh("git checkout -b origin/tiki", cwd=abbot)
        sh("git pull origin tiki", cwd=abbot)
        sh("git clone -q git://github.com/sproutit/sproutcore.git", cwd="frameworks")
        sh("git checkout -b origin/tiki", cwd="frameworks/sproutcore")
        sh("git pull origin tiki", cwd="frameworks/sproutcore")
        sh("git clone -q git://github.com/sproutit/tiki.git", cwd="frameworks")

@task
@needs(["install_sproutcore"])
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

* NOTE: "paver" always needs to be run in the directory with the
pavement.py file (eg, the "bespinclient" directory).
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
    """Starts the BespinServer on localhost port 4020 for development.
    """
    command = "abbot/bin/sc-server"
    popen = subprocess.Popen(command, stdin=sys.stdin, stdout=sys.stdout, stderr=sys.stderr)
    popen.wait()
    
@task
def build_docs(options):
    """Builds the documentation."""
    if not path("src/growl").exists():
        sh("pip install -r requirements.txt")
    builddir = options.builddir
    builddir.mkdir()
    docsdir = builddir / "docs"
    sh("growl.py . ../%s" % docsdir, cwd="docs")
    
@task
def sc_build(options):
    sh("abbot/bin/sc-build -rc editor")
    
SPROUTCORE_INLINE="""
var ENV = {"platform":"classic","mode":"production"};
var SC=SC||{BUNDLE_INFO:{},LAZY_INSTANTIATION:{}};SC.json=JSON;SC.browser=(function(){var c=navigator.userAgent.toLowerCase();
var a=(c.match(/.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/)||[])[1];var b={version:a,safari:(/webkit/).test(c)?a:0,opera:(/opera/).test(c)?a:0,msie:(/msie/).test(c)&&!(/opera/).test(c)?a:0,mozilla:(/mozilla/).test(c)&&!(/(compatible|webkit)/).test(c)?a:0,mobileSafari:(/apple.*mobile.*safari/).test(c)?a:0,windows:!!(/(windows)/).test(c),mac:!!((/(macintosh)/).test(c)||(/(mac os x)/).test(c)),language:(navigator.language||navigator.browserLanguage).split("-",1)[0]};
b.current=b.msie?"msie":b.mozilla?"mozilla":b.safari?"safari":b.opera?"opera":"unknown";
return b})();SC.bundleDidLoad=function(a){var b=this.BUNDLE_INFO[a];if(!b){b=this.BUNDLE_INFO[a]={}
}b.loaded=true};SC.bundleIsLoaded=function(a){var b=this.BUNDLE_INFO[a];return b?!!b.loaded:false
};SC.loadBundle=function(){throw"SC.loadBundle(): SproutCore is not loaded."};SC.setupBodyClassNames=function(){var e=document.body;
if(!e){return}var c,a,f,b,g,d;c=SC.browser.current;a=SC.browser.windows?"windows":SC.browser.mac?"mac":"other-platform";
d=document.documentElement.style;f=(d.MozBoxShadow!==undefined)||(d.webkitBoxShadow!==undefined)||(d.oBoxShadow!==undefined)||(d.boxShadow!==undefined);
b=(d.MozBorderRadius!==undefined)||(d.webkitBorderRadius!==undefined)||(d.oBorderRadius!==undefined)||(d.borderRadius!==undefined);
g=e.className?e.className.split(" "):[];if(f){g.push("box-shadow")}if(b){g.push("border-rad")
}g.push(c);g.push(a);if(SC.browser.mobileSafari){g.push("mobile-safari")}e.className=g.join(" ")
};
"""
BUILD_POSTAMBLE="""tiki.require("bespin:boot");"""

def _find_build_output(toplevel, name):
    en = toplevel / name / "en"
    
    # get sorted list of builds, in descending order
    # of modification time
    builds = sorted(en.glob("*"), 
                key=lambda item: item.getmtime(), 
                reverse=True)
    if not builds:
        raise BuildFailure("Could not find a Bespin build in " + en)
    return builds[0]

class Match(object):
    def __init__(self, include, score):
        self.include = include
        self.score = score

class RE(object):
    def __init__(self, expr):
        # subtract one from the score, because regexes are often
        # of the form foo/bar/.* and are less-specific than a complete 
        # filename
        self.score = len(expr.split("/")) - 1
        self.expr = re.compile(expr)

class Rule(object):
    def __init__(self, include, prefix, specifics=None):
        self.include = include
        self.prefix = prefix + "/"
        self.prefix_segments = len(prefix.split('/'))
        self.specifics = specifics
    
    def test(self, filename):
        if not filename.startswith(self.prefix):
            return None
        filename = filename[len(self.prefix):]
        if not self.specifics:
            return Match(self.include, self.prefix_segments)
            
        for specific in self.specifics:
            if isinstance(specific, RE) and specific.expr.match(filename):
                return Match(self.include, 
                    self.prefix_segments + specific.score)
                
            if filename == specific:
                return Match(self.include, 
                    self.prefix_segments + len(filename.split('/')))
        
        return None
        
class Include(Rule):
    def __init__(self, prefix, specifics=None):
        super(Include, self).__init__(True, prefix, specifics)

class Exclude(Rule):
    def __init__(self, prefix, specifics=None):
        super(Exclude, self).__init__(False, prefix, specifics)
        
DEFAULT_EXCLUDE = Match(False, -1)

class FilterRules(object):
    def __init__(self):
        self.rules = []
    
    def add(self, rule):
        self.rules.append(rule)
    
    def test(self, filename):
        best_match = DEFAULT_EXCLUDE
        
        for rule in self.rules:
            match = rule.test(filename)
            if match:
                if match.score > best_match.score:
                    best_match = match
        
        return best_match.include

BASE_RULES = FilterRules()
BASE_RULES.add(Include("bespin"))
BASE_RULES.add(Include("tiki"))
BASE_RULES.add(Include("sproutcore"))
BASE_RULES.add(Include("browserup"))
BASE_RULES.add(Exclude("tiki/frameworks/system/experimental"))
BASE_RULES.add(Exclude("sproutcore/frameworks", [
    RE("datejs/.*"),
    RE("mini/.*"),
    RE("designer/.*"),
    RE("datastore/.*"),
    RE("testing/.*"),
    RE("core_tools/.*")
]))
BASE_RULES.add(Exclude("sproutcore/frameworks/runtime", [
    RE("debug/.*")
]))
BASE_RULES.add(Exclude("sproutcore/frameworks/foundation", [
    "controllers/array.js",
    "controllers/object.js",
    "controllers/tree.js",
    RE("debug/.*"),
    # RE("mixins/.*"),
    "mixins/button.js",
    # "mixins/control.js",
    "mixins/inline_text_field.js",
    # "mixins/string.js",
    # "mixins/tree_item_content.js",
    # "private/tree_item_observer.js",
    "system/datetime.js",
    "system/json.js",
    RE("tests/.*"),
    RE("validators/.*"),
]))
BASE_RULES.add(Exclude("sproutcore/frameworks/desktop", [
    RE("debug/.*"),
    "mixins/collection_group.js",
    "mixins/collection_row_delegate.js",
    "mixins/collection_view_delegate.js",
    RE("panes/.*"),
    RE("tests/.*"),
    RE("views/.*")
]))
BASE_RULES.add(Include("sproutcore/frameworks/desktop", [
    "views/scroll.js",
    "views/scroller.js"
]))

@task
def resetfiles():
    info("Resetting hidden files")
    frameworks = path("frameworks")
    for f in frameworks.walkfiles("*.jsignore"):
        f.rename(f.splitext()[0] + ".js")

@task
def hidefiles():
    info("Hiding files from SproutCore build")
    frameworks = path("frameworks")
    for f in frameworks.walkfiles():
        if not f.ext in [".js", ".jsignore"]:
            continue
        common, remainder = f.split("/", 1)
        include = BASE_RULES.test(remainder)
        if not include and f.ext != ".jsignore":
            f.rename(f.splitext()[0] + ".jsignore")
        if include and f.ext == ".jsignore":
            f.rename(f.splitext()[0] + ".js")

@task
@needs(['hidefiles', 'build_docs'])
def release_embed(options):
    try:
        sc_build(options)
    finally:
        resetfiles()
        
    builddir = options.builddir
    if not builddir.exists():
        builddir.mkdir()
    
    version = options.version.number
    outputdir = builddir / ("BespinEmbedded-%s" 
        % (version))
    if outputdir.exists():
        outputdir.rmtree()
    outputdir.mkdir()
    
    sproutcore_built = builddir / "build" / "static"
    bespin_dir = _find_build_output(sproutcore_built, "bespin")
    bespin_js = bespin_dir / "javascript-packed.js"
    info("Generating BespinEmbedded.js based on %s", bespin_js)
    jsinput = bespin_js.text()
    jsoutput = (outputdir / "BespinEmbedded.js").open("w")
    jsoutput.write(SPROUTCORE_INLINE)
    jsoutput.write(jsinput)
    jsoutput.write(BUILD_POSTAMBLE)
    jsoutput.close()
    
    path("LICENSE.txt").copy(outputdir)
    (path("src") / "bespin-build" / "sample.html").copy(outputdir)
    (path("src") / "html" / "sproutcore.css").copy(outputdir / "BespinEmbedded.css")
    (builddir / "docs").copytree(outputdir / "docs")
    sh("tar czf BespinEmbedded-%s.tar.gz BespinEmbedded-%s" % \
        (version, version), cwd="tmp")
    
@task
def docs(options):
    """Display the documentation in your web browser."""
    docdir = options.builddir / "docs"
    if not docdir.exists():
        call_task("build_docs")
    webbrowser.open("file:///%s/index.html" % docdir.abspath())
    