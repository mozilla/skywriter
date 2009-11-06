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
var util = require("bespin/util/util");
var themes = require("bespin/theme");
var SC = require("sproutcore");

/**
 * This settings module provides a base implementation to store settings.
 * It also contains various "stores" to save that data, including:
 *
 * <li>Core: Core interface to settings. User code always goes through here.
 * <li>Server: The main store. Saves back to the Bespin Server API
 * <li>InMemory: In memory settings that are used primarily for debugging
 * <li>Cookie: Store in a cookie using cookie-jar
 * <li>URL: Intercept settings in the URL. Often used to override
 * <li>DB: Commented out for now, but a way to store settings locally
 * <li>Events: Custom events that the settings store can intercept and send
 */

/**
 * To allow container to create settings, configured dynamically
 */
exports.factory = function(onCreate) {
    onCreate(exports.Core.create({ store: exports.InMemory }));
};

/**
 * The default initial settings
 */
function defaultSettings() {
    return {
        'tabsize': '4',
        'tabmode': 'off',
        'tabarrow': 'on',
        'fontsize': '10',
        'consolefontsize': '11',
        'autocomplete': 'off',
        'closepairs': 'off',
        'collaborate': 'off',
        'language': 'auto',
        'strictlines': 'on',
        'syntaxcheck': 'off',
        'syntaxengine': 'simple',
        'syntaxmarkers': 'all',
        'preview': 'window',
        'smartmove': 'on',
        'jslint': ''
    };
}

/**
 * Handles load/save of user settings.
 * TODO: tie into the sessions servlet; eliminate Gears dependency
 */
exports.Core = SC.Object.extend({
    store: null,

    init: function() {
        this.browserOverrides = {};
        this.fromURL = exports.URL.create();

        // TODO: There is no reason for this even to be a class - all we want
        // to do is register some subscriptions
        this.customEvents = exports.Events.create({ settings: this });

        // This is where we choose which store to load
        // TODO: Seriously. How is this code even vaguely acceptable?
        this.store = new (this.store || exports.ServerFile)(this);
    },

    setValue: function(key, value) {
        this.store.setValue(key, value);

        bespin.publish("settings:set:" + key, { value: value });
    },

    getValue: function(key) {
        var fromURL = this.fromURL.getValue(key); // short circuit
        if (fromURL) {
            return fromURL;
        }

        return this.store.getValue(key);
    },

    unsetValue: function(key) {
        this.store.unsetValue(key);
    },

    loadSession: function() {
        var editSession = bespin.get('editSession');

        var path = this.fromURL.getValue('path') || editSession.path;
        var project = this.fromURL.getValue('project') || editSession.project;

        bespin.publish("settings:init", { // -- time to init my friends
            path: path,
            project: project
        });
    },

    /**
     * Checks to see if the passed value is "on" or "true" (case sensitive).
     * NOTE: This DOES NOT use settings it just does a string comparison. To
     * test a setting you probably need #isSettingOn() and #isSettingOff().
     */
    isValueOn: function(value) {
        return value == 'on' || value == 'true';
    },

    /**
     * Checks to see if the passed value is "off" or "false" (case sensitive) or
     * <code>undefined</code>.
     * NOTE: This DOES NOT use settings it just does a string comparison. To
     * test a setting you probably need #isSettingOn() and #isSettingOff().
     */
    isValueOff: function(value) {
        return value == 'off' || value == 'false' || value === undefined;
    },

    /**
     * Check to see if the given setting is on (using #isValueOn())
     */
    isSettingOn: function(key) {
        return this.isValueOn(this.getValue(key));
    },

    /**
     * Check to see if the given setting is off (using #isValueOff())
     */
    isSettingOff: function(key) {
        return this.isValueOff(this.getValue(key));
    },

    /**
     * Like #setValue() except that the value is assumed to be an object that
     * should be converted to JSON.
     */
    setObject: function(key, value) {
        this.setValue(key, JSON.stringify(value));
    },

    /**
     * Like #getValue() except that the value is assumed to be an object that
     * should be converted from JSON before being returned.
     */
    getObject: function(key) {
        try {
            return JSON.parse(this.getValue(key));
        } catch(e) {
            console.log("Error in getObject: " + e);
            return {};
        }
    },

    list: function() {
        if (typeof this.store.list == "function") {
            return this.store.list();
        } else {
            var settings = [];
            var storeSettings = this.store.settings;
            for (var prop in storeSettings) {
                if (storeSettings.hasOwnProperty(prop)) {
                    settings.push({ 'key': prop, 'value': storeSettings[prop] });
                }
            }
            return settings;
        }
    }
});

/**
 * Debugging in memory settings (die when browser is closed)
 */
exports.InMemory = SC.Object.extend({
    constructor: function(parent) {
        this.parent = parent;
        this.settings = defaultSettings();
        bespin.publish("settings:loaded");
    }/*,

    setValue: function(key, value) {
        this.settings[key] = value;
    },

    getValue: function(key) {
        return this.settings[key];
    },

    unsetValue: function(key) {
        delete this.settings[key];
    }*/
});

/**
 * Save the settings in a cookie
 */
exports.Cookie = SC.Object.extend({
    constructor: function(parent) {
        var expirationInHours = 1;
        this.cookieSettings = {
            expires: expirationInHours / 24,
            path: '/'
        };

        var settings = JSON.parse(cookie.get("settings"));

        if (settings) {
            this.settings = settings;
        } else {
            this.settings = {
                'tabsize': '2',
                'fontsize': '10',
                'autocomplete': 'off',
                'collaborate': 'off'
            };
            cookie.set("settings", JSON.stringify(this.settings), this.cookieSettings);
        }
        bespin.publish("settings:loaded");
    },

    setValue: function(key, value) {
        this.settings[key] = value;
        cookie.set("settings", JSON.stringify(this.settings), this.cookieSettings);
    },

    getValue: function(key) {
        return this.settings[key];
    },

    unsetValue: function(key) {
        delete this.settings[key];
        cookie.set("settings", JSON.stringify(this.settings), this.cookieSettings);
    }
});

/**
 * The real grand-daddy that implements uses Server to access the backend
 */
exports.ServerAPI = SC.Object.extend({
    constructor: function(parent) {
        this.self = this;
        this.parent = parent;
        this.server = bespin.get('server');
        this.settings = defaultSettings();

        // TODO: seed the settings
        this.server.listSettings(function(settings) {
            self.settings = settings;
            if (settings.tabsize === undefined) {
                self.settings = defaultSettings();
                self.server.setSettings(self.settings);
            }
            bespin.publish("settings:loaded");
        });
    },

    setValue: function(key, value) {
        this.settings[key] = value;
        this.server.setSetting(key, value);
    },

    getValue: function(key) {
        return this.settings[key];
    },

    unsetValue: function(key) {
        delete this.settings[key];
        this.server.unsetSetting(key);
    }
});


/**
 * Store the settings in the file system
 */
exports.ServerFile = SC.Object.extend({
    constructor: function(parent) {
        this.parent = parent;
        this.server = bespin.get('server');
        this.settings = defaultSettings();
        this.loaded = false;

        // Load up settings from the file system
        this._load();
    },

    setValue: function(key, value) {
        this.settings[key] = value;

        if (key[0] != '_') {
            this._save(); // Save back to the file system unless this is a hidden setting
        }
    },

    getValue: function(key) {
        return this.settings[key];
    },

    unsetValue: function(key) {
        delete this.settings[key];

        this._save(); // Save back to the file system
    },

    _save: function() {
        if (!this.loaded) {
            return; // short circuit to make sure that we don't save the defaults over your settings
        }

        var settings = "";
        for (var key in this.settings) {
            if (this.settings.hasOwnProperty(key)) {
                settings += key + " " + this.settings[key] + "\n";
            }
        }

        bespin.get('files').saveFile(bespin.userSettingsProject, {
            name: "settings",
            content: settings,
            timestamp: new Date().getTime()
        });
    },

    _load: function() {
        var self = this;

        var postLoad = function() {
            if (!self.loaded) { // first time load
                self.loaded = true;
                bespin.publish("settings:loaded");
            }
        };

        var onLoad = function(file) {
            // Strip \n\n from the end of the file and insert into this.settings
            file.content.split(/\n/).forEach(function(setting) {
                if (setting.match(/^\s*#/)) {
                    return; // if comments are added ignore
                }
                if (setting.match(/\S+\s+\S+/)) {
                    var pieces = setting.split(/\s+/);
                    self.settings[pieces[0].trim()] = pieces[1].trim();
                }
            });

            // This loop is supposed to replace self.parent.publishValues();
            // If this works, then we should remove the above code
            for (var key in self.settings) {
                bespin.publish("settings:set:" + key, {
                    value: self.settings[key]
                });
            }

            postLoad();
        };

        bespin.fireAfter([ "authenticated" ], function() {
            // postLoad even if we can't read the settings file
            bespin.get('files').loadContents(bespin.userSettingsProject, "settings", onLoad, postLoad);
        });
    }
});


/**
 * Taken out for now to allow us to not require gears_db.js (and Gears itself).
 * Experimental ability to save locally in the SQLite database.
 * The plan is to migrate to ActiveRecord.js or something like it to abstract on top
 * of various stores (HTML5, Gears, globalStorage, etc.)
 */

/*
// turn off for now so we can take gears_db.js out
exports.DB = SC.Object.extend({
    parent: null,
    init: function() {
        this.db = new GearsDB('wideboy');

        //this.db.run('drop table settings');
        this.db.run('create table if not exists settings (' +
               'id integer primary key,' +
               'key varchar(255) unique not null,' +
               'value varchar(255) not null,' +
               'timestamp int not null)');

        this.db.run('CREATE INDEX IF NOT EXISTS settings_id_index ON settings (id)');
        bespin.publish("settings:loaded");
    },

    setValue: function(key, value) {
        this.db.forceRow('settings', { 'key': key, 'value': value, timestamp: new Date().getTime() }, 'key');
    },

    getValue: function(key) {
        var rs = this.db.run('select distinct value from settings where key = ?', [ key ]);
        try {
            if (rs && rs.isValidRow()) {
              return rs.field(0);
            }
        } catch (e) {
            console.log(e.message);
        } finally {
            rs.close();
        }
    },

    unsetValue: function(key) {
        this.db.run('delete from settings where key = ?', [ key ]);
    },

    list: function() {
        // TODO: Need to override with browser settings
        return this.db.selectRows('settings', '1=1');
    },

    // -- Private-y
    seed: function() {
        this.db.run('delete from settings');

        // TODO: loop through the settings
        this.db.run('insert into settings (key, value, timestamp) values (?, ?, ?)', ['keybindings', 'emacs', 1183878000000]);
        this.db.run('insert into settings (key, value, timestamp) values (?, ?, ?)', ['tabsize', '2', 1183878000000]);
        this.db.run('insert into settings (key, value, timestamp) values (?, ?, ?)', ['fontsize', '10', 1183878000000]);
        this.db.run('insert into settings (key, value, timestamp) values (?, ?, ?)', ['autocomplete', 'off', 1183878000000]);
    }
});
*/

/**
 * Grab the setting from the URL, either via # or ?
 */
exports.URL = SC.Object.extend({
    constructor: function(queryString) {
        this.results = util.queryToObject(this.stripHash(queryString || window.location.hash));
    },

    /*
    getValue: function(key) {
        return this.results[key];
    },

    setValue: function(key, value) {
        this.results[key] = value;
    },
    */

    stripHash: function(url) {
        var tobe = url.split('');
        tobe.shift();
        return tobe.join('');
    }
});

/**
 * Custom Event holder for the Settings work.
 * It deals with both settings themselves, and other events that
 * settings need to watch and look for
 */
exports.Events = SC.Object.extend({
    settings: null,

    init: function() {
        var editSession = bespin.get('editSession');
        var editor = bespin.get('editor');
        var self = this;

        /**
         * Watch for someone wanting to do a set operation
         */
        bespin.subscribe("settings:set", function(event) {
            var key = event.key;
            var value = event.value;

            self.settings.setValue(key, value);
        });

        /**
         * Set the session path and change the syntax highlighter
         * when a new file is opened
         */
        bespin.subscribe("editor:openfile:opensuccess", function(event) {
            if (event.file.name == null) {
                throw new Error("event.file.name falsy");
            }

            if (event.project) {
                editSession.project = event.project;
            }
            editSession.path = event.file.name;

            var fileType = util.path.fileType(event.file.name);
            if (fileType) {
                bespin.publish("settings:language", { language: fileType });
            }
        });

        /**
         * If a file (such as BespinSettings/config) is loaded that you want to auto
         * syntax highlight, here is where you do it
         * FUTURE: allow people to add in their own special things
         */
        (function() {
            var specialFileMap = {
                'BespinSettings/config': 'js'
            };
            bespin.subscribe("editor:openfile:opensuccess", function(event) {
                var project = event.project || bespin.get('editSession').project;
                var filename = event.file.name;
                var mapName = project + "/" + filename;
                if (specialFileMap[mapName]) {
                    bespin.publish("settings:language", {
                        language: specialFileMap[mapName]
                    });
                }
            });
        }());

        /**
         * When the syntax setting is changed, tell the syntax system to change
         */
        bespin.subscribe("settings:set:language", function(event) {
            bespin.publish("settings:language", {
                language: event.value,
                fromCommand: true
            });
        });

        /**
         * Given a new language command, change the editor.language
         */
        bespin.subscribe("settings:language", function(event) {
            var language = event.language;
            var fromCommand = event.fromCommand;
            var languageSetting = self.settings.getValue('language') || "auto";

            if (!editor) {
                console.log("Ignoring language change - no editor");
            }

            if (language == editor.language) {
                return; // already set to be that language
            }

            if (util.include(['auto', 'on'], language)) {
                // TODO: There was some code added in rev 565cac09ddc1 which
                // prefixed this code with:
                //   var path = bespin.get('editSession').path;
                //   if (path) {
                // I'm not sure that this makes sense (when we're then reading
                // the path from the URL anyway. So I'm reverting to this ...
                // If that code did make sense then we should re-revert and
                // explain in comments
                var path = self.settings.fromURL.getValue('path');
                if (path) {
                    var fileType = util.path.fileType(path);
                    if (fileType) {
                        editor.language = fileType;
                    }
                }
            } else if (util.include(['auto', 'on'], languageSetting) || fromCommand) {
                editor.language = language;
            } else if (languageSetting == 'off') {
                editor.language = 'off';
            }
        });

        /**
         * Change the font size for the editor
         */
        bespin.subscribe("settings:set:fontsize", function(event) {
            var fontsize = parseInt(event.value, 10);
            editor.theme.editorTextFont = editor.theme.editorTextFont.replace(/[0-9]{1,}pt/, fontsize+'pt');
            editor.theme.lineNumberFont = editor.theme.lineNumberFont.replace(/[0-9]{1,}pt/, fontsize+'pt');
        });

        /**
         * Change the Theme object used by the editor
         */
        bespin.subscribe("settings:set:theme", function(event) {
            var theme = event.value;

            var checkSetAndExit = function() {
                var themeSettings = themes[theme];
                if (themeSettings) {
                    if (themeSettings != editor.theme) {
                        editor.theme = themeSettings;
                        bespin.publish("settings:set:fontsize", {
                            value: self.settings.getValue('fontsize')
                        });
                    }
                    return true;
                }
                return false;
            };

            if (theme) {
                // Try to load the theme from the themes hash
                if (checkSetAndExit()) {
                    return true;
                }

                // Not in the default themes, load from themes.ThemeName file
                try {
                    var req = require;
                    // the build system doesn't like dynamic names.
                    req.call(window, "themes." + theme);
                    if (checkSetAndExit()) {
                        return true;
                    }
                } catch (e) {
                    console.log("Unable to load theme: " + theme, e);
                }

                // Not in themes, load from users directory
                var self = this;
                var onSuccess = function(file) {
                    try {
                        eval(file.content);
                    } catch (e) {
                        console.log("Error with theme loading: ", e);
                    }

                    if (!checkSetAndExit()) {
                        bespin.get("commandLine").addErrorOutput("Sorry old chap. No theme called '" + theme + "'. Fancy making it?");
                    }
                };

                var onFailure = function() {
                    bespin.get("commandLine").addErrorOutput("Sorry old chap. No theme called '" + theme + "'. Fancy making it?");
                };

                bespin.get('files').loadContents(bespin.userSettingsProject, "/themes/" + theme + ".js", onSuccess, onFailure);
            }
        });

        /**
         * Add in emacs key bindings
         */
        bespin.subscribe("settings:set:keybindings", function(event) {
            if (event.value == "emacs") {
                editor.bindKey("moveCursorLeft", "ctrl b");
                editor.bindKey("moveCursorRight", "ctrl f");
                editor.bindKey("moveCursorUp", "ctrl p");
                editor.bindKey("moveCursorDown", "ctrl n");
                editor.bindKey("moveToLineStart", "ctrl a");
                editor.bindKey("moveToLineEnd", "ctrl e");
            }
        });

        bespin.subscribe("settings:set:debugmode", function(event) {
            editor.debugMode = this.settings.isValueOn(event.value);

            if (editor.debugMode) {
                bespin.plugins.loadOne("bespin.debugger",
                    function(debug) {
                        debug.loadBreakpoints(function() {
                            editor.paint(true);
                        });
                    });
            } else {
                editor.paint(true);
            }
        });

        /**
         * The frequency of the cursor blink in milliseconds (defaults to 250)
         */
        bespin.subscribe("settings:set:cursorblink", function(event) {
            // get the number of milliseconds
            var ms = parseInt(event.value, 10);
            if (ms) {
                editor.ui.toggleCursorFrequency = ms;
            }
        });

        /**
         * Run the trim command before saving the file
         */
        var _trimOnSave; // store the subscribe handler away

        bespin.subscribe("settings:set:trimonsave", function(event) {
            if (this.settings.isValueOn(event.value)) {
                _trimOnSave = bespin.subscribe("editor:savefile:before", function(event) {
                    bespin.get("commandLine").executeCommand('trim', true);
                });
            } else {
                bespin.unsubscribe(_trimOnSave);
            }
        });

        /**
         * Turn the syntax parser on or off
         */
        bespin.subscribe("settings:set:syntaxcheck", function (data) {
            if (this.settings.isValueOff(data.value)) {
                bespin.publish("parser:stop");
            } else {
                bespin.publish("parser:start");
            }
        });

        /**
         * If we are opening up a new file
         */
        bespin.subscribe("settings:init", function(event) {
            // existing file, so open it
            if (event.path) {
                editor.openFile(event.project, event.path);
            } else {
                var lastUsed = this.settings.getObject("_lastused");
                if (!lastUsed) {
                    editor.openFile("SampleProject", "readme.txt");
                }
                else {
                    editor.openFile(lastUsed[0].project, lastUsed[0].filename, lastUsed[0]);
                }
            }
        });

        /**
         * Check for auto load
         */
        bespin.subscribe("settings:init", function() {
            if (this.settings.isValueOff(this.settings.getValue('autoconfig'))) {
                return;
            }

            try {
                bespin.get('files').evalFile(bespin.userSettingsProject, "config");
            } catch (e) {
                console.log("Error in user config: ", e);
            }
        });
    }
});
