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
# 
import re
from urllib import quote as urlquote

try:
    from json import loads, dumps
except ImportError:
    from simplejson import loads, dumps

_metadata_declaration = re.compile("^[^=]*=\s*")
_trailing_semi = re.compile(";*\s*$")
_leading_paren = re.compile(r"^\s*\(\s*")
_trailing_paren = re.compile(r"\s*\)\s*$")
_start_tag = re.compile(r'^\s*[\'"]define\s+metadata[\'"]\s*;*\s*$')
_end_tag = re.compile(r'^\s*[\'"]end[\'"]\s*;*\s*$')

def wrap_script(plugin, mod_name, script_text):
    return """
bespin.tiki.module("%s:%s",function(require,exports,module) {
%s
});
""" % (plugin.name, mod_name, script_text)

def _parse_md_text(lines):
    """Parses the plugin metadata out of the lines of the JS file.
    """
    start = -1
    end = -1
    for i in xrange(0, len(lines)):
        if _start_tag.match(lines[i]):
            start = i
        elif _end_tag.match(lines[i]):
            end = i
            break
    
    if start == -1 or end == -1:
        return None
    
    md_text = "\n".join(lines[start+1:end])
    md_text = _metadata_declaration.sub("", md_text)
    md_text = _trailing_semi.sub("", md_text)
    md_text = _leading_paren.sub("", md_text)
    md_text = _trailing_paren.sub("", md_text)
    return md_text
    
def get_metadata(location):
    errors = []
    
    if location.isdir():
        plugin_name = location.basename()
        if plugin_name == "":
            plugin_name = location.dirname().basename()
            
        md_path = location / "package.json"
        if not md_path.exists():
            md = {}
            errors = ["Plugin metadata file (package.json) file is missing"]
            md_text = '""'
        else:
            md_text = md_path.text()
    else:
        plugin_name = location.splitext()[0].basename()
        lines = location.lines()
        md_text = _parse_md_text(lines)
        
        if not md_text:
            errors = ["Plugin metadata is missing or badly formatted."]
            md = {}
            return md, errors
            
    try:
        md = loads(md_text)
    except Exception, e:
        errors = ["Problem with metadata JSON: %s" % (e)]
        md = {}
    
    md['name'] = plugin_name
    return md, errors

class Plugin(object):
    def __init__(self, name, location, path_entry):
        self.name = name
        self._errors = []
        self.location = location
        self.location_name = path_entry['name']
        self.relative_location = self.location[path_entry.get("chop", 0)+1:]
    
    @property
    def errors(self):
        md = self.metadata
        return self._errors
    
    @property
    def dependencies(self):
        md = self.metadata
        if md:
            return md.get('dependencies', {})
        return []
        
    @property
    def metadata(self):
        try:
            return self._metadata
        except AttributeError:
            return self.load_metadata()
    
    @property
    def testmodules(self):
        """Returns a list of test modules in this plugin. Test modules
        are in directories called 'tests' and start with the word test."""
        if not self.location.isdir():
            return []
            
        tests = []
        for d in self.location.walkdirs("tests"):
            for f in d.walkfiles("test*"):
                tests.append(self.location.relpathto(f).splitext()[0])
        return tests
    
    @property
    def single_file(self):
        """Returns true if this is a single file plugin
        (ie not a directory with a package.json file)."""
        return not self.location.isdir()
    
    def load_metadata(self):
        """You should use the metadata property to read the metadata.
        When the metadata has not been loaded, this will load it.
        
        A Plugin subclass can override this to add additional information
        to the metadata."""
        md, errors = get_metadata(self.location)
        
        self._errors = errors
        
        md["resourceURL"] = "resources/%s/" % urlquote(self.name)
        md["testmodules"] = self.testmodules
        md["type"] = self.location_name
        
        if self._errors:
            md['errors'] = self._errors
        self._metadata = md
        return md
        

    def _putFilesInAttribute(self, attribute, glob, allowEmpty=True):
        """Finds all of the plugin files matching the given glob
        and puts them in the attribute given. If the
        attribute is already set, it is returned directly."""
        try:
            return getattr(self, attribute)
        except AttributeError:
            loc = self.location
            if loc.isdir():
                l = [loc.relpathto(f) for f in loc.walkfiles(glob)]
            else:
                l = [] if allowEmpty else [""]
            setattr(self, attribute, l)
            return l
        
    
    @property
    def stylesheets(self):
        return self._putFilesInAttribute("_stylesheets", "*.css")
    
    @property
    def scripts(self):
        return self._putFilesInAttribute("_scripts", "*.js", 
            allowEmpty=False)
        
    @property
    def templates(self):
        loc = self.location
        if loc.isdir():
            loc = loc / "templates"
            if not loc.exists():
                return {}

            return dict((loc.relpathto(f), f.text("utf8")) 
                for f in loc.walkfiles("*.htmlt"))
        else:
            return {}
    
    @property
    def template_module(self):
        templates = self.templates
        if not templates:
            return None

        return """
var templater = require('templater');

templater.compileAll(%s, exports);
""" % (dumps(templates))
        
        
    def get_script_text(self, scriptname):
        """Look up the script at scriptname within this plugin."""
        if not self.location.isdir():
            return self.location.text()
            
        script_path = self.location / scriptname
        if not script_path.exists():
            return None
        
        return script_path.text()
    
    def __repr__(self):
        return "Plugin %s (%s)" % (self.name, self.location)
        
                

def find_plugins(search_path, cls=Plugin):
    """Return plugin descriptors for the plugins on the search_path.
    If the search_path is not given, the configured plugin_path will
    be used."""
        
    result = []
    for path_entry in search_path:
        if "plugin" in path_entry:
            name = path_entry["plugin"].basename()
            if name.endswith(".js"):
                name = name[:-3]
            plugin = _get_plugin(name, path_entry, cls)
            if plugin is None:
                continue
            result.append(plugin)
            continue
                
        path = path_entry['path']
        for item in path.glob("*"):
            # plugins are directories with a package.json file or 
            # individual .js files.
            if item.isdir():
                mdfile = item / "package.json"
                if not mdfile.exists():
                    continue
                name = item.basename()
            elif item.ext == ".js":
                name = item.splitext()[0].basename()
            else:
                continue
                
            plugin = cls(name, item, path_entry)
            result.append(plugin)
    return result
    
def _get_plugin(name, path_entry, cls):
    path = path_entry["plugin"]
    if not path.exists():
        return None
        
    if path.endswith(name) or path.endswith(name + ".js"):
        if path.isdir():
            mdfile = path / "package.json"
            if not mdfile.exists():
                return None
                
        plugin = cls(name, path, path_entry)
        return plugin
    else:
        return None
    

def lookup_plugin(name, search_path, cls=Plugin):
    """Return the plugin descriptor for the plugin given."""
    for path_entry in search_path:
        if "plugin" in path_entry:
            plugin = _get_plugin(name, path_entry, cls)
            if plugin is None:
                continue
            return plugin
                
        path = path_entry['path']
        location = path / name
        if not location.exists():
            location = path / (name + ".js")
        if location.exists():
            if location.isdir():
                mdfile = location / "package.json"
                if not mdfile.exists():
                    continue
            plugin = cls(name, location, path_entry)
            return plugin
    
    return None
