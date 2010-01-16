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
    "depends": [ "AppSupport", "Editor" ],
    "provides": [
        {
            "ep": "factory",
            "name": "view",
            "pointer": "#view",
            "action": "value"
        },
        {
            "ep": "factory",
            "name": "model",
            "pointer": "#model",
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
var bespin = require("bespin:index");
var util = require("bespin:util/util");
var EditorView = require('Editor:views/editor').EditorView;
var KeyListener = require('AppSupport:views/keylistener').KeyListener;

var attachEmbeddedEvents = function(pane, bespin) {
    var paneLayer = pane.get('layer');

    var becomeKey = function() { bespin.setFocus(true);     };
    var resignKey = function() { bespin.setFocus(false);    };

    var addFocusEvents = function(element, isPane) {
        while (element !== null) {
            var thisIsPane = isPane || element === paneLayer;
            element.addEventListener('mousedown',
                thisIsPane ? becomeKey : resignKey, true);
            addFocusEvents(element.firstChild, thisIsPane);
            element = element.nextSibling;
        }
    };

    addFocusEvents(document.body, false);
};

var computeLayout = function(element) {
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
};

exports.EmbeddedEditor = SC.Object.extend({
    _focused: false,

    setContent: function(text) {
        SC.RunLoop.begin();
        this.setPath("editorPane.editorView.layoutManager.textStorage.value", text);
        SC.RunLoop.end();
    },
    
    getContent: function() {
        return this.getPath("editorPane.editorView.layoutManager.textStorage.value");
    },
    
    setFocus: function(makeFocused) {
        var editorPane = this.get("editorPane");
        if (this._focused === makeFocused) {
            return;
        }

        this._focused = makeFocused;
        if (makeFocused) {
            editorPane.becomeKeyPane();
        } else {
            editorPane.resignKeyPane();
        }
    },
    
    /**
     * This function must be called whenever the position or size of the
     * element containing the Bespin editor might have changed. It triggers a
     * layout change.
     */
    dimensionsChanged: function() {
        SC.RunLoop.begin();

        var pane = this.get("editorPane");
        var oldLayout = pane.get('layout');
        var newLayout = computeLayout(this.get("element"));

        if (!SC.rectsEqual(oldLayout, newLayout)) {
            pane.adjust(newLayout);
            pane.updateLayout();    // writes the layoutStyle to the DOM
        }

        SC.RunLoop.end();
    },
    
    /**
     * jump to the line number given. This will clear any selected
     * ranges from the view. The line number is 1-based.
     */
    setLineNumber: function(line) {
        SC.RunLoop.begin();
        var textView = this.getPath("editorPane.editorView.textView");
        var point = {row: line-1, column: 0, partialFraction: 0};
        textView.setSelection([{start: point, end: point}]);
        SC.RunLoop.end();
    }
});

/**
 * Initialize a Bespin component on a given element.
 */
exports.useBespin = function(element, options) {
    options = options || {};
    
    if (util.isString(element)) {
        element = document.getElementById(element);
    }

    if (!element) {
        throw new Error("useBespin requires a element parameter to attach to");
    }

    // Creating the editor alters the components innerHTML
    var content = element.innerHTML;
    
    var editorPane = SC.Pane.create({
        childViews: "editorView".w(),
        defaultResponder: KeyListener.create(),
        editorView: EditorView.design(),
        
        layout: computeLayout(element),

        // Tell SproutCore to keep its paws off the CSS properties 'top'
        // and 'left'.
        layoutStyle: function() {
            var layout = this.get('layout');
            var style = {
                width:  '' + layout.width + 'px',
                height: '' + layout.height + 'px'
            };
            return style;
        }.property('layout')
        
    });
    
    var bespin = exports.EmbeddedEditor.create({
        editorPane: editorPane,
        element: element
    });
    
    
    SC.run(function() {
        SC.$(element).css('position', 'relative');
        element.innerHTML = "";
        bespin.get("editorPane").appendTo(element);
        
        exports.view = editorPane.getPath("editorView.textView");
        exports.model = editorPane.getPath('editorView.layoutManager.' +
            'textStorage');
        
        
        if (options.initialContent) {
            content = options.initialContent;
        }
        
        bespin.setContent(content);
        
        element.bespin = bespin;
        
        // XXX need to reengage these settings, since this is now wired
        // up completely differently.

        // Call editor.setSetting on any settings passed in options.settings
        // if (options.settings) {
        //     for (var key in options.settings) {
        //         if (options.settings.hasOwnProperty(key)) {
        //             editor.setSetting(key, options.settings[key]);
        //         }
        //     }
        // }

        // stealFocus makes us take focus on startup
        if (options.stealFocus) {
            bespin.setFocus(true);
        }

        // Move to a given line if requested
        // if (options.lineNumber) {
        //     editor.setLineNumber(options.lineNumber);
        // }

        // Hook the window.onresize event; this catches most of the common
        // scenarios that result in element resizing.
        if (SC.none(options.dontHookWindowResizeEvent) ||
                !options.dontHookWindowResizeEvent) {
            var handler = function() {
                bespin.dimensionsChanged();
            };

            if (!SC.none(window.addEventListener)) {
                window.addEventListener('resize', handler, false);
            } else if (!SC.none(window.attachEvent)) {
                window.addEventListener('onresize', handler);
            }
        }

        attachEmbeddedEvents(editorPane, bespin);
    });
    
    return bespin;
};

