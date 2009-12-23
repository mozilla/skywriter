from path import path

from bespinbuild.combiner import Package, toposort, combine_files

def test_toposort():
    a = Package("a", [])
    b = Package("b", [])
    c = Package("c", ["a", "b"])
    l = toposort([a,b,c])
    assert l == [a,b,c]
    
    l = toposort([b,c,a], reset_first=True)
    assert l == [a,b,c] or l == [b,a,c]
    
    a = Package("a", [])
    b = Package("b", ["a"])
    c = Package("c", ["b", "a"])
    d = Package("d", ["b"])
    e = Package("e", ["d"])
    
    l = toposort([c,e,a,b,d])
    assert l == [a,b,c,d,e]
    
def test_app_combination():
    p = path(__file__).dirname() / "testapp"
    combined = combine_files("testapp", p, add_main=True)
    print combined
    assert "exports.main = function() {" in combined
    assert """exports.main = require("main").main;""" in combined
    assert 'tiki.register("testapp"' in combined
    assert 'tiki.module("testapp:index"' in combined
    assert 'tiki.script("testapp.js");' in combined
    assert 'tiki.main("testapp", "main")' in combined
    
    assert 'exports.bar = 1;' in combined
    assert 'tiki.module("testapp:subpack/foo"' in combined
    
def test_package_index_generation():
    p = path(__file__).dirname() / "noindexapp"
    combined = combine_files("noindexapp", p)
    print combined
    assert 'tiki.module("noindexapp:index"' in combined
    assert 'tiki.main' not in combined