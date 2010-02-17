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
var Ct = require("core_test");
var DefaultLogger = require('loggers/default', 'core_test');
var BrowserLogger = require("core_test:loggers/browser");
var group = require("bespin:promise").group;
var test = require("core_test:test");
var ctutils = require("core_test:utils");

var lastTest = null;

// default template used for display.  Note we use classes here - not IDs.  
// This way multiple instances can be on the same page at once.
var html = ['<div id="testoutput-%@1" class="core-test">',
  '<div class="useragent">UserAgent</div>',
  '<div class="testresult">',
    '<label class="hide-passed">',
      '<input type="checkbox" checked="" /> Hide passed tests',
    '</label>',
    '<span class="final-status">Running...</span>',
  '</div>',
  '<ul class="detail">',
  '</ul>',
'</div>'].join('');

var TestOutputLogger = ctutils.extend(BrowserLogger, {
    // The request that this test run is associated with
    request: null,
    setupDisplay: function() {
        var guid = SC.guidFor(this);
        var outputHTML = ctutils.fmt(html, guid);
        request.output(outputHTML);
        this.layer = SC.$("#testoutput-" + guid);
    }
});

exports.testrunner = function(env, args, request) {
    var plugin, testModule;
    
    var testspec = args.testmodule;
    if (testspec == null) {
        if (lastTest == null) {
            testspec = "all";
        } else {
            testspec = lastTest;
        }
    }
    lastTest = testspec;
    request.output("Running tests: " + testspec);
    
    var testsToRun = [];
    if (testspec == "all") {
        for (var pluginName in catalog.plugins) {
            plugin = catalog.plugins[pluginName];
            if (plugin.testmodules) {
                plugin.testmodules.forEach(function(testModule) {
                    testsToRun.push(pluginName + ":" + testModule);
                });
            }
        }
    } else if (testspec.indexOf(":") > 0) {
        testsToRun.push(testspec);
    } else {
        plugin = catalog.plugins[testspec];
        if (plugin == undefined) {
            request.doneWithError("Unknown plugin: " + testspec);
            return;
        }
        if (plugin.testmodules) {
            plugin.testmodules.forEach(function(testModule) {
                testsToRun.push(testspec + ":" + testModule);
            });
        }
    }
    
    // TODO make it ensure that the modules are all loaded
    console.log("Tests to run: ");
    console.log(testsToRun);
    var plan = new Ct.Plan(testspec);
    var logger = new TestOutputLogger({
        request: request
    });
    SC.generateGuid(logger);
    console.log("Logger:");
    console.log(logger);
    plan.logger(logger);
    
    var promises = [];
    
    testsToRun.forEach(function(testmodule) {
        var pluginName = testmodule.split(":")[0];
        promises.push(tiki.async(pluginName));
    });
    
    var pr = group(promises);
    pr.then(function() {
        testsToRun.forEach(function(testmodule) {
            var mod = require(testmodule);
            console.log("Module to test:");
            console.log(mod);
            // test.run(mod);
            var ctmod = plan.module(testmodule);
            for (var key in mod) {
                // limit processing to spec...
                if ((key==='test') || (key.indexOf('test')!==0)) continue;
            
                console.log("adding test ", key);
                ctmod.test(key, mod[key]);
            }
        });
        console.log("Going to try running the plan");
        Ct.run(plan);
        request.done();
    });
    request.async();
};
