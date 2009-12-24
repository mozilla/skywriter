import sys
import optparse

try:
    from json import loads
except ImportError:
    from simplejson import loads

class Manifest(object):
    def __init__(self, include_core_test=False, plugins=None):
        self.include_core_test = include_core_test
        self.plugins = plugins
        
    @classmethod
    def from_json(cls, json_string):
        data = loads(json_string)
        scrubbed_data = dict()
        
        # you can't call a constructor with a unicode object
        for key in data:
            scrubbed_data[str(key)] = data[key]
            
        return cls(**scrubbed_data)

def main(args=None):
    if args is None:
        args = sys.argv
    
    print "The Bespin Build tool"
    parser = optparse.OptionParser(
        description="""Builds fast-loading JS and CSS packages.""")
    options, args = parser.parse_args(args)
    