import sys
import os
import optparse

try:
    from json import loads
except ImportError:
    from simplejson import loads

from bespinbuild.path import path

from bespinbuild import plugins

class Manifest(object):
    def __init__(self, include_core_test=False, plugins=None,
        search_path=None):
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
        
    @classmethod
    def from_json(cls, json_string):
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

def main(args=None):
    if args is None:
        args = sys.argv
    
    print "The Bespin Build tool"
    parser = optparse.OptionParser(
        description="""Builds fast-loading JS and CSS packages.""")
    options, args = parser.parse_args(args)
    