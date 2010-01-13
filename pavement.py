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
import os.path
import subprocess
import urllib2
import tarfile
from cStringIO import StringIO
import webbrowser
import re
import zipfile

from paver.easy import *
from paver.setuputils import setup
import paver.virtual

try:
    from bespinbuild.combiner import (combine_sproutcore_files, 
        combine_sproutcore_stylesheets, combine_files,
        copy_sproutcore_files)
except ImportError:
    pass

setup(
    name="dryice",
    version="0.6",
    packages=["dryice"],
    entry_points="""
[console_scripts]
dryice=dryice.tool:main
"""
)

options(
    version=Bunch(
        number="0.6",
        name="Ash",
        api="4"
    ),
    virtualenv=Bunch(
        paver_command_line="initial"
    ),
    server=Bunch(
        # set to true to allow connections from other machines
        address="",
        port=lambda: "4020" if not options.server.abbot else "8080",
        try_build=False,
        dburl=None,
        async=False,
        config_file=path("devconfig.py"),
        directory=path("../bespinserver/").abspath(),
        clientdir=path.getcwd(),
        abbot=False
    ),
    server_pavement=lambda: options.server.directory / "pavement.py",
    builddir=path("tmp"),
    install_sproutcore=Bunch(
        git=False,
        force=False
    ),
    jsdocs=Bunch(
        download_url="http://jsdoc-toolkit.googlecode.com/files/jsdoc_toolkit-2.3.0.zip",
        download_location=path("external") / "jsdoc_toolkit-2.3.0.zip",
        dest_dir=path("external") / "jsdoc-toolkit"
    ),
    sproutcore_snapshot_url="http://ftp.mozilla.org/pub/mozilla.org/labs/bespin/dev/sproutcore-20091223.tgz",
    fetch_compiler=Bunch(
        dest_dir=path("external") / "compiler",
        download_url="http://closure-compiler.googlecode.com/files/compiler-latest.zip",
        download_location=path("external") / "compiler-latest.zip"
    )
)

@task
@cmdopts([('git', 'g', 'use git to download'), ('force', 'f', 'force download of snapshot')])
def install_sproutcore(options):
    """Installs the versions of SproutCore that are required.
    Can optionally download using git, so that you can keep
    up to date easier."""
    
    if not options.git:
        snapshot = path("sproutcore")
        if snapshot.exists():
            if options.force:
                snapshot.rmtree()
            else:
                info("SproutCore snapshot installed already.")
                return
        info("Downloading SproutCore Snapshot")
        tarball = urllib2.urlopen(options.sproutcore_snapshot_url)
        base_name = path(options.sproutcore_snapshot_url).basename()
        info("Extracting SproutCore Snapshot")
        tar = tarfile.open(name=base_name, fileobj=StringIO(tarball.read()))
        tar.extractall('.')
        tar.close()
        return

    def get_component(base_name, dest_name, dest_path=".", branch=None, account="dangoor"):
        dest_complete = path(dest_path) / dest_name
        if dest_complete.exists():
            info("%s is already here, no action being taken", base_name)
            return
            
        if not options.git:
            if branch is None:
                branch = "master"
            info("Downloading %s/%s as a tarball", base_name, branch)
            tarball = urllib2.urlopen("http://github.com/%s/%s/tarball/%s" % (account, base_name, branch))
            dirname = tarball.url.split('/')[-1].split('.')[0]
            tar = tarfile.open(name=("%s.tgz" % base_name), fileobj=StringIO(tarball.read()))
            tar.extractall(dest_path)
            tar.close()
            os.rename(os.path.join(dest_path, dirname), os.path.join(dest_path, dest_name))
            return

        info("Checking out %s/%s", base_name, branch)
        sh("git clone -q git://github.com/%s/%s.git %s" % (account, base_name, dest_name), cwd=dest_path)
        if branch:
            sh("git checkout --track origin/%s" % branch, cwd=os.path.join(dest_path, dest_name))

    get_component("sproutcore-abbot", "abbot", branch="tiki")
    get_component("sproutcore", "sproutcore", dest_path="frameworks", branch="tiki")
    get_component("tiki", "tiki", dest_path="frameworks")
    get_component("core_test", "core_test", dest_path="frameworks")

@task
@needs(["install_sproutcore"])
def initial():
    """Initial setup help."""
    call_task("develop")
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
def create_db(options):
    """Create the development database."""
    info("Calling create_db in bespinserver")
    call_pavement(options.server_pavement, "create_db")

@task
def start(options):
    """Starts the BespinServer on localhost port 4020 for development.
    
    Go to http://localhost:4020/editor
    to launch the editor app.
    
    You can change the port and allow remote connections by setting
    server.port or server.address on the command line.
    
    paver server.address=your.ip.address server.port=8000 start
    
    will allow remote connections (assuming you don't have a firewall
    blocking the connection) and start the server on port 8000.
    
    Also, if you need to hack on SproutCore and have SC source installed
    (paver install_sproutcore -g) you can run
    
    paver server.abbot=1 start
    
    to launch Abbot.
    """
    additional_options = []
    if options.server.address:
        additional_options.append("server.address=%s" % (options.server.address))
    
    if options.server.abbot:
        additional_options.append("server_base_url=server/")
    else:
        static = _update_static()
        additional_options.append("staticdir=" + static)
    
    paver_command = additional_options +     ["clientdir=../bespinclient", 
            "server.port=%s" % (options.server.port), 
            "start"]
        
    if options.server.abbot:
        command = "abbot/bin/sc-server"
        popen = subprocess.Popen(command, stdin=sys.stdin, stdout=sys.stdout, stderr=sys.stderr)
        call_pavement("../bespinserver/pavement.py", paver_command)
        popen.wait()
    else:
        call_pavement("../bespinserver/pavement.py", paver_command)

def _update_static():
    static = path("tmp") / "static"
    static.rmtree()
    static.makedirs()
    for f in path("sproutcore").glob("*"):
        if not f.isdir():
            f.copy(static)
        else:
            f.copytree(static / f.basename())
    
    editor_dir = static / "editor"
    editor_dir.mkdir()
    bt = path("bespinbuild")
    inline = (bt / "inline.js").bytes()
    index = (bt / "devindex.html").bytes()
    index = index.replace("{{inline}}", inline)
    (editor_dir / "index.html").write_bytes(index)
    
    editor_path = editor_dir / "editor.js"
    editor_file = editor_path.open("w")
    
    combine_files(editor_file, None, "editor", path("apps") / "editor", add_main=True)
    
    bespin_path = static / "bespin.js"
    bespin_file = bespin_path.open("w")
    combine_files(bespin_file, None, "bespin", path("frameworks") / "bespin")
    
    return static
    
    
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
@needs(["install_sproutcore", "hidefiles"])
def sc_build(options):
    """Create a sproutcore-snapshot from SproutCore source."""
    try:
        sh("abbot/bin/sc-build -rc editor")
    finally:
        resetfiles()

    builddir = options.builddir
    
    snapshot = path("sproutcore")
    snapshot.rmtree()
    snapshot.mkdir()
    
    sproutcore_built = builddir / "production" / "build" / "static"
    
    sproutcore_filters=["welcome", "tests", "docs", "bootstrap", "mobile", "iphone_theme"]
    
    combined = combine_sproutcore_files([sproutcore_built / "tiki", sproutcore_built / "sproutcore"], 
        filters=sproutcore_filters,
        manual_maps=[(re.compile(r'tiki/en/\w+/javascript\.js'), "tiki")])
    
    output = snapshot / "sproutcore.js"
    output.write_bytes(combined)
    
    combined = combine_sproutcore_stylesheets(sproutcore_built / "sproutcore", filters=sproutcore_filters)
    output = snapshot / "sproutcore.css"
    output.write_bytes(combined)
    
    copy_sproutcore_files(sproutcore_built / "sproutcore", snapshot, filters=sproutcore_filters)
    
    combined = combine_sproutcore_stylesheets(sproutcore_built / "core_test")
    output = snapshot / "core_test.css"
    output.write_bytes(combined)
    
    combined = combine_sproutcore_files([sproutcore_built / "core_test"])
    output = snapshot / "core_test.js"
    output.write_bytes(combined)
    
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
BASE_RULES.add(Include("core_test"))
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
    # "mixins/control.js",
    # "mixins/string.js",
    # "mixins/tree_item_content.js",
    # "private/tree_item_observer.js",
    "system/datetime.js",
    "system/json.js",
    RE("tests/.*")
]))
BASE_RULES.add(Exclude("sproutcore/frameworks/desktop", [
    RE("debug/.*"),
    RE("tests/.*")
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
@needs(['build_docs', 'fetch_compiler'])
def release_embed(options):
    builddir = options.builddir
    if not builddir.exists():
        builddir.mkdir()
    
    yui_compressor = path("abbot/vendor/yui-compressor/yuicompressor-2.4.2.jar")
    closure_compiler = options.fetch_compiler.dest_dir / "compiler.jar"
    
    version = options.version.number
    outputdir = builddir / ("BespinEmbedded-DropIn-%s" 
        % (version))
    
    info("Building DropIn using dryice")
    info(sh('dryice -j%s -c%s -Doutput_dir=\\"%s\\" dropin.json' % 
        (closure_compiler, yui_compressor, outputdir), 
        capture=True, ignore_error=True))
    
    path("LICENSE.txt").copy(outputdir / "LICENSE.txt")
    path("embedded/README-DropIn.txt").copy(outputdir / "README.txt")
    (builddir / "docs").copytree(outputdir / "docs")
    sh("tar czf BespinEmbedded-DropIn-%s.tar.gz BespinEmbedded-DropIn-%s" % \
        (version, version), cwd="tmp")
    
    outputdir = builddir / ("BespinEmbedded-Customizable-%s" % (version))
    info("Building Customizable package")
    if outputdir.exists():
        outputdir.rmtree()
    outputdir.mkdir()
    path("LICENSE.txt").copy(outputdir / "LICENSE.txt")
    path("embedded/README-Customizable.txt").copy(outputdir / "README.txt")
    (builddir / "docs").copytree(outputdir / "docs")
    
    frameworks_dir = outputdir / "frameworks"
    frameworks_dir.mkdir()
    path("frameworks/bespin").copytree(frameworks_dir / "bespin")
    path("sproutcore").copytree(outputdir / "sproutcore")
    
    libdir = outputdir / "lib"
    libdir.mkdir()
    dryice_dest = libdir / "dryice"
    path("dryice").copytree(dryice_dest)
    for f in dryice_dest.walkfiles("*.pyc"):
        f.unlink()
        
    path("embedded/dryice.py").copy(outputdir / "dryice.py")
    path("plugins").copytree(outputdir / "plugins")
    path("embedded/sample.json").copy(outputdir / "sample.json")
    
    compressors_dir = outputdir / "compressors"
    compressors_dir.mkdir()
    
    yui_compressor.copy(compressors_dir / "yuicompressor.jar")
    closure_compiler.copy(compressors_dir / "compiler.jar")
    
    sh("tar czf BespinEmbedded-Customizable-%s.tar.gz BespinEmbedded-Customizable-%s" % \
        (version, version), cwd="tmp")
    
def _fetchfile(name, dest_dir, download_location, download_url):
    external = path("external")
    if not dest_dir.exists():
        external.mkdir()
        if not download_location.exists():
            info("Downloading %s from %s", name, download_url)
            zi = urllib2.urlopen(download_url)
            zo = open(download_location, "wb")
            zo.write(zi.read())
            zo.close()
            zi.close()
        
        info("Uncompressing %s", name)    
        zf = zipfile.ZipFile(download_location)
        for name in zf.namelist():
            pieces = name.split('/', 1)
            if len(pieces) == 1:
                dest_dir.makedirs()
                
                info("Expanding %s", name)
                open(dest_dir / name, "wb").write(zf.read(name))
                continue
                
            outname = name.split('/', 1)[1]
            if name.endswith('/'):
                (external / outname).makedirs()
            else:
                info("Expanding %s", outname)
                open(external / outname, "wb").write(zf.read(name))
    
    
@task
def fetch_compiler(options):
    """Fetches the Closure Compiler used to compress builds."""
    _fetchfile("Closure Compiler", options.dest_dir, options.download_location,
        options.download_url)
    
@task
def jsdocs(options):
    """Generate API documentation using the jsdoc-toolkit."""
    _fetchfile("jsdoc-toolkit", options.dest_dir, options.download_location,
        options.download_url)
        
    outputdir = options.builddir / "docs" / "api"
    if outputdir.exists():
        outputdir.rmtree()
    outputdir.makedirs()
    sourcedir = (path.getcwd() / "frameworks" / "bespin").abspath()
    
    command = ("java -jar jsrun.jar app/run.js -a "
                    "--directory=%s "
                    "--encoding=utf-8 "
                    "--recurse=10 "
                    "--securemodules "
                    "--template=%s/templates/jsdoc "
                    "--verbose "
                    "%s") % (outputdir.abspath(), options.dest_dir.abspath(), sourcedir)
                    
    sh(command, cwd=options.dest_dir)
        
    
@task
def docs(options):
    """Display the documentation in your web browser."""
    docdir = options.builddir / "docs"
    if not docdir.exists():
        call_task("build_docs")
    webbrowser.open("file:///%s/index.html" % docdir.abspath())
    
