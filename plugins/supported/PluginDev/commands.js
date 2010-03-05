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

var catalog = require("bespin:plugins").catalog;
var SC = require("sproutcore/runtime").SC;

var server = require("BespinServer").server;
var pathutils = require("Filesystem:path");
var util = require("bespin:util/util");

var getPluginName = function(path) {
    if (util.endsWith(path, "/")) {
        var trimmedPath = path.replace(/\/$/, "");
        return pathutils.basename(trimmedPath);
    }
    
    return pathutils.splitext(pathutils.basename(path))[0];
};

var finishAdd = function(request, pluginConfigFile, pluginConfig, path) {
    if (pluginConfig.plugins == undefined) {
        pluginConfig.plugins = [];
    }
    pluginConfig.plugins.push(path);
    
    var pluginName = getPluginName(path);
    
    pluginConfigFile.saveContents(JSON.stringify(pluginConfig)).then(
        function() {
            catalog.loadMetadata(server.SERVER_BASE_URL + "/plugin/reload/" + pluginName).then(function() {
                request.done("Plugin " + pluginName + " added.");
            });
            
        },
        function(error) {
            request.doneWithError("Unable to save plugin configuration: " +
                error.message);
        }
    );
};

/*
 * the plugin add command to add a new plugin file or directory.
 */
exports.add = function(env, args, request) {
    var path = args.path;
    var files = catalog.getObject("files");
    var session = env.get("session");
    path = session.getCompletePath(path);
    
    var pluginName = getPluginName(path);
    if (catalog.plugins[pluginName]) {
        request.done("Plugin " + pluginName + " already exists.");
        return;
    }
    
    var pluginConfigFile = files.getObject("BespinSettings/pluginInfo.json");
    
    pluginConfigFile.loadContents().then(function(result) {
        var pluginConfig = JSON.parse(result.contents);
        finishAdd(request, pluginConfigFile, pluginConfig, path);
    }, function(error) {
        // file not found from the server is okay, we just need
        // to create the file.
        if (error.xhr && error.xhr.status == 404) {
            finishAdd(request, pluginConfigFile, {}, path);
        } else {
            request.doneWithError("Unable to load your plugin config: " + error.message);
        }
    });
    request.async();
};

/*
 * the plugin list command
 */
exports.list = function(env, args, request) {
    var plugins = catalog.getPlugins({
        sortBy: ["type", "name"]
    });
    var output = ['<div class="plugin_list">'];
    var lastPluginType = null;
    plugins.forEach(function(plugin) {
        if (plugin.type != lastPluginType) {
            if (lastPluginType) {
                output.push('</table></div>');
            }
            output.push('<div class="plugin_group">');
            output.push('<h2>');
            output.push(plugin.type);
            output.push(' plugins</h2><table>');
            lastPluginType = plugin.type;
        }
        output.push('<tr><th>');
        output.push(plugin.name);
        output.push('</th><td>');
        if (plugin.description) {
            output.push(plugin.description);
        } else {
            output.push('&nbsp;');
        }
        output.push('</td></tr>');
    });
    if (lastPluginType) {
        output.push('</table></div>');
    }
    output.push('</div>');
    request.done(output.join(""));
};
