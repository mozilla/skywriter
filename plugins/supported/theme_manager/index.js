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
var m_plugins = require('bespin:plugins');

/**
 * @class
 *
 * Manages Bespin themes for a series of panes.
 */
exports.ThemeManager = SC.Object.extend({
    _theme: null,

    _applyTheme: function() {
        var theme = this._theme;
        if (SC.none(theme)) {
            return;
        }

        this.get('panes').forEach(this._applyThemeToPane, this);
    },

    _applyThemeToPane: function(pane) {
        var oldTheme = pane.get('theme');
        if (SC.none(oldTheme)) {
            oldTheme = window.ENV.theme;
        }

        var classNames = pane.get('classNames');
        if (!SC.none(oldTheme)) {
            var notOldTheme = function(theme) { return theme !== oldTheme; };
            classNames = classNames.filter(notOldTheme);
        }

        var cssClass = this._theme.get('cssClass');
        classNames.push(cssClass);

        pane.set('classNames', classNames);
        pane.set('theme', cssClass);
        pane.set('bespinThemeManager', this);

        pane.updateLayer();

        this._applyThemeToView(pane);
    },

    _applyThemeToView: function(view) {
        var theme = this._theme;
        if (view.respondsTo('bespinThemeChanged')) {
            view.bespinThemeChanged(this, theme);
        }

        view.get('childViews').forEach(this._applyThemeToView, this);
    },

    _panesChanged: function() {
        this._applyTheme();
    }.observes('panes'),

    /**
     * @property{Catalog}
     *
     * The plugin catalog to use. Can be set to a mock object for unit testing.
     */
    catalog: m_plugins.catalog,

    /**
     * @property{Array<SC.Pane>}
     *
     * An immutable list of panes to maintain themes for.
     */
    panes: [],

    /**
     * @property{string}
     *
     * The name of the theme to use (i.e. the key of the 'theme' endpoint of
     * the desired theme).
     */
    theme: null,

    /**
     * @type{Promise}
     *
     * A promise that resolves when the default theme is registered.
     *
     * TODO: Remove me when we get proper theme support.
     */
    themeRegistered: null,

    /**
     * Adds a pane to the list of panes maintained by this theme.
     */
    addPane: function(pane) {
        this.set('panes', this.get('panes').concat(pane));
    },

    init: function() {
        this.set('themeRegistered', new Promise());
        this.set('panes', this.get('panes').concat());
    },

    /**
     * Loads the default theme and returns a promise that will resolve when the
     * theme is loaded.
     */
    loadTheme: function() {
        var loadPromise = new Promise();
        this.get('themeRegistered').then(function(extension) {
            extension.load().then(function(themeClass) {
                var theme = themeClass.create();
                this._theme = theme;
                this._applyTheme();
                loadPromise.resolve();
            }.bind(this));
        }.bind(this));
        return loadPromise;
    },

    /**
     * Removes a pane from the list of panes maintained by this theme.
     */
    removePane: function(pane) {
        this.set('panes', this.get('panes').filter(function(otherPane) {
            return pane !== otherPane;
        }));
    }
});

exports.themeManager = exports.ThemeManager.create({theme: 'Screen'});

exports.registerTheme = function(extension) {
    var themeManager = exports.themeManager;
    if (extension.name === themeManager.get('theme')) {
        themeManager.get('themeRegistered').resolve(extension);
    }
};

