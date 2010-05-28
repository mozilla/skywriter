/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var util = require('bespin:util/util');
var t = require('plugindev');
var m_scratchcanvas = require('bespin:util/scratchcanvas');

exports.testScratchCanvasBehavesAsASingleton = function() {
    t.ok(util.none(document.getElementById('bespin-scratch-canvas')),
        'there is no scratch canvas before the singleton is requested');
    var scratchCanvasA = m_scratchcanvas.get();
    var element = document.getElementById('bespin-scratch-canvas');
    t.ok(!util.none(element),
        'the element exists after the singleton is requested');
    var scratchCanvasB = m_scratchcanvas.get();
    t.equal(scratchCanvasA, scratchCanvasB,
        'the results of requesting a scratch canvas twice');
};

exports.testTheScratchCanvasYieldsAUsableCanvasContext = function() {
    var scratchCanvas = m_scratchcanvas.get();
    var context = scratchCanvas.getContext();
    t.ok(!util.none(context.measureText),
        'the context has a measureText method');
};

