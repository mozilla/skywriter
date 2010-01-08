try:
    from json import loads
except ImportError:
    from simplejson import loads

from path import path

from bespinbuild import plugins

plugindir = (path(__file__).dirname() / "plugindir").abspath()
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
    assert len(plugin_list) == 5
    p = plugin_list[0]
    assert p.name == "plugin1"
    assert p.location_name == "testplugins"
    assert p.relative_location == "plugin1"
    assert not p.errors
    assert p.depends[0] == "plugin2"
    s = p.scripts
    assert len(s) == 2
    assert "thecode.js" in s
    assert "subdir/morecode.js" in s
    text = p.get_script_text("thecode.js")
    assert "this is the code" in text
    
    p = plugin_list[1]
    assert p.name == "plugin2"
    assert not p.errors
    assert not p.depends
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
    
