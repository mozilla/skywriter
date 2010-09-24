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
var util    = require('./util');

var Builder = require('./builder').Builder;

var Platform = exports.Platform = function Platform() {

}

Platform.prototype.dist = function(type, manifest) {
    if(!manifest) {
        manifest = 'manifest.json';
    }

    var exists = path.existsSync(manifest);
    if(!exists) {
        throw new Error('Manifest file was not found!');
    }

    manifest = JSON.parse(fs.readFileSync(manifest, 'utf8'));


    switch(type) {
        case 'embedded':
            this._distEmbedded(manifest);
            break;
        case 'bookmarklet':
            this._distBookmarklet(manifest);
            break;
        case 'xulrunner':
            this._distXulRunner(manifest);
            break;
    }
}

Platform.prototype._distEmbedded = function(manifest) {
    var version = config.version.number;
    var outputDir = manifest.output_dir + '-' + version;

    if(path.existsSync(outputDir)) {
        util.rmtree(outputDir);
    }

    util.mkpath(outputDir);

    //Run build process
    var builder = new Builder(manifest.plugins);
    builder.build(outputDir + '/prebuilt');

    util.copy('LICENSE.txt', outputDir + '/LICENSE.txt');
    util.copy('platform/embedded/README-Customizable.txt', outputDir + '/README.txt');

    /*var genDocs = path.existsSync(outputDir + '/docs');
    if(genDocs) {
        util.copytree(outputDir + '/docs', outputDir + '/docs');
        util.rmtree(buildDir + '/docs');        
    }*/

    var lib = outputDir + '/lib';
    fs.mkdirSync(lib, 0755);

    //util.copy('platform/embedded/static/tiki.js', lib + '/tiki.js');
    util.copy('platform/embedded/static/worker.js', lib + '/worker.js');
    util.copytree('dryice', lib + '/dryice');

    util.copytree('platform/browser/plugins', outputDir + '/plugins');
    //util.copytree('platform/common/plugins', outputDir + '/plugins');

    util.copy('platform/embedded/sample.json', outputDir + '/sample.json');
    util.copy('platform/embedded/Jakefile', outputDir + '/Jakefile');

    this._updateVersion(outputDir + '/plugins/boot/skywriter/index.js', 'embedded');
    //compress source code
    //make tar.gz
}

Platform.prototype._updateVersion = function(versionFile, platform) {
    var data = fs.readFileSync(versionFile, 'utf8');

    data = data.replace('VERSION_NUMBER', config.version.number);
    data = data.replace('VERSION_CODENAME', config.version.name);
    data = data.replace('API_VERSION', config.version.api);
    data = data.replace('PLATFORM', platform);

    fs.writeFileSync(versionFile, data, 'utf8');
}

Platform.prototype.launch = function() {
}
