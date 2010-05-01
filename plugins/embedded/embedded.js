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
    "description": "The environment for an embedded Bespin instance",
    "dependencies": {
        "appsupport": "0.0",
        "dock_view": "0.0",
        "edit_session": "0.0",
        "events": "0.0",
        "keylistener": "0.0",
        "rangeutils": "0.0",
        "screen_theme": "0.0",
        "settings": "0.0",
        "text_editor": "0.0",
        "theme_manager": "0.0",
        "traits": "0.0"
	},
    "provides": [
        {
            "ep": "appcomponent",
            "name": "environment",
            "pointer": "#embeddedEditor"
        }
    ]
});
"end";

/**
 * This file provides an API for embedders to use. Its intent is to abstract
 * out all the complexity of internal APIs and provide something sane, simple
 * and easy to learn to the embedding user.
 */

var SC = require('sproutcore/runtime').SC;
var Event = require('events').Event;
var Promise = require('bespin:promise').Promise;
var Trait = require('traits').Trait;
var console = require('bespin:console').console;
var m_range = require('rangeutils:utils/range');

var embeddedEditor = Trait.object({
    _element: null,
    _elementChosen: new Promise(),
    _events: null,
    _options: null,
    _session: null,

    _attachToElement: function() {
        var element = this._element;
        if (typeof(element) === 'string') {
            element = document.getElementById(element);
            this._element = element;
        }
        if (typeof(element) !== 'object') {
            throw new Error("Expected a DOM element to attach Bespin to but " +
                "found " + element);
        }

        var options = this._options;
        if (typeof(element) !== 'string') {
            options.initialContent = element.innerHTML;
        }

        element.style.position = 'relative';
        element.innerHTML = '';

        this.pane.appendTo(element);
    },

    _computeLayout: function() {
        var element = this._element;
        var layout = {
            top:    0,
            left:   0,
            width:  element.clientWidth,
            height: element.clientHeight
        };

        while (element !== null) {
            layout.top  += element.offsetTop + element.clientTop;
            layout.left += element.offsetLeft + element.clientLeft;
            element = element.offsetParent;
        }

        return layout;
    },

    _createValueProperty: function() {
        this.__defineGetter__('value', this.getValue);
        this.__defineSetter__('value', this.setValue);
    },

    _getTextStorage: function() {
        var currentView = this._session.currentView;
        return currentView.getPath('layoutManager.textStorage');
    },

    _hookWindowResizeEvent: function() {
        window.addEventListener('resize', this.dimensionsChanged, false);
    },

    _unhookWindowResizeEvent: function() {
        window.removeEventListener('resize', this.dimensionsChanged, false);
    },

    /**
     * @type {Array<string>}
     *
     * The component loading order in the embedded environment.
     */
    componentOrder: [
        'environment', 'theme_manager', 'settings', 'key_listener',
        'dock_view', 'editor_view', 'edit_session'
    ],

    /**
     * @type {SC.Pane}
     *
     * The pane in which Bespin lives.
     */
    pane: null,

    /**
     * @type {class<SC.Pane>}
     *
     * The type of the pane in which Bespin lives. This field is supplied by
     * the Bespin controller and is instantiated in the init() function.
     */
    paneClass: null,

    /** Adds a callback to handle the specified event. */
    addEventListener: function(eventName, callback) {
        var events = this._events;
        if (!(eventName in events)) {
            console.warn('[Bespin] addEventListener(): unknown event: "' +
                eventName + '"');
        } else {
            events[eventName].add(callback);
        }
    },

    /** Initializes the embedded Bespin environment. */
    createPane: function() {
        var promise = new Promise();
        this._elementChosen.then(function() {
            if (this.pane !== null) {
                throw new Error('Attempt to instantiate multiple instances ' +
                    'of Bespin');
            }

            var paneClass = this.paneClass;
            var pane = paneClass.create({
                _layoutChanged: function() {
                    this._recomputeLayoutStyle();
                }.observes('layout'),

                _recomputeLayoutStyle: function() {
                    var layout = this.get('layout');
                    this.set('layoutStyle', {
                        width:  layout.width + 'px',
                        height: layout.height + 'px'
                    });
                },

                init: function() {
                    arguments.callee.base.apply(this, arguments);
                    this._recomputeLayoutStyle();
                },

                layout: this._computeLayout(),
                layoutStyle: {}
            });
            this.pane = pane;

            this._attachToElement();
            this._hookWindowResizeEvent();

            promise.resolve(pane);
        }.bind(this));
        return promise;
    },

    /**
     * Triggers a layout change. Call this method whenever the position or size
     * of the element containing the Bespin editor might have changed.
     */
    dimensionsChanged: function() {
        SC.run(function() {
            var pane = this.pane;
            var oldLayout = pane.get('layout');
            var newLayout = this._computeLayout();

            if (!SC.rectsEqual(oldLayout, newLayout)) {
                pane.adjust(newLayout);
                pane.updateLayout();    // writes the layoutStyle to the DOM
            }
        }.bind(this));
    },

    /** Returns the currently-selected range. */
    getSelection: function() {
        var range = this._session.currentView.getSelectedRange(false);
        return m_range.cloneRange(range);
    },

    /** Returns the currently-selected text. */
    getSelectedText: function() {
        return this.getText(this.getSelection());
    },

    /** Returns the text within the given range. */
    getText: function(range) {
        if (!m_range.isRange(range)) {
            throw new Error('getText(): expected range but found "' + range +
                '"');
        }

        var textStorage = this._getTextStorage();
        return textStorage.getCharacters(m_range.normalizeRange(range));
    },

    /** Returns the current text. */
    getValue: function() {
        var textView = this._session.currentView;
        return this._getTextStorage().getValue();
    },

    init: function() {
        this._createValueProperty();
        this._events = { select: new Event(), textChange: new Event() };
    },

    /** Removes the event listener on the given event. */
    removeEventListener: function(eventName, callback) {
        var events = this._events;
        if (!(eventName in events)) {
            console.warn('[Bespin] removeEventListener(): unknown event: "' +
                eventName + '"');
        } else {
            events[eventName].remove(callback);
        }
    },

    /**
     * Replaces the text within a range, as an undoable action.
     *
     * @param {Range} range The range to replace.
     * @param {string} newText The text to insert.
     * @param {boolean} keepSelection True if the selection should be
     *     be preserved, false otherwise.
     */
    replace: function(range, newText, keepSelection) {
        if (!m_range.isRange(range)) {
            throw new Error('replace(): expected range but found "' + range +
                "'");
        }
        if (typeof(text) !== 'string') {
            throw new Error('replace(): expected text string but found "' +
                text + '"');
        }

        SC.run(function() {
            var normalized = m_range.normalizeRange(range);

            var view = this._session.currentView;
            var oldSelection = view.getSelectedRange(false);
            view.groupChanges(function() {
                view.replaceCharacters(normalized, newText);
                if (keepSelection) {
                    view.setSelection(oldSelection);
                }
            });
        }.bind(this));
    },

    /** Replaces the current text selection with the given text. */
    replaceSelection: function(newText) {
        if (typeof(newText) !== 'string') {
            throw new Error('replaceSelection(): expected string but found "' +
                newText + '"');
        }

        this.replace(this.getSelection(), text);
    },

    /** Called by the Bespin controller once the app is fully set up. */
    sessionInitialized: function(session) {
        this._session = session;

        var options = this._options;
        for (var optionName in options) {
            this.setOption(optionName, options[optionName]);
        }

        var embeddedEditor = this;
        this._getTextStorage().addDelegate(SC.Object.create({
            textStorageEdited: function(sender, oldRange, newRange, newValue) {
                // FIXME: newValue is not yet supported.
                var params = {
                    oldRange: oldRange,
                    newRange: newRange,
                    newValue: newValue
                };

                embeddedEditor._events.textChange(params);
            }
        }));
        session.currentView.addDelegate(SC.Object.create({
            textViewSelectionChanged: function(sender, selection) {
                embeddedEditor._events.select({ selection: selection });
            }
        }));
    },

    /** Sets the position of the cursor. */
    setCursor: function(newPosition) {
        if (!m_range.isPosition(newPosition)) {
            throw new Error('setCursor(): expected position but found "' +
                newPosition + '"');
        }

        this._session.currentView.moveCursorTo(newPosition);
    },

    /** Focuses or unfocuses the editor. */
    setFocus: function(makeFocused) {
        makeFocused = !!makeFocused;

        var pane = this.pane;
        var view = this._session.currentView;
        if (view.get('isFirstResponder') === makeFocused) {
            return;
        }

        if (makeFocused) {
            pane.becomeKeyPane();
            view.focus();
        } else {
            pane.resignKeyPane();
        }
    },

    /** Scrolls and moves the insertion point to the given line number. */
    setLineNumber: function(lineNumber) {
        var newPosition = { row: lineNumber - 1, col: 0 };
        this._session.currentView.moveCursorTo(newPosition);
    },

    /** Changes the value of an option. */
    setOption: function(name, value) {
        switch (name) {
        case 'initialContent':
            this.setValue(value);
            break;

        case 'noAutoresize':
            if (value) {
                this._unhookWindowResizeEvent();
            } else {
                this._hookWindowResizeEvent();
            }
            break;

        case 'settings':
            for (var settingName in value) {
                this.setSetting(settingName, value[settingName]);
            }
            break;

        case 'stealFocus':
            this.setFocus(value);
            break;

        case 'syntax':
            this.setSyntax(value);
            break;

        default:
            console.warn('[Bespin] unknown setting: "' + name + '"');
            break;
        }
    },

    /** Alters the selection. */
    setSelection: function(newSelection) {
        if (!m_range.isRange(newSelection)) {
            throw new Error('setSelection(): selection must be supplied');
        }

        this._session.currentView.setSelection(newSelection);
    },

    /** Changes a setting. */
    setSetting: function(key, value) {
        if (key === null || key === undefined) {
            throw new Error('setSetting(): key must be supplied');
        }
        if (value === null || value === undefined) {
            throw new Error('setSetting(): value must be supplied');
        }

        SC.run(function() {
            var settings = require('settings').settings;
            settings.set(key, value);
        });
    },

    /** Sets the initial syntax highlighting context (i.e. the language). */
    setSyntax: function(syntax) {
        if (syntax === null || syntax === undefined) {
            throw new Error('setSyntax(): syntax must be supplied');
        }

        SC.run(function() {
            var view = this._session.currentView;
            var syntaxManager = view.getPath('layoutManager.syntaxManager');
            syntaxManager.set('initialContext', syntax);
        }.bind(this));
    },

    /**
     * Sets the text to the given value and moves the cursor to the beginning
     * of the buffer.
     */
    setValue: function(newValue) {
        SC.run(function() {
            var textView = this._session.currentView;
            textView.getPath('layoutManager.textStorage').setValue(newValue);
            textView.moveCursorTo({ row: 0, col: 0 });
        }.bind(this));
    },

    /** Replaces an element with the Bespin editor. */
    useBespin: function(element, options) {
        if (options === null || options === undefined) {
            options = {};
        }

        this._element = element;
        this._options = options;

        this._elementChosen.resolve();

        return this;
    }
});

exports.embeddedEditor = embeddedEditor;
embeddedEditor.init();

/** Replaces an element with the Bespin editor. */
exports.useBespin = embeddedEditor.useBespin;

