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

from path import path

from dryice.combiner import Package, toposort, combine_files

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