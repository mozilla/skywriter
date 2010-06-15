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


try:
    from json import loads
except ImportError:
    from simplejson import loads

from path import path

from dryice import plugins

thisdir = path(__file__).dirname()
plugindir = (thisdir / "plugindir").abspath()
pluginpath = [dict(name="testplugins", path=plugindir, 
                  chop=len(plugindir))]


def test_plugin_metadata_parsing():
    tests = [
        ["""

"define metadata";
({"foo": "bar"});
"end";

More code here...

""", dict(foo="bar")],
        ["""
        'define metadata'   ;  
        ({"bar":
            "baz"}
        );
    "end";
""", dict(bar="baz")],
        ["""
""", None],
        ["""
"define metadata";
({});

// there is no end
""", None],
        ["""
"define metadata";
var metadata = {"foo": 1};
"end";


""", dict(foo=1)]
    ]
    
    def run_one(input, expected):
        md_text = plugins._parse_md_text(input.split("\n"))
        print md_text
        if expected is None:
            assert md_text is None
        else:
            assert md_text
            parsed = loads(md_text)
            assert parsed == expected
    
    for test in tests:
        yield run_one, test[0], test[1]

def test_plugin_metadata():
    plugin_list = list(plugins.find_plugins(pluginpath))
    assert len(plugin_list) == 6
    p = plugin_list[0]
    assert p.name == "plugin1"
    assert p.location_name == "testplugins"
    assert p.relative_location == "plugin1"
    
    plugin_type = p.metadata['type']
    assert plugin_type == "testplugins"
    
    tm = p.testmodules
    assert "tests/testFoo" in tm
    assert not p.errors
    assert p.dependencies["plugin2"] == "0.0"
    s = p.scripts
    assert len(s) == 4
    assert "thecode.js" in s
    assert "subdir/morecode.js" in s
    text = p.get_script_text("thecode.js")
    assert "this is the code" in text
    
    p = plugin_list[1]
    assert p.name == "plugin2"
    assert not p.errors
    assert not p.dependencies
    s = p.scripts
    assert len(s) == 1
    assert s == ["mycode.js"]
    
    p = plugin_list[2]
    assert p.name == "plugin3"
    assert p.errors[0] == "Problem with metadata JSON: No JSON object could be decoded"
    
    p = plugin_list[3]
    assert p.name == "SingleFilePlugin1"
    assert p.location_name == "testplugins"
    errors = p.errors
    assert errors == []
    s = p.scripts
    assert s == [""]
    script_text = p.get_script_text("")
    assert "exports.someFunction" in script_text
    
    p = plugin_list[4]
    assert p.name == "SingleFilePlugin2"
    errors = p.errors
    assert errors

def test_plugin_stylesheets():
    plugin = plugins.lookup_plugin("plugin1", pluginpath)
    assert plugin.stylesheets == ["resources/foo.css"]
    plugin = plugins.lookup_plugin("plugin2", pluginpath)
    assert plugin.stylesheets == []
    plugin = plugins.lookup_plugin("SingleFilePlugin1", pluginpath)
    assert plugin.stylesheets == []
    

def test_lookup_plugin():
    plugin = plugins.lookup_plugin("DOES NOT EXIST", pluginpath)
    assert plugin is None
    plugin = plugins.lookup_plugin("plugin1", pluginpath)
    assert not plugin.errors
    assert plugin.location_name == "testplugins"
    plugin = plugins.lookup_plugin("SingleFilePlugin1", pluginpath)
    assert not plugin.errors
    
def test_resource_url():
    plugin = plugins.lookup_plugin("plugin1", pluginpath)
    md = plugin.metadata
    assert md["resourceURL"] == "resources/plugin1/"
    
def test_single_plugin_in_path():
    temppath = pluginpath[:]
    temppath.append(dict(name="user", plugin=thisdir / "SinglePlugin.js",
        chop=len(thisdir)))
    plugin = plugins.lookup_plugin("SinglePlugin", temppath)
    errors = plugin.errors
    assert not errors
    
    plugin_list = plugins.find_plugins(temppath)
    assert len(plugin_list) == 7
    p = plugin_list[6]
    assert p.name == "SinglePlugin"
    plugin_type = p.metadata['type']
    assert plugin_type == "user"
    assert p.templates == {}
    
def test_nonexistent_plugin():
    temppath = pluginpath[:]
    temppath.append(dict(name="user", plugin=thisdir / "NotThere.js",
        chop=len(thisdir)))
    plugin = plugins.lookup_plugin("NotThere", temppath)
    assert plugin is None

def test_templates_in_plugin():
    plugin = plugins.lookup_plugin("plugin1", pluginpath)
    templates = plugin.templates
    assert len(templates) == 1
    assert 'one.htmlt' in templates
    assert 'js micro template' in templates['one.htmlt']
    
    tm = plugin.template_module
    assert "js micro template" in tm
    