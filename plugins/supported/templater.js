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

/**
 * Turn the template into a DOM node, resolving the ${} references to the data
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
    if (parent.attributes && parent.attributes.length) {
        for (var i = 0; i < parent.attributes.length; i++) {
            var attr = parent.attributes[i];
            var value, path;
            if (attr.name === 'save') {
                path = attr.value.slice(2, -1);
                property(path, data, parent);
            } else if (attr.name.substring(0, 2) === 'on') {
                path = attr.value.slice(2, -1);
                value = property(path, data);
                parent.addEventListener(attr.name.substring(2), value, true);
                continue;
            } else {
                value = attr.value.replace(/\$\{.*\}/, function(path) {
                    return property(path.slice(2, -1), data);
                });
                if (attr.value !== value) {
                    attr.value = value;
                }
            }
        }
    }
    for (i = 0; i < parent.childNodes.length; i++) {
        processChildren(parent.childNodes[i], data);
    }
};

/**
 * Combined getter and setter that works with a path through some data set.
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
    } else {
        return property(path.slice(1), value, newValue);
    }
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
