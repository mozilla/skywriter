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
 
"define metadata";
({
    "depends": [
		"AppSupport",
		"DockView",
		"EditSession",
		"Editor",
		"Settings"
	],
    "provides": [
        {
            "ep": "factory",
            "name": "session",
            "pointer": "#session",
            "action": "value"
        }
    ]
});
"end";

/**
 * This file provides an API for embedders to use. Its intent is to abstract
 * out all the complexity of internal APIs and provide something sane, simple
 * and easy to learn to the embedding user.
 */

var SC = require("sproutcore/runtime").SC;
var DockView = require('DockView').DockView;
var EditorView = require('Editor:views/editor').EditorView;
var KeyListener = require('AppSupport:views/keylistener').KeyListener;
var bespin = require("bespin:index");
var m_editsession = require('EditSession');
var settings = require('Settings').settings;
var util = require("bespin:util/util");

var embeddedEditorInstantiated = false;

exports.EmbeddedEditor = SC.Object.extend({
    _editorView: null,

    _focused: false,

    _attachEmbeddedEvents: function() {
        this.getPath('pane.layer').addEventListener('mousedown',
            function() { this.setFocus(true); }.bind(this), true);
        document.body.addEventListener('mousedown',
            function() { this.setFocus(false); }.bind(this), true);
    },

    _attachPane: function() {
        if (typeof(this.get('element')) === 'string') {
            this.set('element', document.getElementById('element'));
        }

        var element = this.get('element');
        if (SC.none('element')) {
            throw new Error("No element was specified to attach Bespin " +
                "Embedded to");
        }

        var options = this.get('options');
        if (SC.none(options.initialContent)) {
            options.initialContent = element.innerHTML;
        }

        SC.$(element).css('position', 'relative');
        element.innerHTML = "";

        this.get('pane').appendTo(element);
    },

    _computeLayout: function() {
        var element = this.get('element');

        var layout = {
            top:    0,
            left:   0,
            width:  element.clientWidth,
            height: element.clientHeight
        };

        while (!SC.none(element)) {
            layout.top += element.offsetTop + element.clientTop;
            layout.left += element.offsetLeft + element.clientLeft;
            element = element.offsetParent;
        }

        return layout;
    },

    _createValueProperty: function() {
        this.__defineGetter__('value', function() {
            return this._editorView.getPath('layoutManager.textStorage.value');
        });
        this.__defineSetter__('value', function(v) {
            SC.run(function() {
                this._editorView.setPath('layoutManager.textStorage.value', v);
            }.bind(this));
        });
    },

    _hookWindowResizeEvent: function() {
        window.addEventListener('resize', this.dimensionsChanged.bind(this),
            false);
    },

    _setOptions: function() {
        var editorView = this._editorView;
        var layoutManager = editorView.get('layoutManager');
        var options = this.get('options');

        // initialContent
        var initialContent = options.initialContent;
        if (!SC.none(initialContent)) {
            layoutManager.setPath('textStorage.value', initialContent);
        }

        // noAutoresize
        var noAutoresize = options.noAutoresize;
        if (SC.none(noAutoresize)) {
            noAutoresize = options.dontHookWindowResizeEvent;   // the old name
        }

        if (SC.none(noAutoresize) || !noAutoresize) {
            this._hookWindowResizeEvent();
        }

        // settings
        var userSettings = options.settings;
        if (!SC.none(userSettings)) {
            for (key in userSettings) {
                settings.set(key, userSettings[key]);
            }
        }

        // stealFocus
        var stealFocus = options.stealFocus;
        if (!SC.none(stealFocus) && stealFocus) {
            window.setTimeout(function() { this.setFocus(true); }.bind(this),
                1);
        }

        // syntax
        // TODO: make this a true setting
        var syntaxManager = layoutManager.get('syntaxManager');
        var syntax = options.syntax;
        if (!SC.none(syntax)) {
            syntaxManager.set('initialContext', syntax);
        }
    },

    /**
     * @property{Node}
     *
     * The DOM element to attach to.
     */
    element: null,

    /**
     * @property{object}
     *
     * The user-supplied options.
     */
    options: null,

    /**
     * @property{SC.Pane}
     *
     * The pane that the editor is part of.
     */
    pane: SC.Pane.extend({
        _layoutChanged: function() {
            this._recomputeLayoutStyle();
        }.observes('layout'),

        _recomputeLayoutStyle: function() {
            var layout = this.get('layout');
            this.set('layoutStyle', {
                width:  "%@px".fmt(layout.width),
                height: "%@px".fmt(layout.height)
            });
        },

        applicationView: DockView.extend({
            centerView: EditorView.extend(),
            dockedViews: []
        }),

        childViews: 'applicationView'.w(),

        layoutStyle: {},

        init: function() {
            arguments.callee.base.apply(this, arguments);

            this.set('defaultResponder', KeyListener.create());

            this._recomputeLayoutStyle();
        }
    }),

    /**
     * Triggers a layout change. Call this method whenever the position or size
     * of the element containing the Bespin editor might have changed.
     */
    dimensionsChanged: function() {
        SC.run(function() {
            var pane = this.get('pane');
            var oldLayout = pane.get('layout');
            var newLayout = this._computeLayout(this.get("element"));

            if (!SC.rectsEqual(oldLayout, newLayout)) {
                pane.adjust(newLayout);
                pane.updateLayout();    // writes the layoutStyle to the DOM
            }
        }.bind(this));
    },

    init: function() {
        if (embeddedEditorInstantiated === true) {
            throw new Error("Attempt to instantiate multiple instances of " +
                "Bespin");
        }

        embeddedEditorInstantiated = true;

        var session = m_editsession.EditSession.create();
        exports.session = session;

        var pane = this.get('pane').create({
            layout: this._computeLayout()
        });

        this.set('pane', pane);

        this._attachPane();

        var editorView = pane.getPath('applicationView.centerView');
        this._editorView = editorView;

        var textStorage = editorView.get('textStorage');
        var textView = editorView.get('textView');
        exports.model = textStorage;
        exports.view = textView;

        var buffer = m_editsession.Buffer.create({ model: textStorage });
        session.set('currentBuffer', buffer);
        session.set('currentView', textView);
        
        SC.run(function() {
            this._attachEmbeddedEvents();
            this._createValueProperty();
            this._setOptions();
        }.bind(this));
    },

    setFocus: function(makeFocused) {
        var pane = this.get('pane');
        if (this._focused === makeFocused) {
            return;
        }

        this._focused = makeFocused;
        if (makeFocused) {
            pane.becomeKeyPane();
        } else {
            pane.resignKeyPane();
        }
    },

    /**
     * jump to the line number given. This will clear any selected
     * ranges from the view. The line number is 1-based.
     */
    setLineNumber: function(line) {
        SC.RunLoop.begin();
        var textView = this.getPath("pane.editorView.textView");
        var point = {row: line-1, column: 0, partialFraction: 0};
        textView.setSelection([{start: point, end: point}]);
        SC.RunLoop.end();
    }
});

exports.session = null;

/**
 * Initialize a Bespin component on a given element.
 */
exports.useBespin = function(element, options) {
    return exports.EmbeddedEditor.create({
        element: element,
        options: SC.none(options) ? {} : options
    });
};

