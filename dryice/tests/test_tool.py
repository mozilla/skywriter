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

from cStringIO import StringIO

from dryice import tool
from dryice.path import path

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

def test_manifest_overrides():
    sample = """
    {
        "output_dir": "foo",
        "plugins": ["Editor"]
    }
"""
    manifest = tool.Manifest.from_json(sample, dict(output_dir="bar"))
    assert manifest.output_dir == "bar"

def test_search_path_adds_to_front():
    sample = """
    {
        "plugins": ["Editor"],
        "search_path": ["foo"]
    }
"""
    manifest = tool.Manifest.from_json(sample)
    assert len(manifest.search_path) > 1, "search path in file is in addition"
    assert manifest.search_path[0]['path'] == 'foo'

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
    assert "var tiki =" in output
    assert """tiki.register("plugin1",""" in output
    assert """tiki.register("plugin2",""" in output
    assert """tiki.module("plugin2:mycode",""" in output
    assert """exports.plugin2func = function""" in output
    assert "exports.Plugin = SC.Object.extend" in output
    assert '"depends": ["plugin2"]' in output
    assert "SC.browser=" in output
    assert 'tiki.require("Embedded")' in output

def test_single_file_plugin_handling():
    manifest = tool.Manifest(plugins=["SingleFilePlugin1"],
        search_path=pluginpath, include_core_test=True)
    output = StringIO()
    manifest.generate_output_files(output, StringIO())
    output = output.getvalue()
    assert "exports.someFunction" in output
    assert "SingleFilePlugin1:index" in output
    match = find_with_context(output, 'tiki.module("SingleFilePlugin1:../')
    assert match is None
    
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
    assert "sc-view.handles" in output_css
    assert "background-image: url(resources/plugin1/images/prompt1.png);" in output_css
    
def test_full_output():
    tmppath = path.getcwd() / "tmp" / "testoutput"
    manifest = tool.Manifest(plugins=["Editor"],
        output_dir=tmppath, include_sample=True)
    manifest.build()
    jsfile = tmppath / "BespinEmbedded.js"
    assert jsfile.exists()
    samplefile = tmppath / "sample.html"
    assert samplefile.exists()
    
def test_image_copying():
    tmppath = path.getcwd() / "tmp" / "testoutput"
    manifest = tool.Manifest(plugins=["plugin1"],
        search_path=pluginpath, include_core_test=True, 
        output_dir=tmppath)
    manifest.build()
    imagedir = tmppath / "images"
    assert imagedir.exists()
    themefile = imagedir / "sc-theme-repeat-x.png"
    assert themefile.exists()
    
    plugin_image_dir = tmppath / "resources" / "plugin1" / "images"
    promptfile = plugin_image_dir / "prompt1.png"
    assert promptfile.exists()
    