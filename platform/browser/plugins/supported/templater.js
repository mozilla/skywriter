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
({});
"end";

// WARNING: do not 'use_strict' without reading the notes in environmentEval;

/**
 * Turn the template into a DOM node, resolving the ${} references to the data.
 * See docs/devguide/template.html.markdown for instructions on writing
 * templates.
 */
exports.processTemplate = function(template, data) {
    data = data || {};
    var parent = document.createElement('div');
    parent.innerHTML = template;
    processNode(parent, data);
    return parent;
};

/**
 * Recursive function to walk the tree processing the attributes as it goes.
 */
function processNode(node, data) {
    var recurse = true;
    // Process attributes
    if (node.attributes && node.attributes.length) {
        // It's good to clean up the attributes when we've processed them,
        // but if we do it straight away, we mess up the array index
        var attrs = Array.prototype.slice.call(node.attributes);
        for (var i = 0; i < attrs.length; i++) {
            var value = attrs[i].value;
            var name = attrs[i].name;

            if (name === 'save') {
                // Save attributes are a setter using the node
                value = stripBraces(value);
                property(value, data, node);
                node.removeAttribute(name);
            } else if (name === 'if') {
                value = stripBraces(value);
                try {
                    var reply = environmentEval(value, data);
                    recurse = !!reply;
                } catch (ex) {
                    console.error('Error with \'', value, '\'', ex);
                    recurse = false;
                }
                if (!recurse) {
                    node.parentNode.removeChild(node);
                }
                node.removeAttribute(name);
            } else if (name === 'foreach') {
                value = stripBraces(value);
                recurse = false;
                try {
                    var array = environmentEval(value, data);
                    array.forEach(function(param) {
                        var clone = node.cloneNode(true);
                        node.parentNode.insertBefore(clone, node);
                        data.param = param;
                        processChildren(clone, data);
                        delete data.param;
                    });
                    node.parentNode.removeChild(node);
                } catch (ex) {
                    console.error('Error with \'', value, '\'', ex);
                    recurse = false;
                }
                node.removeAttribute(name);
            } else if (name.substring(0, 2) === 'on') {
                // Event registration relies on property doing a bind
                value = stripBraces(value);
                var func = property(value, data);
                if (typeof func !== 'function') {
                    console.error('Expected ' + value +
                            ' to resolve to a function, but got ', typeof func);
                }
                node.removeAttribute(name);
                var capture = node.hasAttribute('capture' + name.substring(2));
                node.addEventListener(name.substring(2), func, capture);
            } else {
                // Replace references in other attributes
                var newValue = value.replace(/\$\{[^}]*\}/, function(path) {
                    return environmentEval(path.slice(2, -1), data);
                });
                // Remove '_' prefix of attribute names so the DOM won't try
                // to use them before we've processed the template
                if (name.indexOf('_') === 0) {
                    node.removeAttribute(name);
                    node.setAttribute(name.substring(1), newValue);
                } else if (value !== newValue) {
                    attrs[i].value = newValue;
                }
            }
        }
    }

    // Process child nodes
    if (recurse) {
        processChildren(node, data);
    }

    // Process TextNodes
    if (node.nodeType === 3) {
        // Replace references in other attributes
        value = node.textContent;
        // We can't use the string.replace() with function trick because we need
        // to support functions that return DOM nodes, so we can't have the
        // conversion to a string.
        // Instead we process the string as an array of parts. In order to split
        // the string up, we first replace ${ with \uF001$ and } with \uF002
        // We can then split using \uF001 or \uF002 to get an array of strings
        // where scripts are prefixed with $.
        // \uF001 and \uF002 are just unicode chars reserved for private use.
        value = value.replace(/\$\{([^}]*)\}/, '\uF001$$$1\uF002');
        var parts = value.split(/\uF001|\uF002/);
        if (parts.length > 1) {
            parts.forEach(function(part) {
                if (!part || part === '') {
                    return;
                }
                if (part.charAt(0) === '$') {
                    part = environmentEval(part.slice(1), data);
                }
                // Hmmm isDOMElement ...
                if (typeof part.cloneNode !== 'function') {
                    part = document.createTextNode(part.toString());
                }
                node.parentNode.insertBefore(part, node);
            });
            node.parentNode.removeChild(node);
        }
        newValue = value.replace(/\$\{[^}]*\}/, function(path) {
            return environmentEval(path.slice(2, -1), data);
        });
        if (value !== newValue) {
            node.textContent = newValue;
        }
    }
};

/**
 * Loop through the child nodes of the given node, calling processNode on them
 * all. Note this first clones the set of nodes, so the set of nodes that we
 * visit will be unaffected by additions or removals.
 * @param node The node from which to find children to visit.
 * @param data The data to pass to processNode
 */
function processChildren(node, data) {
    var children = Array.prototype.slice.call(node.childNodes);
    for (var i = 0; i < children.length; i++) {
        processNode(children[i], data);
    }
}

/**
 * Warn of string does not begin '${' and end '}'
 * @return The string stripped of ${ and }, or untouched if it does not match
 */
function stripBraces(str) {
    if (!str.match(/\$\{.*\}/)) {
        console.error('Expected ' + str + ' to match ${...}');
        return str;
    }
    return str.slice(2, -1);
}

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
function property(path, data, newValue) {
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
    if (!value) {
        console.error('Can\'t find path=', path, " in data=", data);
        return null;
    }
    return property(path.slice(1), value, newValue);
}

/**
 * Like eval, but that creates a context of the variables in <tt>env</tt> in
 * which the script is evaluated.
 * WARNING: This script uses 'with' which is generally regarded to be evil.
 * The alternative is to create a Function at runtime that takes X parameters
 * according to the X keys in the env object, and then call that function using
 * the values in the env object. This is likely to be slow, but workable.
 * @param script The string to be evaluated
 * @param env The environment in which to eval the script.
 * @returns The return value of the script
 */
function environmentEval(script, env) {
    with (env) {
        return eval(script);
    }
}

/**
 * Strip the extension off of a name
 */
function basename(name) {
    var lastDot = name.lastIndexOf('.');
    return name.substring(0, lastDot);
}

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
