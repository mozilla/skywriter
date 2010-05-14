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
    from json import loads, dumps
except ImportError:
    from simplejson import loads, dumps

from dryice.plugins import wrap_script

class Package(object):
    visited = False
    
    def __init__(self, name, dependencies):
        self.name = name
        self.dependencies = dependencies
    
    def __repr__(self):
        return "Package(%s)" % (self.name)

class NullOutput(object):
    def write(self, s):
        pass

class CombinerError(Exception):
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
            for dependency in p.dependencies:
                # core_test is a special case... that's not a true
                # Bespin plugin, but rather a SproutCore package.
                if dependency == "core_test":
                    continue
                try:
                    visit(mapping[dependency])
                except KeyError:
                    if not package_factory:
                        raise CombinerError("Dependency %s for package %s not found, no package factory available (mapping: %r)" % (dependency, p.name, mapping))
                    try:
                        new_package = package_factory(dependency)
                    except KeyError, e:
                        raise CombinerError("Dependency %s for package %s not found (mapping: %r)" % (dependency, p.name, mapping))
                    mapping[new_package.name] = new_package
                    visit(new_package)
            l.append(p)
        
    for package in unsorted:
        visit(package)
        
    return l

_css_images_url = re.compile(r'url\(\s*([\'"]*)images/')

def combine_files(jsfile, cssfile, plugin, p, 
                  exclude_tests=True, image_path_prepend=None):
    """Combines the files in an app into a single .js, with all
    of the proper information for Tiki.
    
    Arguments:
    jsfile: file object to write combined JavaScript to
    cssfile: file object to write combined CSS to (may be None if 
        there is no CSS)
    name: application name (will become Tiki package name)
    p: path object pointing to the app's directory
    exclude_tests: should contents of tests directories be included in the
        combined output?
    """
    name = plugin.name
    
    if cssfile is None:
        cssfile = NullOutput()
        
    mini_md = {
        "name": plugin.name,
        "dependencies": plugin.dependencies
    }
    
    jsfile.write(""";bespin.tiki.register("::%s",%s);""" % (name,
        dumps(mini_md)))
    
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
            # for the sake of Windows users, ensure that we are
            # only using slashes
            modname = modname.replace("\\", "/")
            
        if modname == "index":
            has_index = True
        
        jsfile.write(wrap_script(plugin, modname, f.bytes()))
    
    if not has_index:
        jsfile.write(wrap_script(plugin, "index", ""))
    
    template_module = plugin.template_module
    if template_module:
        jsfile.write(template_module)
    