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

var Promise = require('bespin:promise').Promise;
var types = require('Types:types');
var t = require('PluginDev');

/*
 * Various utilities that should live elsewhere
 */
function fail(msg) {
    t.ok(false, msg);
}

function never(msg) {
    return function() {
        t.ok(false, msg);
    };
}

function resolvedPromise(data) {
    var promise = new Promise();
    promise.resolve(data);
    return promise;
}

exports.testGetSimpleName = function() {
    t.equal(types.getSimpleName('text'), 'text', 'text is simple');
    t.equal(types.getSimpleName('selection'), 'selection', 'selection simple');
    t.equal(types.getSimpleName({ name: 'text' }), 'text', 'text complex');

    var selType = { name: 'selection' };
    t.equal(types.getSimpleName(selType), 'selection', 'selection complex');

    selType = { name: 'selection', data: [ 1, 2, 3, 4 ] };
    t.equal(types.getSimpleName(selType), 'selection', 'selection complex');
};

exports.testEquals = function() {
    var textType = { name: 'text' };
    t.ok(types.equals('text', 'text'), '2 already simple names are equal');
    t.ok(types.equals('text', textType), 'simple type = complex type');
    t.ok(types.equals(textType, 'text'), 'complex type = simple type');
    t.ok(types.equals(textType, { name: 'text' }), 'complex = complex');
    t.ok(types.equals('WRONG', 'WRONG'), 'We don\'t test for actual types');

    var sel1 = { name: 'selection' };
    var sel2 = 'selection';
    t.ok(types.equals(sel1, sel2), 'complex type = simple type 1');

    sel1 = { name: 'selection', data: [ 1, 2, 3, 4 ] };
    sel2 = 'selection';
    t.ok(types.equals(sel1, sel2), 'complex type with data = simple type');

    sel1 = { name: 'selection', data: [ 1, 2, 3, 4 ] };
    sel2 = { name: 'selection', data: [ 4, 3, 2, 1 ] };
    t.ok(types.equals(sel1, sel2), 'complex + data = complex + other data');

    //t.ok(!types.equals('text', ''), 'text != ""');
    t.ok(!types.equals('text', 'selection'), 'text != ""');
    t.ok(!types.equals('text', 'DOESNOTEXIST'), 'text != ""');

    sel1 = { name: 'selection', data: [ 1, 2, 3, 4 ] };
    t.ok(!types.equals(sel1, 'text'), 'complex + data != simple');
};

/**
 * types.resolveType returns a typeData thing that is { type:... typeExt }
 * @param name
 * @returns {Function}
 */
function createTypeDataTester(name) {
    return function(typeData) {
        t.equal(typeData.ext.ep, 'type', 'TypeExts do give you types?');

        t.equal(typeData.ext.name, name, 'type[text].name == ' + name);

        t.equal(typeof typeData.ext.description, 'string', 'descr = string');
        t.ok(typeData.ext.description.length > 0, 'type[text].description len');

        t.equal(typeof typeData.ext.pointer, 'string', 'type.pointer = string');
        t.ok(typeData.ext.pointer.length > 0, 'type[text].pointer exists');

        t.equal(typeof typeData.ext.load, 'function', 'type.load = function');
    };
}

exports.testResolveSimpleTypes = function() {
    var typeSpec = 'text';
    types.resolveType(typeSpec).then(createTypeDataTester('text'));

    typeSpec = { name: 'text' };
    types.resolveType(typeSpec).then(createTypeDataTester('text'));

    typeSpec = { name: 'selection' };
    types.resolveType(typeSpec).then(createTypeDataTester('selection'));

    t['throws'](function() {
        typeSpec = { name: 'wrong' };
        types.resolveType(typeSpec).then(never('should die before here'));
    });
};

/*
 * For #testSelection
 */
exports.resolver = function() { return [ 4, 3 ]; };
exports.lateResolver = function() { return resolvedPromise([ 'a' ]); };

exports.testSelection = function() {
    var typeSpec = { name: 'selection', data: [ 1, 2 ] };
    types.resolveType(typeSpec).then(function(typeData) {
        createTypeDataTester('selection')(typeData);
        t.deepEqual(typeData.ext.data, [ 1, 2 ], 'selection data pass thru');
    });

    typeSpec = {
        name: 'selection',
        pointer: 'Types:tests/testTypes#resolver'
    };
    types.resolveType(typeSpec).then(function(typeData) {
        createTypeDataTester('selection')(typeData);
        t.deepEqual(typeData.ext.data, [ 4, 3 ], 'selection data resolved');
    });

    typeSpec = {
        name: 'selection',
        pointer: 'Types:tests/testTypes#lateResolver'
    };
    types.resolveType(typeSpec).then(function(typeData) {
        createTypeDataTester('selection')(typeData);
        t.deepEqual(typeData.ext.data, [ 'a' ], 'selection data resolved');
    });
};

exports.deferText = function() { return 'text'; };
exports.lateDeferText = function() { return resolvedPromise('text'); };
exports.deferComplexText = function() { return { name: 'text' }; };
exports.lateDeferComplexText = function() {
    return resolvedPromise({ name: 'text' });
};
exports.lateDeferComplexSelection = function() {
    return resolvedPromise({ name: 'selection', data: [ 42, 43 ] });
};
exports.lateDoubleDeferText = function() {
    return resolvedPromise({
        name: 'deferred',
        pointer: 'Types:tests/testTypes#lateDeferText'
    });
};

exports.testDeferred = function() {
    var typeSpec = {
        name: 'deferred',
        pointer: 'Types:tests/testTypes#deferText'
    };
    types.resolveType(typeSpec).then(function(typeData) {
        createTypeDataTester('text')(typeData);
    });

    typeSpec = {
        name: 'deferred',
        pointer: 'Types:tests/testTypes#lateDeferText'
    };
    types.resolveType(typeSpec).then(function(typeData) {
        createTypeDataTester('text')(typeData);
    });

    typeSpec = {
        name: 'deferred',
        pointer: 'Types:tests/testTypes#deferComplexText'
    };
    types.resolveType(typeSpec).then(function(typeData) {
        createTypeDataTester('text')(typeData);
    });

    typeSpec = {
        name: 'deferred',
        pointer: 'Types:tests/testTypes#lateDoubleDeferText'
    };
    types.resolveType(typeSpec).then(function(typeData) {
        createTypeDataTester('text')(typeData);
    });

    typeSpec = {
        name: 'deferred',
        pointer: 'Types:tests/testTypes#lateDeferComplexText'
    };
    types.resolveType(typeSpec).then(function(typeData) {
        createTypeDataTester('text')(typeData);
    });

    typeSpec = {
        name: 'deferred',
        pointer: 'Types:tests/testTypes#lateDeferComplexSelection'
    };
    types.resolveType(typeSpec).then(function(typeData) {
        createTypeDataTester('selection')(typeData);
        t.deepEqual(typeData.ext.data, [ 42, 43 ], 'selection data resolved');
    });
};
