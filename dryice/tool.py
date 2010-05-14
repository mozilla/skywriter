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
from wsgiref.simple_server import make_server

try:
    from json import loads, dumps
except ImportError:
    from simplejson import loads, dumps

from dryice.path import path

from dryice import plugins, combiner

class BuildError(Exception):
    def __init__(self, message, errors=None):
        if errors:
            message += "\n"
            for e in errors:
                message += "* %s\n" % (e)
        Exception.__init__(self, message)
                

sample_dir = path(__file__).dirname() / "samples"
_boot_file = path(__file__).dirname() / "boot.js"

def ignore_css(src, names):
    return [name for name in names if name.endswith(".css")]

class Manifest(object):
    """A manifest describes what should be built."""
    
    unbundled_plugins = None
    
    def __init__(self, include_core_test=False, plugins=None,
        search_path=None, 
        output_dir="build", include_sample=False,
        boot_file=None, unbundled_plugins=None, loader=None):

        self.include_core_test = include_core_test
        plugins.insert(0, "bespin")
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

        if boot_file:
            self.boot_file = path(boot_file).abspath()
        else:
            self.boot_file = _boot_file

        if not output_dir:
            raise BuildError("""Cannot run unless output_dir is set
(it defaults to 'build'). The contents of the output_dir directory
will be deleted before the build.""")
        self.output_dir = path(output_dir)

        self.include_sample = include_sample
        
        if unbundled_plugins:
            self.unbundled_plugins = path(unbundled_plugins).abspath()
        
        if loader is None:
            self.loader = path("static/tiki.js")
            if not self.loader.exists():
                self.loader = path("lib/tiki.js")
        else:
            self.loader = path(loader)
            
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
        return combiner.Package(plugin.name, plugin.dependencies)

    def generate_output_files(self, output_js, output_css, package_list=None):
        """Generates the combined JavaScript file, putting the
        output into output_file."""
        output_dir = self.output_dir

        if self.errors:
            raise BuildError("Errors found, stopping...", self.errors)

        output_js.write(self.loader.bytes())

        # include Bespin core code
        exclude_tests = not self.include_core_test

        # finally, package up the plugins

        if package_list is None:
            package_list = self.get_package_list()

        for package in package_list:
            plugin = self.get_plugin(package.name)
            combiner.combine_files(output_js, output_css, plugin,
                                   plugin.location,
                                   exclude_tests=exclude_tests,
                                   image_path_prepend="resources/%s/"
                                                      % plugin.name)

        # include plugin metadata
        # this comes after the plugins, because some plugins
        # may need to be importable at the time the metadata
        # becomes available.
        all_md = dict()
        bundled_plugins = self.bundled_plugins = set()
        for p in package_list:
            plugin = self.get_plugin(p.name)
            all_md[plugin.name] = plugin.metadata
            bundled_plugins.add(plugin.name)
            
        output_js.write("""
bespin.tiki.require("bespin:plugins").catalog.loadMetadata(%s);;
""" % (dumps(all_md)))
        
        if self.boot_file:
            output_js.write(self.boot_file.bytes())

    def get_package_list(self):
        package_list = [self.get_package(p)
            for p in self.plugins]
        package_list = combiner.toposort(package_list,
            package_factory=self.get_package)
        return package_list
        
    def _output_unbundled_plugins(self, output_dir):
        if not output_dir.exists():
            output_dir.makedirs()
        else:
            if not output_dir.isdir():
                raise BuildError("Unbundled plugins can't go in %s because it's not a directory" % output_dir)

        bundled_plugins = self.bundled_plugins
        for name, plugin in self._plugin_catalog.items():
            if name in bundled_plugins:
                continue
            location = plugin.location
            if location.isdir():
                location.copytree(output_dir / location.basename())
            else:
                location.copy(output_dir / location.basename())
        print "Unbundled plugins placed in: %s" % output_dir
                

    def build(self):
        """Run the build according to the instructions in the manifest.
        """
        if self.errors:
            raise BuildError("Errors found, stopping...", self.errors)

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
        
        if self.unbundled_plugins:
            self._output_unbundled_plugins(self.unbundled_plugins)

        for package in package_list:
            plugin = self.get_plugin(package.name)
            resources = plugin.location / "resources"
            if resources.exists() and resources.isdir():
                resources.copytree(output_dir / "resources" / plugin.name,
                    ignore=ignore_css)


        if self.include_sample:
            sample_dir.copytree(output_dir / "samples")

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
    parser.add_option("-s", "--server", dest="server",
        help="starts a server on [address:]port. example: -s 8080")
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
    
    if options.server:
        start_server(filename, options, overrides)
    else:
        do_build(filename, options, overrides)

index_html = """
<!DOCTYPE html>
<html><head>

<link href="BespinEmbedded.css" type="text/css" rel="stylesheet">

<script type="text/javascript" src="BespinEmbedded.js"></script>
</head>
<body style="height: 100%; width: 100%; margin: 0">
<div id="editor" class="bespin" data-bespinoptions='{ "settings": { "tabstop": 4 }, "syntax": "js", "stealFocus": true }' style="width: 100%; height: 100%">// The text of this div shows up in the editor.
var thisCode = "what shows up in the editor";
function editMe() {
 alert("and have fun!");
}
</div>
</body>
</html>
"""

class DryIceAndWSGI(object):
    def __init__(self, filename, options, overrides):
        from static import Cling

        self.filename = filename
        self.options = options
        self.overrides = overrides
        
        manifest = Manifest.from_json(filename.text())
        self.static_app = Cling(manifest.output_dir)
        
    def __call__(self, environ, start_response):
        path_info = environ.get("PATH_INFO", "")
        if not path_info or path_info == "/index.html" or path_info == "/":
            headers = [
                ('Content-Type', 'text/html'),
                ('Content-Length', str(len(index_html)))
            ]
            if environ['REQUEST_METHOD'] == "HEAD":
                headers.append(('Allow', 'GET, HEAD'))
                start_response("200 OK", headers)
                return ['']
            else:
                start_response("200 OK", headers)
                do_build(self.filename, self.options, self.overrides)
                return [index_html]
        else:
            return self.static_app(environ, start_response)

def start_server(filename, options, overrides):
    """Starts the little webserver"""
    app = DryIceAndWSGI(filename, options, overrides)
    server_option = options.server
    if ":" in server_option:
        host, port = server_option.split(":")
    else:
        host = "localhost"
        port = server_option
    port = int(port)
    print "Server started on %s, port %s" % (host, port)
    try:
        make_server(host, port, app).serve_forever()
    except KeyboardInterrupt:
        pass
    
def do_build(filename, options, overrides):
    """Runs the actual build"""
    try:
        manifest = Manifest.from_json(filename.text(), overrides=overrides)
        manifest.build()

        if options.jscompressor:
            manifest.compress_js(options.jscompressor)

        if options.csscompressor:
            manifest.compress_css(options.csscompressor)
    except BuildError, e:
        print "Build aborted: %s" % (e)

