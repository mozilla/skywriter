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

var SC = require('sproutcore/runtime').SC;

/**
 * @class
 *
 * A invisible singleton canvas on the page, useful whenever a canvas context
 * is needed (e.g. for computing text sizes), but an actual canvas isn't handy
 * at the moment.
 */
var ScratchCanvas = SC.Object.extend({
    getContext: function() {
        return document.getElementById('bespin-scratch-canvas').
            getContext('2d');
    },

    init: function() {
        // It's possible that another ScratchCanvas instance in another sandbox
        // exists on the page. If so, we assume they're compatible, and use
        // that one.
        if (!SC.none(document.getElementById('bespin-scratch-canvas'))) {
            return;
        }

        var element = document.createElement('canvas');
        element.id = 'bespin-scratch-canvas';
        element.width = 400;
        element.height = 300;
        element.style.position = 'absolute';
        element.style.top = "-10000px";
        element.style.left = "-10000px";
        document.body.appendChild(element);
    },

    /**
     * Returns the width in pixels of the given string ("M", by default) in the
     * given font.
     */
    measureStringWidth: function(font, str) {
        if (SC.none(str)) {
            str = "M";
        }

        var context = this.getContext();
        context.save();
        context.font = font;
        var width = context.measureText(str).width;
        context.restore();
        return width;
    }
});

var singleton = null;

/**
 * Returns the instance of the scratch canvas on the page, creating it if
 * necessary.
 */
exports.get = function() {
    if (singleton === null) {
        singleton = ScratchCanvas.create();
    }
    return singleton;
}

