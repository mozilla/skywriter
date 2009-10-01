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


exports.Extension = SC.Object.extend({
    load: function(callback) {
        var parts = this.pointer.split(":");
        var modname = this._resolver(parts[0]);
        require.when(modname, function(module) {
            if (callback) {
                if (parts[1]) {
                    callback(module[parts[1]]);
                } else {
                    callback(module);
                }
            }
        });
    }
});

exports.ExtensionPoint = SC.Object.extend({
    init: function() {
        this.extensions = [];
    }
});

exports.Plugin = SC.Object.extend({
});

exports.Catalog = SC.Object.extend({
    init: function() {
        this.points = [];
        this.points.push(exports.ExtensionPoint.create({
            name: "extensionpoint"
        }));

        this.plugins = {};
    },

    activate: function(metadata) {
        for (var name in metadata) {
            var md = metadata[name];
            md.catalog = this;
            if (md.provides) {
                for (var i = 0; i < provides.length; i++) {
                    md.provides[i] = exports.Extension.create(md.provides[i]);
                }
            } else {
                md.provides = [];
            }
            this.plugins[name] = exports.Plugin.create(md);
        }
    }
});
