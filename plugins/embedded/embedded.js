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
    "dependencies": {
		"appsupport": "0.0",
		"dock_view": "0.0",
		"edit_session": "0.0",
		"text_editor": "0.0",
		"settings": "0.0"
	},
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
var Range = require('rangeutils:utils/range');
var DockView = require('dock_view').DockView;
var EditorView = require('text_editor:views/editor').EditorView;
var KeyListener = require('appsupport:views/keylistener').KeyListener;
var MultiDelegateSupport = require('delegate_support').MultiDelegateSupport;
var bespin = require("bespin:index");
var edit_session = require('edit_session');
var settings = require('settings').settings;
var util = require("bespin:util/util");

var embeddedEditorInstantiated = false;

exports.EmbeddedEditor = SC.Object.extend(MultiDelegateSupport, {
    _editorView: null,

    _attachPane: function() {
        if (typeof(this.get('element')) === 'string') {
            this.set('element', document.getElementById(this.get('element')));
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
            var view = this._editorView;
            return view.getPath('layoutManager.textStorage').getValue();
        });
        this.__defineSetter__('value', function(v) {
            SC.run(function() {
                var view = this._editorView;
                view.getPath('layoutManager.textStorage').setValue(v);
                view.get('textView').moveCursorTo({ col: 0, row: 0 });
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
            layoutManager.get('textStorage').setValue(initialContent);
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

    textStorageEdited: function(sender, oldRange, newRange, newValue) {
        var evt = {
            oldRange: oldRange,
            newRange: newRange,
            newValue: newValue
        }
        this.postMessage('textChange', evt);
    },

    textViewSelectionChanged: function(sender, selection) {
        var evt = {
            selection: selection
        }
        this.postMessage('select', evt);
    },

    _evtCallbacks: null,

    /**
     * Posts a message to the internal event handler.
     */
    postMessage: function(evtName, evtObj) {
        evtObj.type = evtName;
        if (!SC.none(this._evtCallbacks[evtName])) {
            this._evtCallbacks[evtName].forEach(function(callback) {
                callback.call(this, evtObj);
            });
        }
    },

    /**
     * Adds an event listener for an event.
     */
    addEventListener: function(evtName, callback) {
        if (SC.none(this._evtCallbacks[evtName])) {
            this._evtCallbacks[evtName] = [];
        }
        this._evtCallbacks[evtName].push(callback);
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

        this._evtCallbacks = {};

        var session = edit_session.EditSession.create();
        exports.session = session;

        var pane = this.get('pane').create({
            layout: this._computeLayout()
        });

        this.set('pane', pane);

        this._attachPane();

        var editorView = pane.getPath('applicationView.centerView');
        this._editorView = editorView;

        var textStorage = editorView.getPath('layoutManager.textStorage');
        var textView = editorView.get('textView');
        exports.model = textStorage;
        exports.view = textView;

        var buffer = edit_session.Buffer.create({ model: textStorage });
        session.set('currentBuffer', buffer);
        session.set('currentView', textView);

        SC.run(function() {
            this._createValueProperty();
            this._setOptions();
        }.bind(this));

        editorView.textView.addDelegate(this);
        editorView.layoutManager.textStorage.addDelegate(this);
    },

    setFocus: function(makeFocused) {
        var pane = this.get('pane');
        if (this._editorView.textView.get('isFirstResponder') === makeFocused) {
            return;
        }

        if (makeFocused) {
            pane.becomeKeyPane();
            this._editorView.get('textView').focus();
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
    },

    /**
     * Changes a setting.
     */
    setSetting: function(key, value) {
        if (SC.none(key)) {
            throw new Error("setSetting: key must be supplied");
        }
        if (SC.none(value)) {
            throw new Error("setSetting: value must be supplied");
        }

        SC.run(function() { settings.set(key, value); });
    },

    /**
     * Sets the initial syntax highlighting context (i.e. the language).
     */
     setSyntax: function(syntax) {
        if (SC.none(syntax)) {
            throw new Error("setSyntax: syntax must be supplied");
        }

        SC.run(function() {
            this._editorView.setPath('layoutManager.syntaxManager.' +
                                                'initialContext', syntax);
        }.bind(this));
    },

    /**
     * Returns the current selection.
     */
    getSelection: function() {
        // Returns a clone of the selection to make sure the user can't
        // change the textView's selection.
        return SC.clone(this._editorView.textView._selectedRange);
    },

    /**
     * Sets the cursor position.
     */
    setCursor: function(position) {
        if (!Range.isPosition(position)) {
            throw new Error('setCursor: valid position must be supplied');
        }

        this._editorView.textView.moveCursorTo(position);
    },

    /**
     * Sets the text selection.
     */
    setSelection: function(range) {
        if (!Range.isRange(range)) {
            throw new Error('setSelection: valid range must be supplied');
        }
        if (Range.comparePositions(range.start, range.end) === 0) {
            this._editorView.textView.moveCursorTo(range.start);
        } else {
            var textView = this._editorView.textView;
            textView.moveCursorTo(range.end);
            textView.moveCursorTo(range.start, true);
        }
    },

    /**
     * Replaces a range witihn a text.
     */
    replace: function(range, text, clampSelection) {
        if (typeof text !== 'string') {
            throw new Error('replace: valid text must be supplied');
        }
        if (!Range.isRange(range)) {
            throw new Error('replace: valid range must be supplied');
        }

        SC.run(function() {
            range = Range.normalizeRange(range);
            var view = this._editorView.textView;
            view.groupChanges(function() {
                if (clampSelection !== true) {
                    view.moveCursorTo(range.start);
                } else {
                    var textStorage = view.getPath('layoutManager.textStorage');
                    var sel = this.getSelection();
                    sel.start = textStorage.clampPosition(sel.start);
                    sel.end = textStorage.clampPosition(sel.end);
                    view._selectedRangeEndVirtual = null;
                    view.setSelection(sel);
                }
            }.bind(this));
        }.bind(this));
    },

    /**
     * Replaces the current text selection with a text.
     */
    replaceSelection: function(text) {
        if (typeof text !== 'string') {
            throw new Error('replaceSelection: valid text must be supplied');
        }

        this.replace(this.getSelection(), text);
    },

    /**
     * Returns the text witihn a range.
     */
    getText: function(range) {
        if (!Range.isRange(range)) {
            throw new Error('getText: valid range must be supplied');
        }

        range = Range.normalizeRange(range);
        return this._editorView.layoutManager.textStorage.getCharacters(range);
    },

    /**
     * Returns the current selected text.
     */
    getSelectedText: function() {
        return this.getText(this.getSelection());
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

