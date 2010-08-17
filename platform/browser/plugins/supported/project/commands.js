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

var util = require('bespin:util/util');

var catalog = require('bespin:plugin').catalog;

var server = catalog.getObject('server');
var editSession = catalog.getObject('editSession');

/*
 * These are all currently dead, when we resurrect the first we will need this
        {
            "ep": "canon",
            "name": "project",
            "description": "Various commands to manage projects"
        },
 */

/**
 * 'project show' command
 * TODO: Fix
        {
            "ep": "command",
            "name": "project show",
            "description": "show the current project",
            "pointer": "commands#showCommand"
        },
 */
exports.showCommand = function(instruction, projectname) {
    request.done(editSession.getStatus());
};

/**
 * 'project list' command
 * TODO: Fix
        {
            "ep": "command",
            "name": "project list",
            "description": "show projects",
            "pointer": "commands#listCommand"
        },
 */
exports.listCommand = function(instruction, extra) {
    catalog.getObject('files').projects(function(projectNames) {
        var projects = '';
        for (var x = 0; x < projectNames.length; x++) {
            projects += projectNames[x].name + '<br/>';
        }
        request.done(projects);
    });
};

/**
 * 'project create' command
 * TODO: Fix
        {
            "ep": "command",
            "name": "project create",
            "params":
            [
                {
                    "name": "projectname",
                    "type": "text",
                    "description": "???"
                }
            ],
            "description": "create a new project",
            "pointer": "commands#createCommand"
        },
 */
exports.createCommand = function(instruction, project) {
    if (!project) {
        instruction.addParameterError('project', 'Value missing');
        return;
    }

    var onSuccess = instruction.link(function() {
        editSession.setProject(project);
        request.done('Created project \'' + project + '\'.');
        // publish('project:created', { project: project });
    });

    var onFailure = instruction.link(function(xhr) {
        request.doneWithError('Unable to create project \'' + project +
                ': ' + xhr.responseText);
    });

    catalog.getObject('files').makeDirectory(project, '', onSuccess, onFailure);
};

/**
 * 'project delete' command
 * TODO: Fix
        {
            "ep": "command",
            "name": "project delete",
            "params":
            [
                {
                    "name": "projectname",
                    "type": "text",
                    "description": "???"
                }
            ],
            "description": "delete a project",
            "pointer": "commands#deleteCommand"
        },
 */
exports.deleteCommand = function(instruction, project) {
    if (!project || project == catalog.getObject('files').userSettingsProject) {
        request.doneWithError('You can\'t delete the settings project.');
        return;
    }

    var onSuccess = instruction.link(function() {
        request.done('Deleted project ' + project);
        // publish('project:deleted', { project:project });
    });

    var onFailure = instruction.link(function(xhr) {
        request.doneWithError('Failed to delete project ' + project + ': '
                + xhr.responseText);
    });

    catalog.getObject('files').removeDirectory(project, '', onSuccess, onFailure);
};

/**
 * 'project rename' command
 * TODO: Fix
        {
            "ep": "command",
            "name": "project rename",
            "params":
            [
                {
                    "name": "currentProject",
                    "type": "text",
                    "description": "???"
                },
                {
                    "name": "newProject",
                    "type": "text",
                    "description": "???"
                }
            ],
            "description": "rename a project",
            "pointer": "commands#renameCommand"
        },
 */
exports.renameCommand = function(instruction, args) {
    if (args.currentProject == args.newProject) {
        return;
    }

    server.renameProject(args.currentProject, args.newProject, {
        onSuccess: instruction.link(function() {
            editSession.setProject(args.newProject);
            request.done();
            // publish('project:renamed', {
            //     oldName: args.currentProject, newName: args.newProject });
        }),
        onFailure: instruction.link(function(xhr) {
            request.doneWithError('Unable to rename project from ' +
                    args.currentProject + ' to ' + args.newProject +
                    '<br><br><em>Are you sure that the ' + args.currentProject +
                    ' project exists?</em>');
        })
    });
};

/**
 * 'project export' command
 * TODO: Fix
        {
            "ep": "command",
            "name": "project export",
            "params":
            [
                {
                    "name": "project",
                    "type": "text",
                    "description": "project name"
                },
                {
                    "name": "archivetype",
                    "type": "text",
                    "description": "archivetype (zip | tgz, defaults to zip)",
                    "defaultValue": "zip"
                }
            ],
            "description": "export the given project with an archivetype of zip or tgz<br><code>project export myproject</code>",
            "pointer": "commands#exportCommand"
        },
 */
exports.exportCommand = function(instruction, args) {
    var project = args.project || editSession.project;
    var type = args.archivetype;

    if (!util.include(['zip','tgz','tar.gz'], type)) {
        type = 'zip';
    }

    catalog.getObject('files').projects(function(projects) {
        var projectDir = project + '/';
        if (util.indexOfProperty(projects, 'name', projectDir) != null) {
            // try to do it via the iframe
            server.exportProject(project, type);
        } else {
            request.doneWithError('Unabled to export project ' + project +
                    ' because it doesn\'t seem to exist.');
        }
    });
};

/**
 * Given a URL, work out the project name as a default
 * For example, given http://foo.com/path/to/myproject.zip
 * return 'myproject'
 */
var calculateProjectName = function(url) {
    var split = url.split('/');
    var projectMaker = split[split.length - 1].split('.');
    projectMaker.pop();
    return projectMaker.join('_');
};

/**
 * Test the given string to return if it is a URL.
 * In this context it has to be http(s) only
 */
var isURL = function(url) {
    return (url && (/^http(:|s:)/.test(url)));
};

/**
 * Hack to make sure we're not going to fail to load
 */
var dojo = {
    connect: function() {
        throw new Error('Find an alternative for dojo.connect()');
    },
    disconnect: function() {
        throw new Error('Find an alternative for dojo.disconnect()');
    },
    io: {
        iframe: {
            send: function() {
                throw new Error('Find an alternative for dojo.io.iframe.send()');
            }
        }
    }
};

/**
 *
 */
var upload = function(project) {
    // use the center popup and inject a form in that points to the right place.
    var el = document.getElementById('centerpopup');

    el.innerHTML = '<div id="upload-container">' +
            '<form method="POST" name="upload" id="upload" ' +
            'enctype="multipart/form-data"><div id="upload-header">' +
            'Import project via upload <img id="upload-close" ' +
            'src="images/icn_close_x.png" align="right">' +
            '</div><div id="upload-content"><div id="upload-status"></div>' +
            '<p>Browse to find the project archive that you wish to archive' +
            '<br>and then click on the <code>Upload</code> button.</p>' +
            '<center><input type="file" id="filedata" name="filedata" ' +
            'accept="application/zip,application/x-gzip"> ' +
            '<input type="submit" value="Upload"></center></div></form></div>';

    dojo.connect(document.getElementById('upload'), 'submit', function() {
        var upload = document.getElementById('upload-status');
        upload.innerHTML = 'Importing file into new project ' + project;
        dojo.io.iframe.send({
            url: '/project/import/' + project,
            form: document.getElementById('upload'),
            method: 'POST',
            handleAs: 'text',
            preventCache: true,
            contentType: 'multipart/form-data',
            load: function(data, ioArg) {
                upload.innerHTML = 'Thanks for uploading the file!';
            },
            error: function(error, ioArg) {
                setTimeout(function() {
                    catalog.getObject('files').projects(function(projectNames) {
                        var isProject = function(test) {
                            return project + '/' == test.name;
                        };
                        if (projectNames.some(isProject)) {
                            // publish('project:created', { project: project });
                            upload.innerHTML = 'Archive imported and project ' +
                                    project + ' has been created!';
                        } else {
                            upload.innerHTML = 'Error uploading the file.';
                        }
                    });
                }, 100);
            }
        });
    });

    // webpieces.showCenterPopup(el, true);

    // TODO: refactor this block into webpieces if popup is modal
    // pass the uploadClose DOM element as parameter to showCenterPopup
    var uploadClose, overlay;
    var hideCenterPopup = function(){
        el.removeChild(el.firstChild);
        // webpieces.hideCenterPopup(el);
        dojo.disconnect(uploadClose);
        dojo.disconnect(overlay);
    };
    var closeEle = document.getElementById('upload-close');
    var overlayEle = document.getElementById('overlay');
    uploadClose = dojo.connect(closeEle, 'onclick', hideCenterPopup);
    overlay = dojo.connect(overlayEle, 'onclick', hideCenterPopup);
};

/**
 * 'project import' command
 * Can be called in three ways:<ul>
 * <li>import http://foo.com/path/to/archive.zip
 * <li>import http://foo.com/path/to/archive.zip projectName
 * <li>import projectName http://foo.com/path/to/archive.zip
 * </ul>
 * TODO: Fix
        {
            "ep": "command",
            "name": "project import",
            "params":
                [
                    {
                        "name": "url",
                        "type": "text",
                        "description": "A URL of a .zip or .tar.gz file to upload from into a new project called by the file name."
                    },
                    {
                        "name": "project",
                        "type": "text",
                        "description": "Project into which to upload the files",
                        "defaultValue": null
                    }
                ],
            "description": "import a zip or archive file from a URL",
            "pointer": "commands#importCommand"
        },
 */
exports.importCommand = function(instruction, args) {
    var project, url;

    // Fail fast. Nothing given?
    if (!args.url) {
        instruction.addParameterError('url', 'Value missing');
        return;
        // Checking - import http://foo.com/path/to/archive.zip
    } else if (!args.project && isURL(args.url)) {
        args.project = calculateProjectName(args.url);
        // Oops, project and url are the wrong way around. That's fine
    } else if (isURL(args.project)) {
        project = args.project;
        url = args.url;
        args.project = url;
        args.url = project;
        // Ensure that a URL came along at some point or call up an upload box
    } else if (!isURL(args.url)) {
        // only a project has been passed in
        project = args.url;
        upload(project);
    } else {
        // A project and URL are here and available to do a URL based import
        project = args.project;
        url = args.url;

        request.done('About to import ' + project + ' from:<br><br>' +
                url + '<br><em>It can take awhile to download the project, ' +
                'so be patient!</em>');

        server.importProject(project, url, {
            onSuccess: function() {
                request.done('Project ' + project +
                        ' imported from:<br><br>' + url);
                // publish('project:created', { project: project });
            },
            onFailure: function(xhr) {
                request.doneWithError('Unable to import ' + project +
                        ' from:<br><br>' + url + '.<br><br>Maybe due to: ' +
                        xhr.responseText);
            }
        });
    }
};
