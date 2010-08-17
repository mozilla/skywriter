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

var types = require('types:types');
var t = require('plugindev');

exports.testTextFromString = function() {
    types.fromString('Foo', 'text').then(function(converted) {
        t.equal('Foo', converted);
    });
};

exports.testTextToString = function() {
    types.toString('Foo', 'text').then(function(converted) {
        t.equal('Foo', converted);
    });
    types.toString('4', 'text').then(function(converted) {
        t.equal('4', converted);
    });
};

exports.testTextIsValid = function() {
    types.isValid('Foo', 'text').then(function(valid) {
        t.equal(true, valid);
    });
    types.isValid('', 'text').then(function(valid) {
        t.equal(true, valid);
    });
    types.isValid('null', 'text').then(function(valid) {
        t.equal(true, valid);
    });
    types.isValid(4, 'text').then(function(valid) {
        t.equal(false, valid);
    });
    types.isValid(null, 'text').then(function(valid) {
        t.equal(false, valid);
    });
};

exports.testNumberFromString = function() {
    types.fromString('4', 'number').then(function(converted) {
        t.equal(4, converted);
    });
    types.fromString(null, 'number').then(function(converted) {
        t.equal(null, converted);
    });
    // There isn't a spec for stuff like this, but at least we should know
    // if we're changing stuff
    types.fromString('010', 'number').then(function(converted) {
        t.equal(10, converted);
    });
    types.fromString('0x10', 'number').then(function(converted) {
        t.equal(0, converted);
    });
};

exports.testNumberToString = function() {
    types.toString('Foo', 'number').then(function(converted) {
        t.equal('Foo', converted);
    });
    types.toString(4, 'number').then(function(converted) {
        t.equal('4', converted);
    });
};

exports.testNumberIsValid = function() {
    types.isValid(0, 'number').then(function(valid) {
        t.equal(true, valid, 'Zero');
    });
    types.isValid(-1, 'number').then(function(valid) {
        t.equal(true, valid, '-1');
    });
    types.isValid(Infinity, 'number').then(function(valid) {
        t.equal(false, valid, 'Infinity');
    });
    types.isValid(NaN, 'number').then(function(valid) {
        t.equal(false, valid, 'NaN');
    });
    types.isValid(null, 'number').then(function(valid) {
        t.equal(false, valid, 'null');
    });
    types.isValid('0', 'number').then(function(valid) {
        t.equal(false, valid, 'string 0');
    });
    types.isValid('-1', 'number').then(function(valid) {
        t.equal(false, valid, 'string -1');
    });
    types.isValid('null', 'number').then(function(valid) {
        t.equal(false, valid, 'string null');
    });
    types.isValid({}, 'number').then(function(valid) {
        t.equal(false, valid, 'object');
    });
};

exports.testBooleanFromString = function() {
    types.fromString('true', 'boolean').then(function(converted) {
        t.equal(converted, true, '\'true\' should be true');
    });
    types.fromString('false', 'boolean').then(function(converted) {
        t.equal(converted, false, '\'false\' should be false');
    });
    types.fromString('TRUE', 'boolean').then(function(converted) {
        t.equal(converted, true, '\'TRUE\' should be true');
    });
    types.fromString('FALSE', 'boolean').then(function(converted) {
        t.equal(converted, false, '\'FALSE\' should be false');
    });
    types.fromString(null, 'boolean').then(function(converted) {
        t.equal(converted, null, 'null should be null');
    });
};

exports.testBooleanToString = function() {
    types.toString(true, 'boolean').then(function(converted) {
        t.equal('true', converted);
    });
    types.toString(false, 'boolean').then(function(converted) {
        t.equal('false', converted);
    });
};

exports.testBooleanIsValid = function() {
    types.isValid(0, 'boolean').then(function(valid) {
        t.equal(false, valid, 'zero');
    });
    types.isValid(-1, 'boolean').then(function(valid) {
        t.equal(false, valid, 'minus 1');
    });
    types.isValid(Infinity, 'boolean').then(function(valid) {
        t.equal(false, valid, 'Infinity');
    });
    types.isValid(NaN, 'boolean').then(function(valid) {
        t.equal(false, valid, 'NaN');
    });
    types.isValid(null, 'boolean').then(function(valid) {
        t.equal(false, valid, 'null');
    });
    types.isValid('0', 'boolean').then(function(valid) {
        t.equal(false, valid, 'string zero');
    });
    types.isValid('-1', 'boolean').then(function(valid) {
        t.equal(false, valid, 'string -1');
    });
    types.isValid('null', 'boolean').then(function(valid) {
        t.equal(false, valid, 'string null');
    });
    types.isValid({}, 'boolean').then(function(valid) {
        t.equal(false, valid, 'object');
    });
    types.isValid(true, 'boolean').then(function(valid) {
        t.equal(true, valid, 'true');
    });
    types.isValid(false, 'boolean').then(function(valid) {
        t.equal(true, valid, 'false');
    });
};
