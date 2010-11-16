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
 * The Original Code is Mozilla Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Kevin Dangoor (kdangoor@mozilla.com)
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


require.ready(function() {
    var knownPlugins = ["util", "rangeutils", "events", "types", "settings", "canon",
                        "edit_session"];
    var knownSingleFilePlugins = ["worker_manager"];
    
    var pluginPackageInfo = [
        {
            name: "plugins",
            main: "index"
        }
    ];
    
    var thirdpartySingleFile = ["underscore"];
    
    // set up RequireJS to know that our plugins all have a main module called "index"
    knownPlugins.forEach(function(pluginName) {
        pluginPackageInfo.push({
            name: pluginName,
            main: "index"
        });
    });
    
    var paths = {};
    thirdpartySingleFile.forEach(function(pluginName) {
        paths[pluginName] = "../thirdparty/" + pluginName;
    });
    knownSingleFilePlugins.forEach(function(pluginName) {
        paths[pluginName] = "../plugins/" + pluginName;
        knownPlugins.push(pluginName);
    });
    
    require({
        packagePaths: {
            "../plugins": pluginPackageInfo
        },
        paths: paths
    });
    require(["plugins"], function() {
        var pluginsModule = require("plugins");
        pluginsModule.catalog.initializePlugins(knownPlugins).then(function() {
            var console = require('util/console');
            console.log('initialized!');
            
            // try some stuff out. TODO delete this
            var newSetting = {
                name: "allGood",
                defaultValue: false,
                type: "boolean"
            };
            
            var settings = require("settings");
            settings.addSetting(newSetting);
            settings.settings.set("allGood", true);
            if (!settings.settings.get("allGood")) {
                alert("it's not all good :(");
            } else {
                console.log("all good!");
            }
        });
        
    });
});
