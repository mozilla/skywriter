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
        var modname = parts[0];
        require.prequire.when(modname, function() {
            var r = require;
            var module = r(modname);
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
    },
    
    addExtension: function(extension) {
        this.extensions.push(extension);
    }
});

exports.Plugin = SC.Object.extend({
});

exports.Catalog = SC.Object.extend({
    init: function() {
        this.points = {};
        this.getExtensionPoint("extensionpoint");
        this.plugins = {};
    },
    
    getExtensionPoint: function(name) {
        if (this.points[name] === undefined) {
            this.points[name] = exports.ExtensionPoint.create({
                name: name,
                catalog: this
            });
        }
        return this.points[name];
    },
    
    activate: function(metadata) {
        for (var name in metadata) {
            var md = metadata[name];
            md.catalog = this;
            if (md.provides) {
                var provides = md.provides;
                for (var i = 0; i < provides.length; i++) {
                    var extension = exports.Extension.create(provides[i]);
                    provides[i] = extension;
                    var ep = this.getExtensionPoint(extension.ep);
                    ep.addExtension(extension);
                }
            } else {
                md.provides = [];
            }
            this.plugins[name] = exports.Plugin.create(md);
        }
    }
});

exports.thing1 = function(extension) {
    print("Thing1");
}

exports.thing2 = function(extension) {
    print("Thing2");
}

exports.thing3 = function(msg) {
    print("Thing3: " + msg);
}
