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

"define metadata";
({});
"end";

/*
 * This is intended to be a lightweight templating solution. It replaces
 * John Resig's Micro-templating solution:
 * - http://ejohn.org/blog/javascript-micro-templating/
 * Whilst being slightly bigger it adds the ability to extract references to
 * created element and add event handlers. It exchanges Javascript as a template
 * language (and the <%=x%> syntax) for ${} elements.
 *
 * - Logical Processing -
 * As a result of losing the Javascript base, it loses the ability to do logical
 * constructs like if/while/for/etc. It is currently felt that the addition of
 * event handlers and element references is more important. Should these
 * features be required they could be added by making an element that references
 * an array result the cloning of the element by the number of items in the
 * array, and by making an element that references a boolean result in the
 * stripping of the element if the boolean is false.
 *
 * - 2 Way Templating -
 * As a result of functioning using DOM manipulation rather than string
 * manipulation, we could also register javascript getters and setters on the
 * Javascript data structures and onchange listeners on the DOM to effect
 * 2-way templating.
 */

/**
 * Turn the template into a DOM node, resolving the ${} references to the data
 * For example:
 * <pre>
 * var templ = '&lt;input value="${person.firstname} ${person.surname}" ' +
 *     'save="${elements.input}" ' +
 *     'onchange="${changer}" ' +
 *     '>';
 * var data = {
 *   person: { firstname: "Fred", surname: "Blogs" },
 *   elements: {},
 *   changer: function() { console.log(data.elements.value); }
 * };
 * processTemplate(templ, data);
 * </pre>
 *
 * <p>This gives an example of the 3 types of processing done:<ul>
 * <li>Event listener registration for all onXXX attributes
 * <li>Element extraction for 'save' attributes
 * <li>Attribute value processing for other attributes.
 * </ul>
 */
exports.processTemplate = function(template, data) {
    data = data || {};
    var parent = document.createElement('div');
    parent.innerHTML = template;
    processChildren(parent, data);
    return parent;
};

/**
 * Recursive function to walk the tree processing the attributes as it goes.
 */
var processChildren = function(parent, data) {
    // Process attributes
    if (parent.attributes && parent.attributes.length) {
        for (var i = 0; i < parent.attributes.length; i++) {
            var attr = parent.attributes[i];

            if (attr.name === 'save') {
                // Save attributes are a setter using the parent node
                checkBraces(attr.value);
                property(attr.value.slice(2, -1), data, parent);
                // This should work but when I remove the comments, the obj seems
                // no longer to get saved...huh?
//              parent.removeAttribute(attr.name);
            } else if (attr.name.substring(0, 2) === 'on') {
                // Event registration relies on property doing a bind
                checkBraces(attr.value);
                var func = property(attr.value.slice(2, -1), data);
                if (typeof func !== 'function') {
                    console.error('Expected ' + attr.value +
                            ' to resolve to a function, but got ', typeof func);
                }
                parent.addEventListener(attr.name.substring(2), func, true);

                console.log('== remove attr', attr.name, parent);
                // This should work but when I remove the comments, then the obj
                // save on the same object is not saved...huh? This seems to be
                // only the case on firefox. Does removeAttribute do some other
                // magic beside just removing this one attribute?
//              parent.removeAttribute(attr.name);
            } else {
                // Replace references in other attributes
                var value = attr.value.replace(/\$\{[^}]*\}/, function(path) {
                    return property(path.slice(2, -1), data);
                });
                if (attr.value !== value) {
                    attr.value = value;
                }
            }
        }
    }

    // Process child nodes
    for (i = 0; i < parent.childNodes.length; i++) {
        processChildren(parent.childNodes[i], data);
    }

    // TODO: process text nodes
};

/**
 * Warn of string does not begin '${' and end '}'
 * @param str
 * @returns
 */
var checkBraces = function(str) {
    if (!str.match(/\$\{.*\}/)) {
        console.error('Expected ' + str + ' to match ${...}');
    }
};

/**
 * Combined getter and setter that works with a path through some data set.
 * For example:<ul>
 * <li>property('a.b', { a: { b: 99 }}); // returns 99
 * <li>property('a', { a: { b: 99 }}); // returns { b: 99 }
 * <li>property('a', { a: { b: 99 }}, 42); // returns 99 and alters the
 * input data to be { a: { b: 42 }}
 * </ul>
 * @param path An array of strings indicating the path through the data, or
 * a string to be cut into an array using <tt>split('.')</tt>
 * @param data An object to look in for the <tt>path</tt>
 * @param newValue (optional) If undefined, this value will replace the
 * original value for the data at the path specified.
 * @returns The value pointed to by <tt>path</tt> before any
 * <tt>newValue</tt> is applied.
 */
var property = function(path, data, newValue) {
    if (typeof path === 'string') {
        path = path.split('.');
    }
    var value = data[path[0]];
    if (path.length === 1) {
        if (newValue !== undefined) {
            data[path[0]] = newValue;
        }
        if (typeof value === 'function') {
            return value.bind(data);
        }
        return value;
    }
    return property(path.slice(1), value, newValue);
};

// strips the extension off of a name
var basename = function(name) {
    var lastDot = name.lastIndexOf('.');
    return name.substring(0, lastDot);
};

/**
 * "compiles" a template. with the current version of templating,
 * this just means making a function that is hanging onto the
 * template text.
 */
exports.compile = function(template) {
    return function(data) {
        return exports.processTemplate(template, data);
    };
};

/**
 * Compiles a collection of templates, returning a new object.
 * The object coming in should have keys that are the filenames of the
 * templates (including the extension) and the values are the templates
 * themselves. The result will have the extensions stripped off of the
 * keys, and the values will be callable functions that render the
 * template with the context provided.
 */
exports.compileAll = function(obj, mixInto) {
    if ("undefined" === typeof(mixInto)) {
        mixInto = {};
    }
    Object.keys(obj).forEach(function(name) {
        mixInto[basename(name)] = exports.compile(obj[name]);
    });
    return mixInto;
};
