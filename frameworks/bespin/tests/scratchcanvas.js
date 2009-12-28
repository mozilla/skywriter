/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

var SC = require('sproutcore/runtime').SC;
var t = require('core_test');
var m_scratchcanvas = require('bespin:util/scratchcanvas');

t.module('scratchcanvas', {
    setup: function() {},
    teardown: function() {}
});

t.test("the scratch canvas behaves as a singleton", function() {
    t.ok(SC.none(document.getElementById('bespin-scratch-canvas')),
        "there is no scratch canvas before the singleton is requested");
    var scratchCanvasA = m_scratchcanvas.get();
    var element = document.getElementById('bespin-scratch-canvas');
    t.ok(!SC.none(element),
        "the element exists after the singleton is requested");
    var scratchCanvasB = m_scratchcanvas.get();
    t.equal(scratchCanvasA, scratchCanvasB,
        "the results of requesting a scratch canvas twice");
});

t.test("the scratch canvas yields a usable canvas context", function() {
    var scratchCanvas = m_scratchcanvas.get();
    var context = scratchCanvas.getContext();
    t.ok(!SC.none(context.measureText),
        "the context has a measureText method");
});

t.plan.run();

