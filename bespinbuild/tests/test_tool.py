from cStringIO import StringIO

from bespinbuild import tool
from bespinbuild.path import path

plugindir = path(__file__).dirname() / "plugindir"
pluginpath = [dict(name="pl", path=plugindir)]

def test_manifest_creation():
    sample = """
    {
        "include_core_test": true,
        "plugins": ["Editor"]
    }
"""
    manifest = tool.Manifest.from_json(sample)
    assert manifest.include_core_test
    assert manifest.errors == []

def test_manifest_errors():
    sample = """
{
    "plugins": ["BogusPlugin"]
}
"""
    manifest = tool.Manifest.from_json(sample)
    errors = manifest.errors
    assert errors
    
def find_with_context(s, substr):
    """Searches for substr in s, if it's not there returns None.
    If it's there, it returns a string with context.
    
    This function is useful for tests where you don't expect
    a string to appear, but it does."""
    index = s.find(substr)
    if index == -1:
        return None
    context_begin = index - 40 if index > 40 else 0
    context_end = index + 80
    if context_end > len(s):
        context_end = -1
    return s[context_begin:context_end]
    
def test_js_creation():
    manifest = tool.Manifest(plugins=["plugin1"], 
        search_path=pluginpath, include_core_test=True)
    output = StringIO()
    manifest.generate_output_files(output, StringIO())
    output = output.getvalue()
    path("/tmp/foo").write_bytes(output)
    assert "var tiki =" in output
    assert """tiki.register("plugin1",""" in output
    assert """tiki.register("plugin2",""" in output
    assert """tiki.module("plugin2:mycode",""" in output
    assert """exports.plugin2func = function""" in output
    
def test_js_creation_with_core_test():
    sample = """
{
    "include_core_test": true,
    "plugins": ["Editor"]
}
"""
    manifest = tool.Manifest.from_json(sample)
    output = StringIO()
    manifest.generate_output_files(output, StringIO())
    output = output.getvalue()
    assert "core_test" in output
    assert "var tiki =" in output
    assert "PluginDev" in output

def test_js_creation_without_core_test():
    sample = """
{
    "plugins": ["Editor"]
}
"""
    manifest = tool.Manifest.from_json(sample)
    output = StringIO()
    manifest.generate_output_files(output, StringIO())
    output = output.getvalue()
    assert find_with_context(output, "core_test") == None
    assert "var tiki =" in output
    assert "PluginDev" not in output
    
    
def test_css_creation():
    manifest = tool.Manifest(plugins=["plugin1"], 
        search_path=pluginpath, include_core_test=True)
    output_js = StringIO()
    output_css = StringIO()
    manifest.generate_output_files(output_js, output_css)
    output_css = output_css.getvalue()
    assert "color: white" in output_css
    