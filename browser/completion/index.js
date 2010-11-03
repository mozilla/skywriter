require.def(['require', 'exports', 'module',
    'skywriter/plugins'
], function(require, exports, module,
    plugins
) {

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

exports.startup = function(data, reason) {
    var catalog = plugins.catalog;
    catalog.addExtensionPoint("completion", {
        "description": "Code completion support for specific languages",
        "indexOn": "name"
    });
    catalog.connect("command", module.id, {
        "name": "complete",
        "key": [ "return", "tab" ],
        "predicates": { "completing": true },
        "description": "Accept the chosen completion",
        "pointer": "controller#completeCommand"
    });
    catalog.connect("command", module.id, {
        "name": "complete cancel",
        "key": "escape",
        "predicates": { "completing": true },
        "description": "Abandon the completion",
        "pointer": "controller#completeCancelCommand"
    });
    catalog.connect("command", module.id, {
        "name": "complete down",
        "key": "down",
        "predicates": { "completing": true },
        "description": "Choose the completion below",
        "pointer": "controller#completeDownCommand"
    });
    catalog.connect("command", module.id, {
        "name": "complete up",
        "key": "up",
        "predicates": { "completing": true },
        "description": "Choose the completion above",
        "pointer": "controller#completeUpCommand"
    });
};

exports.shutdown = function(data, reason) {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("completion");
};

exports.startup = function(data, reason) {
    var catalog = plugins.catalog;
    catalog.addExtensionPoint("completion", {
        "description": "Code completion support for specific languages",
        "indexOn": "name"
    });
    catalog.connect("command", module.id, {
        "name": "complete",
        "key": [ "return", "tab" ],
        "predicates": { "completing": true },
        "description": "Accept the chosen completion",
        "pointer": "controller#completeCommand"
    });
    catalog.connect("command", module.id, {
        "name": "complete cancel",
        "key": "escape",
        "predicates": { "completing": true },
        "description": "Abandon the completion",
        "pointer": "controller#completeCancelCommand"
    });
    catalog.connect("command", module.id, {
        "name": "complete down",
        "key": "down",
        "predicates": { "completing": true },
        "description": "Choose the completion below",
        "pointer": "controller#completeDownCommand"
    });
    catalog.connect("command", module.id, {
        "name": "complete up",
        "key": "up",
        "predicates": { "completing": true },
        "description": "Choose the completion above",
        "pointer": "controller#completeUpCommand"
    });
};

exports.shutdown = function(data, reason) {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("completion");
};

exports.startup = function(data, reason) {
    var catalog = plugins.catalog;
    catalog.addExtensionPoint("completion", {
        "description": "Code completion support for specific languages",
        "indexOn": "name"
    });
    catalog.connect("command", module.id, {
        "name": "complete",
        "key": [ "return", "tab" ],
        "predicates": { "completing": true },
        "description": "Accept the chosen completion",
        "pointer": "controller#completeCommand"
    });
    catalog.connect("command", module.id, {
        "name": "complete cancel",
        "key": "escape",
        "predicates": { "completing": true },
        "description": "Abandon the completion",
        "pointer": "controller#completeCancelCommand"
    });
    catalog.connect("command", module.id, {
        "name": "complete down",
        "key": "down",
        "predicates": { "completing": true },
        "description": "Choose the completion below",
        "pointer": "controller#completeDownCommand"
    });
    catalog.connect("command", module.id, {
        "name": "complete up",
        "key": "up",
        "predicates": { "completing": true },
        "description": "Choose the completion above",
        "pointer": "controller#completeUpCommand"
    });
};

exports.shutdown = function(data, reason) {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("completion");
};
