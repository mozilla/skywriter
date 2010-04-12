/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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
var Promise = require('bespin:promise').Promise;
var ThemeManager = require('theme_manager').ThemeManager;
var t = require('plugindev');

var mockCatalog = SC.Object.create({
    getExtensionByKey: function(ep, key) {
        if (ep !== 'theme') {
            return null;
        }

        return {
            ep:         'extensionpoint',
            name:       key,
            pointer:    key + '#' + key + 'Theme'
        };
    },

    loadObjectForPropertyPath: function(pointer) {
        var promise = new Promise();
        var match = /^([^#]+)#/.exec(pointer);
        if (match === null) {
            promise.reject(new Error('unexpected pointer: ' + pointer));
        } else {
            var pluginName = match[1];
            promise.resolve(SC.Object.extend({
                cssClass: pluginName,
                cssResource: pluginName + ':' + pluginName + '.css'
            }));
        }

        return promise;
    }
});

exports.testAddingAndRemovingPanes = function() {
    var makeMockPane = function() {
        return SC.Object.create({ childViews: [], classNames: [] });
    };

    var paneA = makeMockPane(), paneB = makeMockPane(), paneC = makeMockPane();

    var themeManager = ThemeManager.create({
        catalog:    mockCatalog,
        panes:      [ paneA ]
    });

    themeManager.addPane(paneB);
    var panes = themeManager.get('panes').sort();
    t.equal(themeManager.get('panes').length, 2, 'the number of panes ' +
        'managed by the theme manager after adding a pane and 2');

    themeManager.removePane(paneA);
    t.equal(themeManager.get('panes').length, 1, 'the number of panes ' +
        'managed by the theme manager after removing a pane and 1');

    themeManager.removePane(paneB);
    t.equal(themeManager.get('panes').length, 0, 'the number of panes ' +
        'managed by the theme manager after removing a pane and 0');
}

exports.testThemeLoading = function() {
    var MockNode = SC.Object.extend({
        attributes: {},
        children: [],
        tagName: null,

        appendChild: function(child) {
            this.get('children').push(child);
        },

        setAttribute: function(key, value) {
            this.get('attributes')[key] = value;
        }
    });

    var simpleMockView = SC.Object.create({ childViews: [] });

    var bespinThemeChangedRun = false, bespinThemeChangedCSSClass = null;
    var customMockView = SC.Object.create({
        childViews: [],
        bespinThemeChanged: function(sender, theme) {
            bespinThemeChangedRun = true;
            bespinThemeChangedCSSClass = theme.get('cssClass');
        }
    });

    var mockContainer = SC.Object.create({
        childViews: [ simpleMockView, customMockView ]
    });

    var mockPane = SC.Object.create({
        childViews: [ mockContainer ],
        classNames: 'bar baz'.w(),
        theme:      'bar'
    });

    var themeManager = ThemeManager.create({
        catalog:    mockCatalog,
        document:   mockDocument,
        panes:      [ mockPane ]
    });

    themeManager.set('theme', 'foo');

    t.ok(bespinThemeChangedRun, 'bespinThemeChangedRun() was called when ' +
        'changing the theme');
    t.equal(bespinThemeChangedCSSClass, 'foo', 'the CSS class of the theme ' +
        'object passed into bespinThemeChangedRun() and \"foo\"');

    t.deepEqual(mockPane.get('classNames').sort(), 'baz foo'.w(), 'the ' +
        'class names on the pane\'s view after setting the theme and [ baz ' +
        'foo ]');
    t.equal(mockPane.get('theme'), 'foo', 'the theme assigned to the pane ' +
        'and \"foo\"');
};

