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
var containerMod = require("bespin:util/container");
var util = require("bespin:util/util");

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
    
    // This is a hack! Chrome and Safari put all element IDs
    // onto window directly, which causes an element with the ID
    // of "editor" to break with the current container implementation.
    // this will be fixed as the container moves forward...
    window.editor = undefined;

    // The container allows us to keep multiple bespins separate, and constructs
    // objects according to a user controlled recipe.
    var container = containerMod.Container.create();

    // We want to move away from the singleton bespin.foo, but until we have ...
    bespin.container = container;

    SC.run(function() {
        container.register("container", element);
        editor = container.get("editor");

        var editorPane = SC.Pane.create({
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
        editorPane.appendChild(editor.ui, null);
        SC.$(element).css('position', 'relative');
        element.innerHTML = "";
        editorPane.appendTo(element);

        editor.element = element;
        editor.pane = editorPane;

        if (options.initialContent) {
            content = options.initialContent;
        }
        editor.model.insertDocument(content);

        // Call editor.setSetting on any settings passed in options.settings
        if (options.settings) {
            for (var key in options.settings) {
                if (options.settings.hasOwnProperty(key)) {
                    editor.setSetting(key, options.settings[key]);
                }
            }
        }

        // stealFocus makes us take focus on startup
        if (options.stealFocus) {
            editor.setFocus(true);
        }

        // Move to a given line if requested
        if (options.lineNumber) {
            editor.setLineNumber(options.lineNumber);
        }

        // Hook the window.onresize event; this catches most of the common
        // scenarios that result in element resizing.
        if (SC.none(options.dontHookWindowResizeEvent) ||
                !options.dontHookWindowResizeEvent) {
            var handler = function() {
                exports.dimensionsChanged(editor);
            };

            if (!SC.none(window.addEventListener)) {
                window.addEventListener('resize', handler, false);
            } else if (!SC.none(window.attachEvent)) {
                window.addEventListener('onresize', handler);
            }
        }
    });

    return editor;
};

/**
 * This function must be called whenever the position or size of the element
 * containing the Bespin editor might have changed. It triggers a layout
 * change.
 */
exports.dimensionsChanged = function(editor) {
    SC.RunLoop.begin();

    var pane = editor.pane;
    var oldLayout = pane.get('layout');
    var newLayout = computeLayout(editor.element);

    if (!SC.rectsEqual(oldLayout, newLayout)) {
        pane.adjust(newLayout);
        pane.updateLayout();    // writes the layoutStyle to the DOM
    }

    SC.RunLoop.end();
};

