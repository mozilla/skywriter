import sys
import os
import optparse

try:
    from json import loads
except ImportError:
    from simplejson import loads

from bespinbuild.path import path

from bespinbuild import plugins, combiner

class BuildError(Exception):
    pass

class Manifest(object):
    """A manifest describes what should be built."""
    def __init__(self, include_core_test=False, plugins=None,
        search_path=None, sproutcore=None):
        
        self.include_core_test = include_core_test
        self.plugins = plugins
        
        if search_path is None:
            search_path = []
            plugindir = path("plugins")
            if plugindir.exists():
                for name in plugindir.glob("*"):
                    if not name.isdir():
                        continue
                    search_path.append(dict(name=name, path=name))
        self.search_path = search_path
        
        if sproutcore is None:
            sproutcore = path("sproutcore")
            if not sproutcore.exists():
                raise BuildError("Cannot find SproutCore (looked in %s)" 
                    % sproutcore.abspath())
        self.sproutcore = sproutcore
        
    @classmethod
    def from_json(cls, json_string):
        """Takes a JSON string and creates a Manifest object from it."""
        data = loads(json_string)
        scrubbed_data = dict()
        
        # you can't call a constructor with a unicode object
        for key in data:
            scrubbed_data[str(key)] = data[key]
            
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
            
    def generate_output_files(self, output_js, output_css):
        """Generates the combined JavaScript file, putting the
        output into output_file."""
        if self.errors:
            raise BuildError("Errors found, stopping...")
            
        sproutcore_js = self.sproutcore / "sproutcore.js"
        if not sproutcore_js.exists():
            raise BuildError("sproutcore.js file missing at %s" % (sproutcore_js.abspath()))
        
        output_js.write(sproutcore_js.bytes())
        
        if self.include_core_test:
            core_test_js = self.sproutcore / "core_test.js"
            if not core_test_js.exists():
                raise BuildError("core_test.js file missing at %s" %
                    core_test_js.abspath())
            output_js.write(core_test_js.bytes())
        
        package_list = [self.get_package(p) 
            for p in self.plugins]
        package_list = combiner.toposort(package_list,
            package_factory=self.get_package)
        
        exclude_tests = not self.include_core_test
        
        for package in package_list:
            plugin = self.get_plugin(package.name)
            combiner.combine_files(output_js, output_css, plugin.name, 
                                   plugin.location,
                                   exclude_tests=exclude_tests)

def main(args=None):
    if args is None:
        args = sys.argv
    
    print "The Bespin Build tool"
    parser = optparse.OptionParser(
        description="""Builds fast-loading JS and CSS packages.""")
    options, args = parser.parse_args(args)
    