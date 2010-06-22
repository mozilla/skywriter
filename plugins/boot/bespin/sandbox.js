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

var tiki = require('tiki');
var util = require('bespin:util/util');
var catalog = require('bespin:plugins').catalog;

if (catalog.parent) {
    throw new Error('The sandbox module can\'t be used inside of a slave catalog!');
}

var Sandbox = function() {
    // Call the default constructor. This creates a new tiki sandbox.
    tiki.Sandbox.call(this, bespin.tiki.require.loader, {}, []);

    // Register the plugins from the main catalog in the sandbox catalog.
    var sandboxCatalog = this.require('bespin:plugins').catalog;

    // Set the parent catalog for the sandbox catalog. This makes the sandbox
    // be a slave catalog of the master catalog.
    catalog.addChild(sandboxCatalog);

    // Copy over a few things from the master catalog.
    sandboxCatalog.deactivatePlugin = catalog.deactivatePlugin;
    sandboxCatalog._extensionsOrdering = catalog._extensionsOrdering;

    // The sandbox catalog uses the same metadata as the master catalog. We clone
    // it and remove the 'bespin' plugin as this is already in the sandbox catalog.
    var pluginsMetadata = util.clone(catalog.plugins);
    delete pluginsMetadata.bespin;

    // The registration call.
    sandboxCatalog.registerMetadata(pluginsMetadata);
};

Sandbox.prototype = new tiki.Sandbox();

Sandbox.prototype.require = function(moduleId, curModuleId, workingPackage) {
    // assume canonical() will normalize params
    var canonicalId = this.loader.canonical(moduleId, curModuleId, workingPackage);
    // Get the plugin name.
    var pluginName = canonicalId.substring(2).split(':')[0];

    // Check if this module should be shared.
    if (catalog.plugins[pluginName].share) {
        // The module is shared, so require it from the main sandbox.
        return bespin.tiki.sandbox.require(moduleId, curModuleId, workingPackage);
    } else {
        // This module is not shared, so use the normal require function.
        return tiki.Sandbox.prototype.require.call(this, moduleId,
                                                    curModuleId, workingPackage);
    }
}

exports.Sandbox = Sandbox;
