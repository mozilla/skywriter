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


import sys
import os
import optparse
import subprocess

try:
    from json import loads, dumps
except ImportError:
    from simplejson import loads, dumps

from dryice.path import path

from dryice import plugins, combiner

class BuildError(Exception):
    pass

sample_file = path(__file__).dirname() / "sample.html"
inline_file = path(__file__).dirname() / "inline.js"
boot_file = path(__file__).dirname() / "boot.js"

def ignore_css(src, names):
    return [name for name in names if name.endswith(".css")]

class Manifest(object):
    """A manifest describes what should be built."""
    def __init__(self, include_core_test=False, plugins=None,
        search_path=None, sproutcore=None, bespin=None,
        output_dir="build", include_sample=False):
        
        self.include_core_test = include_core_test
        self.plugins = plugins
        
        if search_path is not None:
            for i in range(0, len(search_path)):
                name = search_path[i]
                
                # did we get handed a dict already?
                if not isinstance(name, basestring):
                    continue
                
                # convert to the dict format that is used by
                # the plugin module    
                search_path[i] = dict(name=name, path=path(name))
        else:
            search_path = []
            
        # add the default plugin directory, if it exists
        plugindir = path("plugins")
        if plugindir.exists():
            for name in plugindir.glob("*"):
                if not name.isdir():
                    continue
                search_path.append(dict(name=name, path=name))
                
        self.search_path = search_path
        
        if sproutcore is None:
            sproutcore = path("sproutcore")
            
        if not sproutcore or not sproutcore.exists():
            raise BuildError("Cannot find SproutCore (looked in %s)" 
                % sproutcore.abspath())
                
        self.sproutcore = sproutcore
        
        if bespin is None:
            bespin = path("frameworks") / "bespin"
            
        if not bespin or not bespin.exists():
            raise BuildError("Cannot find Bespin core code (looked in %s)"
                % bespin.abspath())

        self.bespin = bespin
        
        if not output_dir:
            raise BuildError("""Cannot run unless output_dir is set
(it defaults to 'build'). The contents of the output_dir directory
will be deleted before the build.""")
        self.output_dir = path(output_dir)
        
        self.include_sample = include_sample
        
    @classmethod
    def from_json(cls, json_string, overrides=None):
        """Takes a JSON string and creates a Manifest object from it."""
        try:
            data = loads(json_string)
        except ValueError:
            raise BuildError("The manifest is not legal JSON: %s" % (json_string))
        scrubbed_data = dict()
        
        # you can't call a constructor with a unicode object
        for key in data:
            scrubbed_data[str(key)] = data[key]
        
        if overrides:
            scrubbed_data.update(overrides)
            
        return cls(**scrubbed_data)
    
    @property
    def errors(self):
        try:
            return self._errors
        except AttributeError:
            self._plugin_catalog = dict((p.name, p) for p in plugins.find_plugins(self.search_path))
            
            errors = []
            
            for plugin in self.plugins:
                if not plugin in self._plugin_catalog:
                    errors.append("Plugin %s not found" % plugin)
            
            self._errors = errors
            return self._errors
    
    def get_plugin(self, name):
        """Retrieve a plugin by name."""
        return self._plugin_catalog[name]
    
    def get_package(self, name):
        """Retrieve a combiner.Package by name."""
        plugin = self.get_plugin(name)
        return combiner.Package(plugin.name, plugin.depends)
            
    def _write_sproutcore_file(self, f, filename):
        """Writes one of the sproutcore files to the file
        object f."""
        fullpath = self.sproutcore / filename
        if not fullpath.exists():
            raise BuildError("%s file missing at %s" %
                (filename, fullpath.abspath()))
        
        f.write(fullpath.bytes())
        
    def generate_output_files(self, output_js, output_css, package_list=None):
        """Generates the combined JavaScript file, putting the
        output into output_file."""
        output_dir = self.output_dir
        
        if self.errors:
            raise BuildError("Errors found, stopping...")
        
        # Wrap the whole thing in a closure to protect the global
        # namespace.
        # commented out for now (see the note at the end of this
        # function where the closure is closed off)
#         output_js.write("""var tiki = function(){
# """)
        output_js.write(inline_file.bytes())
            
        # include SproutCore
        self._write_sproutcore_file(output_js, "sproutcore.js")
        self._write_sproutcore_file(output_css, "sproutcore.css")
        
        # include coretest if desired
        if self.include_core_test:
            self._write_sproutcore_file(output_js, "core_test.js")
            self._write_sproutcore_file(output_css, "core_test.css")
        
        # include Bespin core code
        exclude_tests = not self.include_core_test

        combiner.combine_files(output_js, output_css, "bespin",
            self.bespin, exclude_tests=exclude_tests)
        
        # finally, package up the plugins
        
        if package_list is None:
            package_list = self.get_package_list()
            
        for package in package_list:
            plugin = self.get_plugin(package.name)
            combiner.combine_files(output_js, output_css, plugin.name, 
                                   plugin.location,
                                   exclude_tests=exclude_tests,
                                   image_path_prepend="resources/%s/" 
                                                      % plugin.name)
            
        # include plugin metadata
        # this comes after the plugins, because some plugins
        # may need to be importable at the time the metadata
        # becomes available.
        all_md = dict()
        for p in package_list:
            plugin = self.get_plugin(p.name)
            all_md[plugin.name] = plugin.metadata
        output_js.write("""
tiki.require("bespin:plugins").catalog.load(%s);
""" % (dumps(all_md)))
        
        output_js.write(boot_file.bytes())
        
        # close off our closure
        # commented out because this doesn't work yet
        # we have *two* SC namespaces showing up and need to
        # reconcile that first.
#         output_js.write("""
#     return tiki;
# }();
# """)
        
    def get_package_list(self):
        package_list = [self.get_package(p) 
            for p in self.plugins]
        package_list = combiner.toposort(package_list,
            package_factory=self.get_package)
        return package_list
        
    def build(self):
        """Run the build according to the instructions in the manifest.
        """
        if self.errors:
            raise BuildError("Errors found, stopping...")
        
        output_dir = self.output_dir
        print "Placing output in %s" % output_dir
        if output_dir.exists():
            output_dir.rmtree()
        
        output_dir.makedirs()
        
        package_list = self.get_package_list()
        
        jsfilename = output_dir / "BespinEmbedded.js"
        cssfilename = output_dir / "BespinEmbedded.css"
        jsfile = jsfilename.open("w")
        cssfile = cssfilename.open("w")
        self.generate_output_files(jsfile, cssfile, package_list)
        jsfile.close()
        cssfile.close()
        
        combiner.copy_sproutcore_files(self.sproutcore, output_dir)
        
        for package in package_list:
            plugin = self.get_plugin(package.name)
            resources = plugin.location / "resources"
            if resources.exists() and resources.isdir():
                resources.copytree(output_dir / "resources" / plugin.name,
                    ignore=ignore_css)
            
        
        if self.include_sample:
            sample_file.copy(output_dir / "sample.html")
        
    def compress_js(self, compressor):
        """Compress the output using Closure Compiler."""
        print "Compressing JavaScript with Closure Compiler"
        compressor = path(compressor).abspath()
        subprocess.call("java -jar %s "
            "--js=BespinEmbedded.js"
            " --js_output_file=BespinEmbedded.compressed.js" 
            " --warning_level=QUIET" % compressor,
            shell=True, cwd=self.output_dir)
    
    def compress_css(self, compressor):
        """Compress the CSS using YUI Compressor."""
        print "Compressing CSS with YUI Compressor"
        compressor = path(compressor).abspath()
        subprocess.call("java -jar %s"
            " --type css -o BespinEmbedded.compressed.css"
            " BespinEmbedded.css" % compressor, shell=True,
            cwd=self.output_dir)
        

def main(args=None):
    if args is None:
        args = sys.argv
    
    print "dryice: the Bespin build tool"
    parser = optparse.OptionParser(
        description="""Builds fast-loading JS and CSS packages.""")
    parser.add_option("-j", "--jscompressor", dest="jscompressor",
        help="path to Closure Compiler to compress the JS output")
    parser.add_option("-c", "--csscompressor", dest="csscompressor",
        help="path to YUI Compressor to compress the CSS output")
    parser.add_option("-D", "--variable", dest="variables",
        action="append", 
        help="override values in the manifest (use format KEY=VALUE, where VALUE is JSON)")
    options, args = parser.parse_args(args)
    
    overrides = {}
    if options.variables:
        for setting in options.variables:
            key, value = setting.split("=")
            overrides[key] = loads(value)
    
    if len(args) > 1:
        filename = args[1]
    else:
        filename = "manifest.json"
    
    filename = path(filename)
    if not filename.exists():
        raise BuildError("Build manifest file (%s) does not exist" % (filename))
        
    print "Using build manifest: ", filename
    manifest = Manifest.from_json(filename.text(), overrides=overrides)
    manifest.build()
    
    if options.jscompressor:
        manifest.compress_js(options.jscompressor)
    
    if options.csscompressor:
        manifest.compress_css(options.csscompressor)
    