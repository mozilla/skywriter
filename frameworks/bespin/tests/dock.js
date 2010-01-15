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

"import package core_test";
var SC = require('sproutcore/runtime').SC;
var bespin_views_dock = require('bespin:views/dock');

var pane, dockView, centerView, bottomDockedView;

module('dock', {
    setup: function() {
        SC.RunLoop.begin();
        pane = SC.Pane.create({
            layout: { centerX: 0, centerY: 0, width: 640, height: 480 },
            childViews: [
                bespin_views_dock.DockView.extend({
                    centerView: SC.TextFieldView.extend({ value: "Center!" }),
                    dockedViews: [
                        SC.TextFieldView.extend({
                            layout: {
                                left:   0,
                                bottom: 0,
                                right:  0,
                                height: 150
                            },
                            dock: bespin_views_dock.DOCK_BOTTOM,
                            value: "Bottom!"
                        })
                    ]
                })
            ]
        });
        pane.append();
        SC.RunLoop.end();

        // FIXME: This is working around an issue in SproutCore that probably
        // should be fixed there.
        SC.RootResponder.responder = SC.RootResponder.create();

        dockView = pane.childViews[0];
        centerView = dockView.get('centerView');
        bottomDockedView = dockView.get('dockedViews')[0];
    },

    teardown: function() {
        pane.remove();
        pane = null;
        dockView = null;
    }
});

test("dock sizes center view properly with a docked view", function() {
    ok(SC.rectsEqual(centerView, {
            x:      0,
            y:      0,
            width:  640,
            height: 480 - 150
        }), "center view is in the right place");
    ok(SC.rectsEqual(bottomDockedView, {
            x:      0,
            y:      480 - 150,
            width:  640,
            height: 150
        }), "bottom docked view is in the right place");
});

plan.run();

