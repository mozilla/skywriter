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

var bespin = require("bespin");
var command = require("bespin/command");
var webpieces = require("bespin/util/webpieces");

// TODO: For this and for other sub-command sets. I think that the resources
// exposed here are exposed through the Canon ctor keeping a reference to them
// which has the following implications:
// - it breaks reload, or could cause Canon to get confused as the 'same thing'
//   is added more than once
// - it means that we don't need to do any exports at all.

/**
 * Command store for the group commands
 * (which are subcommands of the main 'group' command)
 */
exports.commands = new command.Canon(command.rootCanon, {
    name: 'project',
    preview: 'Various commands to manage projects'
});

/**
 * Display sub-command help
 */
exports.commands.addCommand({
    name: 'help',
    takes: ['search'],
    preview: 'show subcommands for project command',
    description: 'The <strong>help</strong> gives you access to the various subcommands in the project command space.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(instruction, extra) {
        var output = this.parent.getHelp(extra);
        instruction.addOutput(output);
    }
});

/**
 * 'project show' command
 */
exports.commands.addCommand({
    name: 'show',
    preview: 'show the current project',
    execute: function(instruction, projectname) {
        instruction.addOutput(bespin.get('editSession').getStatus());
    }
});

/**
 * 'project list' command
 */
exports.commands.addCommand({
    name: 'list',
    preview: 'show projects',
    execute: function(instruction, extra) {
        bespin.get('files').projects(function(projectNames) {
            var projects = "";
            for (var x = 0; x < projectNames.length; x++) {
                projects += projectNames[x].name + "<br/>";
            }
            instruction.addOutput(projects);
        });
    }
});

/**
 * 'project create' command
 */
exports.commands.addCommand({
    name: 'create',
    takes: ['projectname'],
    preview: 'create a new project',
    usage: '[newprojectname]',
    execute: function(instruction, project) {
        if (!project) {
            instruction.addUsageOutput(this);
            return;
        }

        var onSuccess = instruction.link(function() {
            bespin.get('editSession').setProject(project);
            instruction.addOutput('Successfully created project \'' + project + '\'.');
            bespin.publish("project:created", {project: project});
        });

        var onFailure = instruction.link(function(xhr) {
            instruction.addErrorOutput('Unable to create project \'' + project + ': ' + xhr.responseText);
        });

        bespin.get('files').makeDirectory(project, '', onSuccess, onFailure);
    }
});

/**
 * 'project delete' command
 */
exports.commands.addCommand({
    name: 'delete',
    takes: ['projectname'],
    preview: 'delete a project',
    usage: '[projectname]',
    execute: function(instruction, project) {
        if (!project) {
            instruction.addUsageOutput(this);
            return;
        }

        var files = bespin.get('files');
        if (!project || project == files.userSettingsProject) {
            instruction.addErrorOutput('Sorry, you can\'t delete the settings project.');
            return;
        }

        var onSuccess = instruction.link(function() {
            instruction.addOutput('Deleted project ' + project);
            instruction.unlink();
            bespin.publish("project:deleted", {project:project});
        });

        var onFailure = instruction.link(function(xhr) {
            instruction.addErrorOutput('Failed to delete project ' + project + ': ' + xhr.responseText);
            instruction.unlink();
        });

        files.removeDirectory(project, '', onSuccess, onFailure);
    }
});

/**
 * 'project rename' command
 */
exports.commands.addCommand({
    name: 'rename',
    takes: ['currentProject', 'newProject'],
    preview: 'rename a project',
    usage: '[currentProject], [newProject]',
    execute: function(instruction, args) {
        if (!args.currentProject || !args.newProject) {
            instruction.addUsageOutput(this);
            return;
        }

        var currentProject = args.currentProject;
        var newProject = args.newProject;

        if ((!currentProject || !newProject) || (currentProject == newProject)) {
            return;
        }

        bespin.get('server').renameProject(currentProject, newProject, {
            onSuccess: instruction.link(function() {
                bespin.get('editSession').setProject(newProject);
                instruction.unlink();
                bespin.publish("project:renamed", {oldName: currentProject,
                                                   newName: newProject});
            }),
            onFailure: instruction.link(function(xhr) {
                instruction.addErrorOutput('Unable to rename project from ' + currentProject + " to " + newProject + "<br><br><em>Are you sure that the " + currentProject + " project exists?</em>");
                instruction.unlink();
            })
        });
    }
});

/**
 * 'project export' command
 */
exports.commands.addCommand({
    name: 'export',
    takes: ['project', 'archivetype'],
    preview: 'export the given project with an archivetype of zip or tgz<br><code>project export myproject</code>',
    completeText: 'project name, archivetype (zip | tgz, defaults to zip)',
    execute: function(instruction, args) {
        var project = args.project || bespin.get('editSession').project;
        var type = args.archivetype;

        if (!bespin.util.include(['zip','tgz','tar.gz'], type)) {
            type = 'zip';
        }

        bespin.get('files').projects(function(projects) {
            var projectDir = project + "/";
            if (bespin.util.indexOfProperty(projects, "name", projectDir) != null) {
                bespin.get('server').exportProject(project, type); // try to do it via the iframe
            } else {
                instruction.addErrorOutput("Unabled to export project " + project + " because it doesn't seem to exist.");
                instruction.unlink();
            }
        });
    }
});

/**
 * 'project import' command
 */
exports.commands.addCommand({
    name: 'import',
    takes: ['url', 'project'],
    preview: 'If a URL is given, import that URL (e.g. <code>project import http://foo.com/bar.zip MyProject</code>).<br><br>If only a project is given, then a file upload dialog will ask to upload a local file (e.g. <code>project import MyProject</code>).',
    completeText: "import from a URL: <code>project import http://foo.com/yourarchive.zip [projectname]</code><br><br>upload from your machine: <code>project import YourProjectName</code><br><br><em>If only a URL is given, the projectname will be implied<br><br>If only a project name is given, a file upload window will be shown to upload.</em>",
    usage: "import from a URL: <code>project import http://foo.com/yourarchive.zip [projectname]</code><br><br>upload from your machine: <code>project import YourProjectName</code><br><br><em>If only a URL is given, the projectname will be implied<br><br>If only a project name is given, a file upload window will be shown to upload.</em>",

    /**
     * Given a URL, work out the project name as a default
     * For example, given http://foo.com/path/to/myproject.zip
     * return "myproject"
     */
    calculateProjectName: function(url) {
        var split = url.split('/');
        var projectMaker = split[split.length - 1].split(".");
        projectMaker.pop();
        return projectMaker.join("_");
    },

    /**
     * Test the given string to return if it is a URL.
     * In this context it has to be http(s) only
     */
    isURL: function(url) {
        return (url && (/^http(:|s:)/.test(url)));
    },

    upload: function(project) {
        // use the center popup and inject a form in that points to the right place.
        var el = document.getElementById('centerpopup');


        el.innerHTML = "<div id='upload-container'><form method='POST' name='upload' id='upload' enctype='multipart/form-data'><div id='upload-header'>Import project via upload <img id='upload-close' src='images/icn_close_x.png' align='right'></div><div id='upload-content'><div id='upload-status'></div><p>Browse to find the project archive that you wish to archive<br>and then click on the <code>Upload</code> button.</p><center><input type='file' id='filedata' name='filedata' accept='application/zip,application/x-gzip'> <input type='submit' value='Upload'></center></div></form></div>";

        dojo.connect(document.getElementById('upload'), "submit", function() {
            document.getElementById('upload-status').innerHTML = 'Importing file into new project ' + project;
            dojo.io.iframe.send({
                url: '/project/import/' + project,
                form: document.getElementById('upload'),
                method: 'POST',
                handleAs: 'text',
                preventCache: true,
                contentType: "multipart/form-data",
                load: function(data, ioArg) {
                    document.getElementById('upload-status').innerHTML = 'Thanks for uploading the file!';
                },
                error: function(error, ioArg) {
                    setTimeout(function() {
                        bespin.get('files').projects(function(projectNames) {
                            var isProject = function(test) {
                                return project + '/' == test.name;
                            };
                            if (projectNames.some(isProject)) {
                                bespin.publish("project:created", { project: project });
                                document.getElementById('upload-status').innerHTML = 'Archive imported and project ' + project + ' has been created!';
                            } else {
                                document.getElementById('upload-status').innerHTML = 'Error uploading the file. Sorry, try again!';
                            }
                        });
                    }, 100);
                }
            });
        });

        webpieces.showCenterPopup(el, true);

        // TODO: refactor this block into webpieces if popup is modal
        // pass the uploadClose DOM element as parameter to showCenterPopup
        var uploadClose, overlay;
        var hideCenterPopup = function(){
            el.removeChild(el.firstChild);
            webpieces.hideCenterPopup(el);
            dojo.disconnect(uploadClose);
            dojo.disconnect(overlay);
        };
        uploadClose = dojo.connect(document.getElementById("upload-close"), "onclick", hideCenterPopup);
        overlay = dojo.connect(document.getElementById("overlay"), "onclick", hideCenterPopup);
    },

    /**
     * Can be called in three ways:<ul>
     * <li>import http://foo.com/path/to/archive.zip
     * <li>import http://foo.com/path/to/archive.zip projectName
     * <li>import projectName http://foo.com/path/to/archive.zip
     * </ul>
     */
    execute: function(instruction, args) {
        var project, url;

        // Fail fast. Nothing given?
        if (!args.url) {
            instruction.addUsageOutput(this);
            return;
            // Checking - import http://foo.com/path/to/archive.zip
        } else if (!args.project && this.isURL(args.url)) {
            args.project = this.calculateProjectName(args.url);
            // Oops, project and url are the wrong way around. That's fine
        } else if (this.isURL(args.project)) {
            project = args.project;
            url = args.url;
            args.project = url;
            args.url = project;
            // Make sure that a URL came along at some point, else call up an upload box
        } else if (!this.isURL(args.url)) {
            project = args.url; // only a project has been passed in
            this.upload(project);
        } else {
            // A project and URL are here and available to do a URL based import
            project = args.project;
            url = args.url;

            instruction.addOutput("About to import " + project + " from:<br><br>" + url + "<br><br><em>It can take awhile to download the project, so be patient!</em>");

            bespin.get('server').importProject(project, url, {
                onSuccess: function() {
                    instruction.addOutput("Project " + project + " imported from:<br><br>" + url);
                    bespin.publish("project:created", {project: project});
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Unable to import " + project + " from:<br><br>" + url + ".<br><br>Maybe due to: " + xhr.responseText);
                }
            });
        }
    }
});

