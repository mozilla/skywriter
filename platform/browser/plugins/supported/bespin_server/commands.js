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

var project_m = require('project');
var server = require('bespin_server:index').server;
var env = require('environment').env;

/**
 * Utility to convert bytes to megabytes
 */
var megabytes = function(bytes) {
    return (bytes / 1024 / 1024).toFixed(2);
};

/**
 * 'quota' command
 * TODO: Delete or correct
        {
            "ep": "command",
            "name": "quota",
            "description": "show your quota info",
            "pointer": "#quotaCommand"
        },
 */
exports.quotaCommand = function(instruction) {
    var free = megabytes(editSession.quota - editSession.amountUsed);
    var output = 'You have ' + free +
                 ' MB free space to put some great code!<br>' +
                 'Used ' + megabytes(editSession.amountUsed) + ' MB ' +
                 'out of your ' + megabytes(editSession.quota) + ' MB quota.';
    request.done(output);
};

/**
 * 'rescan' command
 */
exports.rescanCommand = function(args, request) {
    var project;
    if (!args.project) {
        var file = env.file;
        project = project_m.getProjectAndPath(file.path)[0];
        if (project) {
            project = project.name;
        }
    } else {
        project = args.project;
    }

    if (!project) {
        request.doneWithError('You need to supply a project name, ' +
                'if you don\'t have an open file.');
        return;
    }

    var url = '/project/rescan/' + encodeURI(project);
    server.requestDisconnected('POST', url, {}).then(function() {
        request.done('Rescan of ' + project + " complete.");
    }, function(error) {
        request.doneWithError('Error during rescan: ' + error.message);
    });
    request.async();
};

/**
 * 'preview' command
 */
exports.preview = function(args, request) {
    var buffer = env.buffer;

    if (buffer.untitled()) {
        env.commandLine.prompt('saveas ');
        request.done('The current buffer is untitled. Please enter a name.');
        return;
    }

    buffer.save().then(function() {
        var fileName = buffer.file.path;
        popup = window.open(
            server.base_url + '/preview/at/' + fileName,
            'Preview: ' + fileName, 'location=no,menubar=no'
        );
        popup.focus();

        request.done('Preview: ' + fileName);
    }, function(error) {
        request.doneWithError('Could not save the file and as such can not preview it.');
    });

    request.async();
};

/*
 * 'export' command to export a project
 */
exports.exportCommand = function(args, request) {
    var iframe = document.createElement("iframe");
    iframe.src = server.base_url + '/project/export/' +  args.project + "." + args.archivetype;
    iframe.style.display = 'none';
    iframe.style.height = iframe.style.width = "0";
    document.getElementsByTagName("body")[0].appendChild(iframe);
    request.done("Exporting...");
};
