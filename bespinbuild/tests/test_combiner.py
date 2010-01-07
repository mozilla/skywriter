from cStringIO import StringIO

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
    
def test_toposort_with_undefined_packages():
    b = Package("b", ["a"])
    l = toposort([b], package_factory=lambda name: Package(name, []), 
        reset_first=True)
    assert l[0].name == "a"
    assert l[1] == b
    
    
def test_app_combination():
    p = path(__file__).dirname() / "testapp"
    output = StringIO()
    combine_files(output, StringIO(), "testapp", p, 
                  add_main=True, exclude_tests=False)
    combined = output.getvalue()
    print combined
    assert "exports.main = function() {" in combined
    assert """exports.main = require("main").main;""" in combined
    assert 'tiki.register("testapp"' in combined
    assert 'tiki.module("testapp:index"' in combined
    assert 'tiki.main("testapp", "main")' in combined
    
    assert 'exports.bar = 1;' in combined
    assert 'tiki.module("testapp:subpack/foo"' in combined
    
def test_package_index_generation():
    p = path(__file__).dirname() / "noindexapp"
    output = StringIO()
    combine_files(output, StringIO(), "noindexapp", p)
    combined = output.getvalue()
    print combined
    assert 'tiki.module("noindexapp:index"' in combined
    assert 'tiki.main' not in combined