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

// This script appears at the end of BespinEmbeddedMain and is responsible
// for firing up Bespin on the page.
// This module depends only on Tiki.


(function() {

var $ = bespin.tiki.require("jquery").$;
/**
 * Returns the CSS property of element.
 *   1) If the CSS property is on the style object of the element, use it, OR
 *   2) Compute the CSS property
 *
 * If the property can't get computed, is 'auto' or 'intrinsic', the former
 * calculated property is uesd (this can happen in cases where the textarea
 * is hidden and has no dimension styles).
 */
var getCSSProperty = function(element, container, property) {
    var ret = element.style[property]
                || document.defaultView.getComputedStyle(element, '').
                                        getPropertyValue(property);

    if (!ret || ret == 'auto' || ret == 'intrinsic') {
        ret = container.style[property];
    }
    return ret;
};

/**
 * Returns the sum of all passed property values. Calls internal getCSSProperty
 * to get the value of the individual peroperties.
  */
// var sumCSSProperties = function(element, container, props) {
//     var ret = document.defaultView.getComputedStyle(element, '').
//                                         getPropertyValue(props[0]);
//
//     if (!ret || ret == 'auto' || ret == 'intrinsic') {
//         return container.style[props[0]];
//     }
//
//     var sum = props.map(function(item) {
//         var cssProp = getCSSProperty(element, container, item);
//         // Remove the 'px; and parse the property to a floating point.
//         return parseFloat(cssProp.replace('px', ''));
//     }).reduce(function(a, b) {
//         return a + b;
//     });
//
//     return sum;
// };

bespin.useBespin = function(element, options) {
    var util = bespin.tiki.require('bespin:util/util');

    var baseConfig = %s;
    var baseSettings = baseConfig.settings;
    options = options || {};
    for (var key in options) {
        baseConfig[key] = options[key];
    }

    // we need to separately merge the configured settings
    var configSettings = baseConfig.settings;
    if (baseSettings !== undefined) {
        for (key in baseSettings) {
            if (configSettings[key] === undefined) {
                baseConfig.settings[key] = baseSettings[key];
            }
        }
    }

    var Promise = bespin.tiki.require('bespin:promise').Promise;
    var prEnv = null;
    var pr = new Promise();

    bespin.tiki.require.ensurePackage("::appconfig", function() {
        var appconfig = bespin.tiki.require("appconfig");
        if (util.isString(element)) {
            element = document.getElementById(element);
        }

        if (util.none(baseConfig.initialContent)) {
            baseConfig.initialContent = element.value || element.innerHTML;
        }

        element.innerHTML = '';

        if (element.type == 'textarea') {
            var parentNode = element.parentNode;
            // This will hold the Bespin editor.
            var container = document.createElement('div');

            // To put Bespin in the place of the textarea, we have to copy a
            // few of the textarea's style attributes to the div container.
            //
            // The problem is, that the properties have to get computed (they
            // might be defined by a CSS file on the page - you can't access
            // such rules that apply to an element via elm.style). Computed
            // properties are converted to pixels although the dimension might
            // be given as percentage. When the window resizes, the dimensions
            // defined by percentages changes, so the properties have to get
            // recomputed to get the new/true pixels.
            var resizeEvent = function() {
                var style = 'position:relative;';
                [
                    'margin-top', 'margin-left', 'margin-right', 'margin-bottom'
                ].forEach(function(item) {
                    style += item + ':' +
                                getCSSProperty(element, container, item) + ';';
                });

                // Calculating the width/height of the textarea is somewhat
                // tricky. To do it right, you have to include the paddings
                // to the sides as well (eg. width = width + padding-left, -right).
                // This works well, as long as the width of the element is not
                // set or given in pixels. In this case and after the textarea
                // is hidden, getCSSProperty(element, container, 'width') will
                // still return pixel value. If the element has realtiv dimensions
                // (e.g. width='95<percent>') getCSSProperty(...) will return pixel values
                // only as long as the textarea is visible. After it is hidden
                // getCSSProperty will return the relativ dimensions as they
                // are set on the element (in the case of width, 95<percent>).
                // Making the sum of pixel vaules (e.g. padding) and realtive
                // values (e.g. <percent>) is not possible. As such the padding styles
                // are ignored.

                // The complete width is the width of the textarea + the padding
                // to the left and right.
                // var width = sumCSSProperties(element, container, [
                //     'width', 'padding-left', 'padding-right'
                // ]) + 'px';
                // var height = sumCSSProperties(element, container, [
                //     'height', 'padding-top', 'padding-bottom'
                // ]) + 'px';
                var width = getCSSProperty(element, container, 'width');
                var height = getCSSProperty(element, container, 'height');
                style += 'height:' + height + ';width:' + width + ';';

                // Set the display property to 'inline-block'.
                style += 'display:inline-block;';
                container.setAttribute('style', style);
            };
            window.addEventListener('resize', resizeEvent, false);

            // Call the resizeEvent once, so that the size of the container is
            // calculated.
            resizeEvent();

            // Insert the div container after the element.
            if (element.nextSibling) {
                parentNode.insertBefore(container, element.nextSibling);
            } else {
                parentNode.appendChild(container);
            }

            // Override the forms onsubmit function. Set the innerHTML and value
            // of the textarea before submitting.
            while (parentNode !== document) {
                if (parentNode.tagName.toUpperCase() === 'FORM') {
                    var oldSumit = parentNode.onsubmit;
                    // Override the onsubmit function of the form.
                    parentNode.onsubmit = function(evt) {
                        element.value = prEnv.editor.value;
                        element.innerHTML = prEnv.editor.value;
                        // If there is a onsubmit function already, then call
                        // it with the current context and pass the event.
                        if (oldSumit) {
                            oldSumit.call(this, evt);
                        }
                    }
                    break;
                }
                parentNode = parentNode.parentNode;
            }

            // Hide the element.
            element.style.display = 'none';

            // The div container is the new element that is passed to appconfig.
            baseConfig.element = container;

            // Check if the textarea has the 'readonly' flag and set it
            // on the config object so that the editor is readonly.
            if (!util.none(element.getAttribute('readonly'))) {
                baseConfig.readOnly = true;
            }
        } else {
            baseConfig.element = element;
        }

        appconfig.launch(baseConfig).then(function(env) {
            prEnv = env;
            pr.resolve(env);
        });
    });

    return pr;
};

$(document).ready(function() {
    // Holds the lauch promises of all launched Bespins.
    var launchBespinPromises = [];

    var nodes = document.querySelectorAll(".bespin");
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var options = node.getAttribute('data-bespinoptions') || '{}';
        var pr = bespin.useBespin(node, JSON.parse(options));
        pr.then(function(env) {
            node.bespin = env;
        }, function(error) {
            throw new Error('Launch failed: ' + error);
        });
        launchBespinPromises.push(pr);
    }

    // If users want a custom startup
    if (window.onBespinLoad) {
        // group-promise function.
        var group = bespin.tiki.require("bespin:promise").group;

        // Call the window.onBespinLoad() function after all launched Bespins
        // are ready or throw an error otherwise.
        group(launchBespinPromises).then(function() {
            window.onBespinLoad();
        }, function() {
            throw new Error('At least one Bespin failed to launch!');
        });
    }
});

})();
