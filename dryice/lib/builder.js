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
 *   Bespin Team (skywriter@mozilla.com)
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

var path    = require('path');
var fs      = require('fs');
var config  = require('./config');
var util    = require('./util');

var Builder = exports.Builder = function Builder(plugins) {
    this.plugins = plugins;
};

Builder.prototype.getPluginMetadata = function(location) {
    if(fs.statSync(location).isDirectory()) {
        location += '/package.json';
        return JSON.parse(fs.readFileSync(location, 'utf8'));
    }

    var jsFile = fs.readFileSync(location, 'utf8');
    jsFile = jsFile.replace(/\n/g, ""); //needed to be able to match the following regexp and avoid reading the file line by line

    var match = jsFile.match(/.+"define metadata";\((.+)\);"end/);
    if(match) {
        return JSON.parse(match[1]);
    }

    throw new Error('Plugin metadata not found in: ' + location);
};

Builder.prototype.searchPlugin = function(plugin) {
    var paths = config.plugins_path;
    var location;

    for (var p in paths) {
        location = paths[p] + '/' + plugin;

        if(path.existsSync(location)) {
            return location;
        }

        location = location + '.js';

        if(path.existsSync(location)) {
             return location;
        }
    }

    throw new Error('Plugin not found: ' + plugin);
};

/*
Source: kdangoor (irc chat)
the other way that a package ends up in BespinEmbedded is if it's depended on by packages in both main and worker
for example, standard_syntax runs in the worker and depends on underscore
other plugins also depend on underscore
so underscore gets moved into BespinEmbedded


it looks like dryice is doing something like this:
start off with the list of plugins provided by the user
find the ones marked as worker plugins, add to the worker list
(remove from the main plugin list if it doesn't also have the main environment)
then look at the set of plugins that are both in main and worker, and call that the shared set
(oops… before that step is: augment the plugin lists with the dependencies)
almost all of it happens in _set_package_lists, with the exception of identifying the worker plugins */

var all = {};
Builder.prototype._resolveDependencies = function(plugins) {
    for (var name in plugins) {
        if (all[name]) {
            return;
        }

        var location = this.searchPlugin(name);
        var metadata = this.getPluginMetadata(location);

        metadata.name = name;
        metadata.location = location;

        var dependencies = metadata.dependencies; 
        if (dependencies) {
            this._resolveDependencies(dependencies);
        }

        all[name] = metadata;
    }
};

Builder.prototype.build = function(outputDir) {
    if(path.existsSync(outputDir)) {
        util.rmtree(outputDir);
    }
    util.mkpath(outputDir);

    this._resolveDependencies(this.plugins); 
    var plugins = all;

    var worker = {};
    var shared = {};
    var main = {};  

    for (var name in plugins) {
        var metadata = plugins[name];
        console.log(metadata + '\n');

        var isWorker = metadata.environments.worker;
        var isMain = metadata.environments.main;

        if(isWorker) {
            worker[name] = metadata;
        }

        if(isMain && !isWorker) {
            main[name] = metadata;
        }

        if(isWorker && isMain) {
            shared[name] = metadata;
        }
    }
};

