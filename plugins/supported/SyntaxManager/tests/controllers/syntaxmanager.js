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

var SC = require('sproutcore/runtime').SC;
var Range = require('RangeUtils:utils/range');
var SyntaxManager = require('controllers/syntaxmanager').SyntaxManager;
var TextStorage = require('Editor:models/textstorage').TextStorage;
var t = require('PluginDev');

// Convenience function to check attribute ranges for correctness.
var attributesMatch = function(syntaxManager, expectedAttributes) {
    var attributes = syntaxManager._attributes;
    if (attributes.length !== expectedAttributes.length) {
        return false;
    }

    for (var i = 0; i < attributes.length; i++) {
        var lineAttributes = attributes[i];
        var expectedLineAttributes = expectedAttributes[i];
        if (lineAttributes.length !== expectedLineAttributes.length) {
            return false;
        }

        for (var j = 0; j < lineAttributes.length; j++) {
            var attributeRange = lineAttributes[j];
            var expectedAttributeRange = expectedLineAttributes[j];
            if (attributeRange.start !== expectedAttributeRange[0] ||
                    attributeRange.end !== expectedAttributeRange[1]) {
                return false;
            }
        }
    }

    return true;
};

// Likewise for invalid rows.
var invalidRowsMatch = function(syntaxManager, expectedInvalidRows) {
    var invalidRows = syntaxManager._invalidRows;
    for (var i = 0; i < expectedInvalidRows.length; i++) {
        if (invalidRows[i] !== expectedInvalidRows[i]) {
            return false;
        }
    }
    return true;
};

exports.testDeleteRange = function() {
    var syntaxManager = SyntaxManager.create();

    syntaxManager._attributes = [
        [ { start: 0, end: 10 }, { start: 10, end: null } ],
        [ { start: 0, end: 20 }, { start: 20, end: null } ],
        [ { start: 0, end: 30 }, { start: 30, end: null } ]
    ];
    syntaxManager._deleteRange({
        start:  { row: 0, column: 0 },
        end:    { row: 2, column: 30 }
    });
    t.ok(attributesMatch(syntaxManager, [ [ [ 0, null ] ] ]),
        "the attributes are correct after deleting all three lines");
    t.ok(invalidRowsMatch(syntaxManager, [ 0 ]),
        "the only invalid row is 0 after deleting all three lines");

    syntaxManager._attributes = [
        [
            { start: 0, end: 2      },
            { start: 2, end: 5      },
            { start: 5, end: null   }
        ],
        [
            { start: 0, end: 1      },
            { start: 1, end: 9      },
            { start: 9, end: null   }
        ],
        [
            { start: 0, end: null   }
        ]
    ];
    syntaxManager._invalidRows = [ 1, 2 ];
    syntaxManager._deleteRange({
        start:  { row: 0, column: 4 },
        end:    { row: 2, column: 5 }
    });
    t.ok(attributesMatch(syntaxManager,
            [ [ [ 0, 2 ], [ 2, 4 ], [ 4, null ] ] ]),
        "the attributes are correct after deleting the range [ 0,4 2,5 ]");
    t.ok(invalidRowsMatch(syntaxManager, [ 0 ]),
        "the invalid rows are correct after deleting the range [ 0,4 2,5 ]");

    syntaxManager._attributes = [
        [ { start: 0, end: null } ],
        [ { start: 0, end: 20 }, { start: 20, end: null } ]
    ];
    syntaxManager._invalidRows = [];
    syntaxManager._deleteRange({
        start:  { row: 0, column: 0 },
        end:    { row: 1, column: 0 }
    });
    t.ok(attributesMatch(syntaxManager, [ [ [ 0, 20 ], [ 20, null ] ] ]),
        "the attributes are correct after deleting one line");
    t.ok(invalidRowsMatch(syntaxManager, [ 0 ]),
        "the only invalid row is 0 after deleting one line");

    syntaxManager._attributes = [
        [ { start: 0, end: 2 }, { start: 2, end: 4 }, { start: 4, end: null } ]
    ];
    syntaxManager._invalidRows = [];
    syntaxManager._deleteRange({
        start:  { row: 0, column: 1 },
        end:    { row: 0, column: 5 }
    });
    t.ok(attributesMatch(syntaxManager, [ [ [ 0, 1 ], [ 1, null ] ] ]),
        "the attributes are correct after deleting the range [ 0,1 0,5 ]");
    t.ok(invalidRowsMatch(syntaxManager, [ 0 ]),
        "the only invalid row is 0 after deleting the range [ 0,1 0,5 ]");

    syntaxManager._attributes = [];
    for (var i = 0; i < 4; i++) {
        syntaxManager._attributes.push([ { start: 0, end: null } ]);
    }
    syntaxManager._invalidRows = [ 3 ];
    syntaxManager._deleteRange({
        start:  { row: 1, column: 3 },
        end:    { row: 2, column: 2 }
    });
    t.ok(attributesMatch(syntaxManager, [
            [ [ 0, null ] ],
            [ [ 0, 3 ], [ 3, null ] ],
            [ [ 0, null ] ]
        ]),
        "the attributes are correct after deleting the range [ 1,3 2,2 ]");
    t.ok(invalidRowsMatch(syntaxManager, [ 1 ]),
        "the invalid rows are correct after deleting the range [ 1,3 2,2 ]");
};

exports.testGetAttributeIndexForPosition = function() {
    var syntaxManager = SyntaxManager.create();
    syntaxManager._attributes = [
        [
            { start: 0,     end: 2      },  // 0
            { start: 2,     end: 10     },  // 1
            { start: 10,    end: 14     },  // 2
            { start: 14,    end: 20     },  // 3
            { start: 20,    end: 25     },  // 4
            { start: 25,    end: 26     },  // 5
            { start: 26,    end: 32     },  // 6
            { start: 32,    end: 35     },  // 7
            { start: 35,    end: null   }   // 8
        ]
    ];

    t.equal(syntaxManager._getAttributeIndexForPosition({ row: 0,
        column: 28 }), 6, "the attribute index for 0,28; and 6");
    t.equal(syntaxManager._getAttributeIndexForPosition({ row: 0,
        column: 0 }), 0, "the attribute index for 0,0; and 0");
    t.equal(syntaxManager._getAttributeIndexForPosition({ row: 0,
        column: 9 }), 1, "the attribute index for 0,9; and 1");
    t.equal(syntaxManager._getAttributeIndexForPosition({ row: 0,
        column: 39 }), 8, "the attribute index for 0,39; and 8");
    t.equal(syntaxManager._getAttributeIndexForPosition({ row: 0,
        column: 23 }), 4, "the attribute index for 0,23; and 4");
    t.equal(syntaxManager._getAttributeIndexForPosition({ row: 0,
        column: 33 }), 7, "the attribute index for 0,33; and 7");
};

exports.testInsertRange = function() {
    var syntaxManager = SyntaxManager.create();

    syntaxManager._attributes = [
        [ { start: 0, end: 10 }, { start: 10, end: null } ],
        [ { start: 0, end: 20 }, { start: 20, end: null } ]
    ];
    syntaxManager._invalidRows = [ 0, 1, 2 ];
    syntaxManager._insertRange({
        start:  { row: 0, column: 0 },
        end:    { row: 2, column: 10 }
    });
    t.ok(attributesMatch(syntaxManager, [
            [ [ 0, null ] ],
            [ [ 0, null ] ],
            [ [ 0, 10 ], [ 10, 20 ], [ 20, null ] ],
            [ [ 0, 20 ], [ 20, null ] ]
        ]),
        "the attributes are correct after adding 2 lines and 10 columns");
    t.ok(invalidRowsMatch(syntaxManager, [ 0, 2, 3, 4 ]),
        "the invalid rows are correct after adding 2 lines and 10 columns");

    syntaxManager._attributes = [];
    for (var i = 0; i < 3; i++) {
        syntaxManager._attributes[i] = [ { start: 0, end: null } ];
    }
    syntaxManager._invalidRows = [ 0, 1, 2 ];
    syntaxManager._insertRange({
        start:  { row: 1,   column: 10 },
        end:    { row: 1,   column: 20 }
    });
    t.ok(attributesMatch(syntaxManager, [
            [ [ 0, null ] ],
            [ [ 0, 10 ], [ 10, 20 ], [ 20, null ] ],
            [ [ 0, null ] ]
        ]),
        "the attributes are correct after adding the range [ 1,10 1,20 ]");
    t.ok(invalidRowsMatch(syntaxManager, [ 0, 1, 2 ]),
        "the invalid rows are correct after adding the range [ 1,10 1,20 ]");

    syntaxManager._attributes = [
        [ { start: 0, end: 10 }, { start: 10, end: null } ],
        [ { start: 0, end: 20 }, { start: 20, end: null } ]
    ];
    syntaxManager._invalidRows = [ 0 ];
    syntaxManager._insertRange({
        start:  { row: 1, column: 30 },
        end:    { row: 2, column: 0 }
    });
    t.ok(attributesMatch(syntaxManager, [
            [ [ 0, 10 ], [ 10, null ] ],
            [ [ 0, 20 ], [ 20, 30 ], [ 30, null ] ],
            [ [ 0, null ] ]
        ]),
        "the attributes are correct after adding the range [ 1,30 2,0 ]");
    t.ok(invalidRowsMatch(syntaxManager, [ 0 ]),
        "the invalid rows are correct after adding the range [ 1,30 2,0 ]");
};

exports.testUpdateAttributesForRows = function() {
    var generateAttributeLine = function() {
        return [
            { start: 0,     end: 3,     contexts: null },
            { start: 3,     end: 5,     contexts: null },
            { start: 5,     end: 7,     contexts: null },
            { start: 7,     end: 10,    contexts: null },
            { start: 10,    end: null,  contexts: null }
        ];
    };

    var invalidPosition, computedRange;

    var syntaxManager = SyntaxManager.create({
        _computeAttributeRange: function(line, column, state) {
            if (column === invalidPosition.column) {
                return computedRange;
            }
            return this._attributes[0][this.
                _getAttributeIndexForPosition({ row: 0, column: column })];
        },

        textStorage: TextStorage.create()
    });

    invalidPosition = { row: 0, column: 3 };
    computedRange = { start: 3, end: 9, contexts: null };
    syntaxManager._attributes = [ generateAttributeLine() ];
    t.ok(syntaxManager._updateAttributesForRows(invalidPosition.row, 0),
        "_updateAttributesForRows() synced successfully with the computed " +
        "range [3,9]");
    t.ok(attributesMatch(syntaxManager, [
            [ [ 0, 3 ], [ 3, 9 ], [ 9, 10 ], [ 10, null ] ]
        ]), "the attributes are correct after calling " +
        "_updateAttributesForRows() with the computed range [3,9]");

    invalidPosition = { row: 0, column: 3 };
    computedRange = { start: 3, end: 4, contexts: null };
    syntaxManager._attributes = [ generateAttributeLine() ];
    t.ok(syntaxManager._updateAttributesForRows(invalidPosition.row, 0),
        "_updateAttributesForRows() synced successfully with the computed " +
        "range [3,4]");
    t.ok(attributesMatch(syntaxManager, [
            [ [ 0, 3 ], [ 3, 4 ], [ 4, 5 ], [ 5, 7 ], [ 7, 10 ], [ 10, null ] ]
        ]), "the attributes are correct after calling " +
        "_updateAttributesForRows() with the computed range [3,4]");

    invalidPosition = { row: 0, column: 9 };
    computedRange = { start: 7, end: 10, contexts: null };
    syntaxManager._attributes = [ generateAttributeLine() ];
    t.ok(syntaxManager._updateAttributesForRows(invalidPosition.row, 0),
        "_updateAttributesForRows() synced successfully with the computed " +
        "range [7,10]");
    t.ok(attributesMatch(syntaxManager, [
            [ [ 0, 3 ], [ 3, 5 ], [ 5, 7 ], [ 7, 10 ], [ 10, null ] ]
        ]), "the attributes are correct after calling " +
        "_updateAttributesForRows() with the computed range [7,10]");

    invalidPosition = { row: 0, column: 3 };
    computedRange = { start: 3, end: null, contexts: [
        { context: 'foo', state: 'bar', tag: 'baz' }
    ]};
    syntaxManager._attributes =
        [ generateAttributeLine(), generateAttributeLine() ];
    t.ok(!syntaxManager._updateAttributesForRows(invalidPosition.row, 0),
        "_updateAttributesForRows() didn't sync successfully with the " +
        "computed range [3,-] when limited to the first row");
    t.ok(attributesMatch(syntaxManager, [
            [ [ 0, 3 ], [ 3, null ] ],
            [ [ 0, 3 ], [ 3, 5 ], [ 5, 7 ], [ 7, 10 ], [ 10, null ] ]
        ]), "the attributes are correct after calling " +
        "_updateAttributesForRows() with the computed range [3,-] when " +
        "limited to the first row");

    invalidPosition = { row: 0, column: 3 };
    computedRange = { start: 3, end: 8, contexts: null };
    syntaxManager._attributes =
        [ generateAttributeLine(), generateAttributeLine() ];
    t.ok(syntaxManager._updateAttributesForRows(invalidPosition.row, 1),
        "_updateAttributesForRows() synced successfully when run over " +
        "multiple rows with the computed range [3,8]");
    t.ok(attributesMatch(syntaxManager, [
            [ [ 0, 3 ], [ 3, 8 ], [ 8, 10 ], [ 10, null ] ],
            [ [ 0, 3 ], [ 3, 5 ], [ 5, 7 ], [ 7, 10 ], [ 10, null ] ]
        ]), "the attributes are correct after calling " +
        "updateAttributesForRows() over multiple rows with the computed " +
        "range [3,8]");

    invalidPosition = { row: 0, column: 5 };
    computedRange = { start: 5, end: null, contexts: null };
    syntaxManager._attributes = [ generateAttributeLine() ];
    t.ok(syntaxManager._updateAttributesForRows(invalidPosition.row, 0),
        "_updateAttributesForRows() synced successfully with the computed " +
        "range [5,-]");
    t.ok(attributesMatch(syntaxManager, [
            [ [ 0, 3 ], [ 3, 5 ], [ 5, null ] ]
        ]), "the attributes are correct after calling " +
        "_updateAttributesForRows() with the computed range [5,-]");
};

