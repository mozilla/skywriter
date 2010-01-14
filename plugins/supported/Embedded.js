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
 
"define metadata";
({
    "depends": ["Editor"]
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
    setContent: function(text) {
        this.setPath("editorPane.editorView.layoutManager.textStorage.value", text);
    },
    
    getContent: function() {
        return this.getPath("editorPane.editorView.layoutManager.textStorage.value");
    },
    
    setFocus: function(makeFocused) {
        var editorPane = this.get("editorPane");
        if (makeFocused) {
            editorPane.makeFirstResponder();
            editorPane.becomeKeyPane();
        } else {
            editorPane.resignFirstResponder();
            editorPane.resignKeyPane();
        }
    },
    
    /**
     * This function must be called whenever the position or size of the element
     * containing the Bespin editor might have changed. It triggers a layout
     * change.
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
    var editor;
    
    SC.run(function() {
        var editorPane = SC.Pane.create({
            childViews: "editorView".w(),
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
            }.property('layout'),
            
            element: element
        });
        
        var bespin = exports.EmbeddedEditor.create({
            editorPane: editorPane
        });
        
        SC.$(element).css('position', 'relative');
        element.innerHTML = "";
        bespin.get("editorPane").appendTo(element);
        
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
    });
};

