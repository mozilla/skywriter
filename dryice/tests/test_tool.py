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
import codecs

from dryice import tool
from dryice.path import path

plugindir = path(__file__).dirname() / "plugindir"
pluginpath = [dict(name="pl", path=plugindir)]

def test_manifest_creation():
    sample = """
    {
        "include_tests": true,
        "plugins": ["text_editor"]
    }
"""
    manifest = tool.Manifest.from_json(sample)
    assert manifest.include_tests
    errors = manifest.errors
    assert errors == []

def test_manifest_overrides():
    sample = """
    {
        "output_dir": "foo",
        "plugins": ["text_editor"]
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
    "plugins": ["bogus_plugin"]
}
"""
    manifest = tool.Manifest.from_json(sample)
    errors = manifest.errors
    assert errors

def test_worker_in_manifest():
    manifest = tool.Manifest(plugins=["plugin1", "WorkerPlugin"],
        search_path = pluginpath)
    errors = manifest.errors
    plugins = manifest.plugins
    assert "WorkerPlugin" not in plugins
    wp = manifest.worker_plugins
    assert "WorkerPlugin" in wp

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

def encsio():
    Writer = codecs.getwriter("utf8")
    return Writer(StringIO())

def test_js_creation():
    manifest = tool.Manifest(plugins=["plugin1"],
        search_path=pluginpath, include_tests=True)
    shared_js = encsio()
    main_js = encsio()
    manifest.generate_output_files(shared_js, main_js, encsio(), encsio())
    output = shared_js.getvalue()
    assert "var tiki =" in output
    assert "exports.Plugin = function" in output
    # confirm that boot in not in the shared script
    assert "bespin.useBespin" not in output
    # confirm that script2loader is in the shared script
    assert "importScript" in output
    
    output = main_js.getvalue()
    assert '"dependencies": {"plugin2": "0.0"}' in output
    assert """tiki.register("::plugin1",""" in output
    assert """tiki.register("::plugin2",""" in output
    assert """tiki.module("plugin2:mycode",""" in output
    assert """exports.plugin2func = function""" in output
    assert "bespin.useBespin" in output

def test_js_worker_creation():
    manifest = tool.Manifest(plugins=["WorkerPlugin"],
        search_path=pluginpath)
    
    worker_names = [package.name for package in manifest.worker_packages]
    assert "WorkerPlugin" in worker_names
    assert "plugin2" in worker_names
    
    shared_js = encsio()
    main_js = encsio()
    worker_js = encsio()
    manifest.generate_output_files(shared_js, main_js, worker_js, encsio())
    output = shared_js.getvalue()
    assert "var tiki =" in output
    assert "WorkerPlugin" not in output
    assert '"dependencies": {"plugin2": "0.0"}' not in output
    
    output = main_js.getvalue()
    assert "plugin2func" not in output
    assert "exports.inAWorker" not in output
    
    output = worker_js.getvalue()
    assert '"dependencies": {"plugin2": "0.0"}' in output
    assert "WorkerPlugin" in output
    assert """tiki.module("plugin2""" in output

def test_js_worker_and_shared_creation():
    manifest = tool.Manifest(plugins=["plugin1", "WorkerPlugin"],
        search_path=pluginpath)
    
    worker_names = [package.name for package in manifest.worker_packages]
    assert "WorkerPlugin" in worker_names
    assert "plugin2" not in worker_names
    
    shared_names = [package.name for package in manifest.shared_packages]
    assert "plugin2" in shared_names
    assert "bespin" in shared_names
    
    main_names = [package.name for package in manifest.static_packages]
    assert "plugin1" in main_names
    assert "plugin2" not in main_names
    assert "WorkerPlugin" not in main_names
    
    shared_js = encsio()
    main_js = encsio()
    worker_js = encsio()
    manifest.generate_output_files(shared_js, main_js, worker_js, encsio())
    output = shared_js.getvalue()
    
    assert "var tiki =" in output
    assert "WorkerPlugin" not in output
    assert "plugin1" not in output
    assert """tiki.module("plugin2""" in output
    
    output = main_js.getvalue()
    assert "plugin1" in output
    assert "exports.inAWorker" not in output
    assert """tiki.module("plugin2""" not in output
    assert '"dependencies": {"plugin2": "0.0"}' in output
    
    output = worker_js.getvalue()
    assert '"dependencies": {"plugin2": "0.0"}' in output
    assert "WorkerPlugin" in output
    assert """tiki.module("plugin2""" not in output
    

def test_single_file_plugin_handling():
    manifest = tool.Manifest(plugins=["SingleFilePlugin1"],
        search_path=pluginpath, include_tests=True)
    output = encsio()
    main_js = encsio()
    manifest.generate_output_files(output, main_js, encsio(), encsio())
    output = main_js.getvalue()
    assert "exports.someFunction" in output
    assert "SingleFilePlugin1:index" in output
    match = find_with_context(output, 'tiki.module("SingleFilePlugin1:../')
    assert match is None

def test_js_creation_with_core_test():
    sample = """
{
    "include_tests": true,
    "plugins": ["text_editor"]
}
"""
    manifest = tool.Manifest.from_json(sample)
    output = encsio()
    main_js = encsio()
    manifest.generate_output_files(output, main_js, encsio(), encsio())
    output = output.getvalue()
    assert "core_test" in output
    assert "var tiki =" in output
    
    output = main_js.getvalue()
    assert "plugindev" in output

def test_js_creation_without_core_test():
    sample = """
{
    "plugins": ["text_editor"]
}
"""
    manifest = tool.Manifest.from_json(sample)
    output = encsio()
    main_js = encsio()
    manifest.generate_output_files(output, main_js, encsio(), encsio())
    output = output.getvalue()
    assert "var tiki =" in output
    assert "plugindev" not in output


def test_css_creation():
    manifest = tool.Manifest(plugins=["plugin1"],
        search_path=pluginpath, include_tests=True)
    output_js = encsio()
    output_css = encsio()
    manifest.generate_output_files(output_js, encsio(), encsio(), output_css)
    output_css = output_css.getvalue()
    assert "color: white" in output_css
    assert "background-image: url(resources/plugin1/images/prompt1.png);" in output_css

def test_full_output():
    tmppath = path.getcwd() / "tmp" / "testoutput"
    manifest = tool.Manifest(plugins=["text_editor"],
        output_dir=tmppath, include_sample=True)
    manifest.build()
    jsfile = tmppath / "BespinEmbedded.js"
    assert jsfile.exists()
    samplefile = tmppath / "samples" / "sample.html"
    assert samplefile.exists()

def test_image_copying():
    tmppath = path.getcwd() / "tmp" / "testoutput"
    manifest = tool.Manifest(plugins=["plugin1"],
        search_path=pluginpath, include_tests=True,
        output_dir=tmppath)
    manifest.build()

    plugin_image_dir = tmppath / "resources" / "plugin1" / "images"
    promptfile = plugin_image_dir / "prompt1.png"
    assert promptfile.exists()

def test_get_dependencies():
    class MockPackage:
        name = None
        dependencies = None
        def __init__(self, name, deps):
            self.name = name
            self.dependencies = deps

    a = MockPackage('a', [])
    b = MockPackage('b', [])
    c = MockPackage('c', [ 'a', 'b' ])
    d = MockPackage('d', [ 'b' ])
    e = MockPackage('e', [ 'd' ])
    pkgs = { 'a': a, 'b': b, 'c': c, 'd': d, 'e': e }

    manifest = tool.Manifest(plugins=list("abcde"))
    l = manifest.get_dependencies(pkgs, list("abc"))
    assert l == [a,b,c] or l == [b,a,c]

    l = manifest.get_dependencies(pkgs, list("bca"))
    assert l == [a,b,c] or l == [b,a,c]

    l = manifest.get_dependencies(pkgs, list("ceabd"))
    assert l == [a,b,c,d,e]

def test_global_jquery_use():
    tmppath = path.getcwd() / "tmp" / "testoutput"
    manifest = tool.Manifest(plugins=["plugin1"],
        search_path=pluginpath, jquery="global",
        output_dir=tmppath)
    manifest.build()
    jsfile = tmppath / "BespinEmbedded.js"
    output = jsfile.text("utf8")
    assert "exports.$ = window.$;" in output
    