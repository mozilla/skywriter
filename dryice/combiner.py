# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Bespin.
#
# The Initial Developer of the Original Code is
# Mozilla.
# Portions created by the Initial Developer are Copyright (C) 2009
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****


"""Combines the JavaScript files appropriately."""

import re

try:
    from json import loads
except ImportError:
    from simplejson import loads

class Package(object):
    visited = False
    
    def __init__(self, name, depends):
        self.name = name
        self.depends = depends
    
    def __repr__(self):
        return "Package(%s)" % (self.name)

class NullOutput(object):
    def write(self, s):
        pass

def toposort(unsorted, package_factory=None, reset_first=False):
    """Topologically sorts Packages. This algorithm is the
    depth-first version from Wikipedia:
    http://en.wikipedia.org/wiki/Topological_sorting
    """
    if reset_first:
        for package in unsorted:
            package.visited = False
            
    mapping = dict((package.name, package) for package in unsorted)
    l = []
    
    def visit(p):
        if not p.visited:
            p.visited = True
            for dependency in p.depends:
                try:
                    visit(mapping[dependency])
                except KeyError:
                    new_package = package_factory(dependency)
                    mapping[new_package.name] = new_package
                    visit(new_package)
            l.append(p)
        
    for package in unsorted:
        visit(package)
        
    return l

_css_images_url = re.compile(r'url\(\s*([\'"]*)images/')

def combine_files(jsfile, cssfile, name, p, add_main=False, 
                  exclude_tests=True, image_path_prepend=None):
    """Combines the files in an app into a single .js, with all
    of the proper information for Tiki.
    
    Arguments:
    jsfile: file object to write combined JavaScript to
    cssfile: file object to write combined CSS to (may be None if 
        there is no CSS)
    name: application name (will become Tiki package name)
    p: path object pointing to the app's directory
    add_main: for an app (rather than a plugin) you should add a call
        to main so that SproutCore will start the app
    exclude_tests: should contents of tests directories be included in the
        combined output?
    """
    
    if cssfile is None:
        cssfile = NullOutput()
    
    jsfile.write(""";tiki.register("%s",{});""" % (name))
    
    has_index = False
    
    if p.isdir():
        for f in p.walkfiles("*.css"):
            if image_path_prepend:
                content = _css_images_url.sub("url(\\1%simages/" % (image_path_prepend), f.text())
                cssfile.write(content)
            else:
                cssfile.write(f.bytes())
            
        filelist = p.walkfiles("*.js")
        single_file = False
    else:
        filelist = [p]
        single_file = True
    
    for f in filelist:
        if exclude_tests and "tests" in f.splitall():
            continue
        
        if single_file:
            modname = "index"
        else:
            modname = p.relpathto(f.splitext()[0])
            
        if modname == "index":
            has_index = True
        
        jsfile.write("""
tiki.module("%s:%s",function(require,exports,module) {
""" % (name, modname))
        jsfile.write(f.bytes())
        jsfile.write("""
});
""")
    
    if not has_index:
        if add_main:
            module_contents = """
exports.main = require("main").main;
"""
        else:
            module_contents = ""
        jsfile.write("""
tiki.module("%s:index",function(require,exports,module){%s});
""" % (name, module_contents))
    
    if add_main:
        jsfile.write("""
tiki.main("%s", "main");
""" % (name))


####
# This part is for combining the SproutCore files.
####

_make_json=re.compile('([\{,])(\w+):')
_register_line = re.compile(r'tiki.register\(["\']([\w/]+)["\'],\s*(.*)\);')
_globals_line = re.compile(r'tiki.global\(["\']([\w/]+)["\']\);')

def _quotewrap(m):
    return m.group(1) + '"' + m.group(2) + '":'
    
def _get_file_list(paths, pattern, filters=None):
    flist = []
    
    for p in paths:
        flist.extend(list(p.walkfiles(pattern)))
    
    flist = [f for f in flist if "en" in f]
    
    if filters:
        for filter in filters:
            flist = [f for f in flist if filter not in f]
    
    return flist

def combine_sproutcore_files(paths, starting="", pattern="javascript.js",
    filters=None, manual_maps=[]):
    """Combines files that are output by Abbot, taking extra care with the
    stylesheets because we want to explicitly register them rather than
    loading them individually.
    
    Arguments:
    paths: list of path objects to look for files in
    starting: initial text, if you're using multiple calls to this function
    pattern: file glob to search for
    filters: list of substring matches to perform. any that match are tossed
    manual_maps: (regex, name) tuples that map matching files to that package name
                this is used if the file does not contain a parseable tiki.register
                line.
    
    Returns: the combined bytes
    """
    stylesheets = set()
    
    newcode = ""
    
    flist = _get_file_list(paths, pattern, filters)
    
    packages = []
    
    # keep track of whether or not we've seen the "tiki"
    # package. If we have, then we know that the stylesheet
    # declarations need to come after the tiki package,
    # otherwise tiki.stylesheet() will not be defined.
    found_tiki = False
    
    for f in flist:
        splitname = f.splitall()
        if not "en" in splitname:
            continue
            
        filehandle = f.open()
        firstline = filehandle.readline()
        if firstline.startswith("/"):
            firstline = filehandle.readline()
        filehandle.close()
        
        firstline = _make_json.sub(_quotewrap, firstline)
        
        # look for a tiki.register line to get package
        # metadata
        m = _register_line.search(firstline)
        if m:
            name = m.group(1)
            data = loads(m.group(2))
        else:
            # no package metadata found, see if there's
            # a manual mapping to package name
            found = False
            for expr, name in manual_maps:
                if expr.search(f):
                    found = True
                    
            # no manual mapping. we'll assume it's okay
            # to just add this JavaScript.
            if not found:
                print ("Module in %s is missing the register call", f)
                print firstline
                newcode += f.bytes()
                continue
            
            # there was a manual mapping, but we don't have
            # metadata other than the name
            data = {}
            
        # store package information so that we can do a
        # topological sort of it
        if "stylesheets" in data:
            for s in data['stylesheets']:
                stylesheets.add(s['id'])
        
        if name == "tiki":
            found_tiki = True
            
        p = Package(name, data.get('depends', []))
        packages.append(p)
        p.content = f.bytes()
    
    # commented out for the moment. this is not necessary (and may actually
    # even be a problem)
    # globals = set()
    # def replace_global(m):
    #     """Remove the global call, but keep track of it so that it can be added to the end of the file.
    #     Tiki doesn't want the global registered until the file is ready to load."""
    #     globals.add(m.group(1))
    #     return ""
    
    if not found_tiki:
        newcode = starting + "".join('tiki.stylesheet("%s");' % 
                s for s in stylesheets) + newcode
    else:
        newcode = starting + newcode
        
    packages = toposort(packages)
    for p in packages:
        newcode += p.content
        if found_tiki and p.name == "tiki":
            newcode += "".join('tiki.stylesheet("%s");' % 
                    s for s in stylesheets)
        
    return newcode

_images_url = re.compile(r'url\(.*/en/\w+/images/(.*)[\'"]\)')

def _url_replacer(m):
    return 'url("images/%s")' % (m.group(1))

def combine_sproutcore_stylesheets(p, combined="", filters=None):
    flist = _get_file_list([p], "stylesheet.css", filters)
    for f in flist:
        content = f.bytes()
        content = _images_url.sub(_url_replacer, content)
        combined += content
    return combined

def copy_sproutcore_files(p, dest, filters=None):
    paths = list(p.walkdirs("images"))
    if filters:
        for f in filters:
            paths = [path for path in paths if f not in path]
            
    for p in paths:
        for f in p.walkfiles():
            destpath = dest / "images" / p.relpathto(f)
            destdir = destpath.dirname()
            if not destdir.exists():
                destdir.makedirs()
            f.copy(destpath)
    
