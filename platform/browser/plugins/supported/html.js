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

"define metadata";
({
    "description": "HTML syntax highlighter",
    "dependencies": { "standard_syntax": "0.0.0" },
    "environments": { "worker": true },
    "provides": [
        {
            "ep": "syntax",
            "name": "html",
            "pointer": "#HTMLSyntax",
            "fileexts": [ "htm", "html" ]
        }
    ]
});
"end";

var StandardSyntax = require('standard_syntax').StandardSyntax;

var states = {};

//
// This parser is modeled on the WHATWG HTML 5 specification, with some
// simplifications to improve performance. See the relevant spec here:
//
//     http://www.whatwg.org/specs/web-apps/current-work/
//

var createTagStates = function(prefix, interiorActions) {
    states[prefix + '_beforeAttrName'] = [
        {
            regex:  /^\s+/,
            tag:    'plain'
        },
        {
            regex:  /^\//,
            tag:    'operator',
            then:   prefix + '_selfClosingStartTag'
        },
        {
            regex:  /^>/,
            tag:    'operator',
            then:   interiorActions
        },
        {
            regex:  /^./,
            tag:    'keyword',
            then:   prefix + '_attrName'
        }
    ];

    // 10.2.4.35 Attribute name state
    states[prefix + '_attrName'] = [
        {
            regex:  /^\s+/,
            tag:    'plain',
            then:   prefix + '_afterAttrName'
        },
        {
            regex:  /^\//,
            tag:    'operator',
            then:   prefix + '_selfClosingStartTag'
        },
        {
            regex:  /^=/,
            tag:    'operator',
            then:   prefix + '_beforeAttrValue'
        },
        {
            regex:  /^>/,
            tag:    'operator',
            then:   interiorActions
        },
        {
            regex:  /^["'<]+/,
            tag:    'error'
        },
        {
            regex:  /^[^ \t\n\/=>"'<]+/,
            tag:    'keyword'
        }
    ];

    states[prefix + '_afterAttrName'] = [
        {
            regex:  /^\s+/,
            tag:    'plain'
        },
        {
            regex:  /^\//,
            tag:    'operator',
            then:   prefix + '_selfClosingStartTag'
        },
        {
            regex:  /^=/,
            tag:    'operator',
            then:   prefix + '_beforeAttrValue'
        },
        {
            regex:  /^>/,
            tag:    'operator',
            then:   interiorActions
        },
        {
            regex:  /^./,
            tag:    'keyword',
            then:   prefix + '_attrName'
        }
    ];

    states[prefix + '_beforeAttrValue'] = [
        {
            regex:  /^\s+/,
            tag:    'plain'
        },
        {
            regex:  /^"/,
            tag:    'string',
            then:   prefix + '_attrValueQQ'
        },
        {
            regex:  /^(?=&)/,
            tag:    'plain',
            then:   prefix + '_attrValueU'
        },
        {
            regex:  /^'/,
            tag:    'string',
            then:   prefix + '_attrValueQ'
        },
        {
            regex:  /^>/,
            tag:    'error',
            then:   interiorActions
        },
        {
            regex:  /^./,
            tag:    'string',
            then:   prefix + '_attrValueU'
        }
    ];

    states[prefix + '_attrValueQQ'] = [
        {
            regex:  /^"/,
            tag:    'string',
            then:   prefix + '_afterAttrValueQ'
        },
        {
            regex:  /^[^"]+/,
            tag:    'string'
        }
    ];

    states[prefix + '_attrValueQ'] = [
        {
            regex:  /^'/,
            tag:    'string',
            then:   prefix + '_afterAttrValueQ'
        },
        {
            regex:  /^[^']+/,
            tag:    'string'
        }
    ];

    states[prefix + '_attrValueU'] = [
        {
            regex:  /^\s/,
            tag:    'string',
            then:   prefix + '_beforeAttrName'
        },
        {
            regex:  /^>/,
            tag:    'operator',
            then:   interiorActions
        },
        {
            regex:  /[^ \t\n>]+/,
            tag:    'string'
        }
    ];

    states[prefix + '_afterAttrValueQ'] = [
        {
            regex:  /^\s/,
            tag:    'plain',
            then:   prefix + '_beforeAttrName'
        },
        {
            regex:  /^\//,
            tag:    'operator',
            then:   prefix + '_selfClosingStartTag'
        },
        {
            regex:  /^>/,
            tag:    'operator',
            then:   interiorActions
        },
        {
            regex:  /^(?=.)/,
            tag:    'operator',
            then:   prefix + '_beforeAttrName'
        }
    ];

    // 10.2.4.43 Self-closing start tag state
    states[prefix + '_selfClosingStartTag'] = [
        {
            regex:  /^>/,
            tag:    'operator',
            then:   'start'
        },
        {
            regex:  /^./,
            tag:    'error',
            then:   prefix + '_beforeAttrName'
        }
    ];
};

states = {
    // 10.2.4.1 Data state
    start: [
        {
            regex:  /^[^<]+/,
            tag:    'plain'
        },
        {
            regex:  /^<!--/,
            tag:    'comment',
            then:   'commentStart'
        },
        {
            regex:  /^<!/,
            tag:    'directive',
            then:   'markupDeclarationOpen'
        },
        {
            regex:  /^<\?/,
            tag:    'comment',
            then:   'bogusComment'
        },
        {
            regex:  /^</,
            tag:    'operator',
            then:   'tagOpen'
        }
    ],

    // 10.2.4.8 Tag open state
    tagOpen: [
        {
            regex:  /^\//,
            tag:    'operator',
            then:   'endTagOpen'
        },
        {
            regex:  /^script/i,
            tag:    'keyword',
            then:   'script_beforeAttrName'
        },
        {
            regex:  /^[a-zA-Z]/,
            tag:    'keyword',
            then:   'tagName'
        },
        {
            regex:  /^(?=.)/,
            tag:    'plain',
            then:   'start'
        }
    ],

    // 10.2.4.6 Script data state
    scriptData: [
        {
            regex:  /^<(?=\/script>)/i,
            tag:    'operator',
            then:   'tagOpen'
        },
        {
            regex:  /^[^<]+/,
            tag:    'plain'
        }
    ],

    // 10.2.4.9 End tag open state
    endTagOpen: [
        {
            regex:  /^[a-zA-Z]/,
            tag:    'keyword',
            then:   'tagName'
        },
        {
            regex:  /^>/,
            tag:    'error',
            then:   'start'
        },
        {
            regex:  /^./,
            tag:    'error',
            then:   'bogusComment'
        }
    ],

    // 10.2.4.10 Tag name state
    tagName: [
        {
            regex:  /^\s+/,
            tag:    'plain',
            then:   'normal_beforeAttrName'
        },
        {
            regex:  /^\//,
            tag:    'operator',
            then:   'normal_selfClosingStartTag'
        },
        {
            regex:  /^>/,
            tag:    'operator',
            then:   'start'
        },
        {
            regex:  /^[^ \t\n\/>]+/,
            tag:    'keyword'
        }
    ],

    // 10.2.4.44 Bogus comment state
    bogusComment: [
        {
            regex:  /^[^>]+/,
            tag:    'comment'
        },
        {
            regex:  /^>/,
            tag:    'comment',
            then:   'start'
        }
    ],

    // 10.2.4.45 Markup declaration open state
    markupDeclarationOpen: [
        {
            regex:  /^doctype/i,
            tag:    'directive',
            then:   'doctype'
        },
        {
            regex:  /^(?=.)/,
            tag:    'comment',
            then:   'bogusComment'
        }
    ],

    // 10.2.4.46 Comment start state
    commentStart: [
        {
            regex:  /^-->/,
            tag:    'comment',
            then:   'start'
        },
        {
            regex:  /^[^-]+/,
            tag:    'comment'
        }
    ],

    // 10.2.4.53 DOCTYPE state
    doctype: [
        {
            regex:  /^\s/,
            tag:    'plain',
            then:   'beforeDoctypeName'
        },
        {
            regex:  /^./,
            tag:    'error',
            then:   'beforeDoctypeName'
        }
    ],

    // 10.2.4.54 Before DOCTYPE name state
    beforeDoctypeName: [
        {
            regex:  /^\s+/,
            tag:    'plain'
        },
        {
            regex:  /^>/,
            tag:    'error',
            then:   'start'
        },
        {
            regex:  /^./,
            tag:    'directive',
            then:   'doctypeName'
        }
    ],

    // 10.2.4.55 DOCTYPE name state
    doctypeName: [
        {
            regex:  /^\s/,
            tag:    'plain',
            then:   'afterDoctypeName'
        },
        {
            regex:  /^>/,
            tag:    'directive',
            then:   'start'
        },
        {
            regex:  /^[^ \t\n>]+/,
            tag:    'directive'
        }
    ],

    // 10.2.4.56 After DOCTYPE name state
    afterDoctypeName: [
        {
            regex:  /^\s+/,
            tag:    'directive'
        },
        {
            regex:  /^>/,
            tag:    'directive',
            then:   'start'
        },
        {
            regex:  /^public/i,
            tag:    'directive',
            then:   'afterDoctypePublicKeyword'
        },
        {
            regex:  /^system/i,
            tag:    'directive',
            then:   'afterDoctypeSystemKeyword'
        },
        {
            regex:  /^./,
            tag:    'error',
            then:   'bogusDoctype'
        }
    ],

    // 10.2.4.57 After DOCTYPE public keyword state
    afterDoctypePublicKeyword: [
        {
            regex:  /^\s+/,
            tag:    'plain',
            then:   'beforeDoctypePublicId'
        },
        {
            regex:  /^"/,
            tag:    'error',
            then:   'doctypePublicIdQQ'
        },
        {
            regex:  /^'/,
            tag:    'error',
            then:   'doctypePublicIdQ'
        },
        {
            regex:  /^>/,
            tag:    'error',
            then:   'start'
        },
        {
            regex:  /^./,
            tag:    'error',
            then:   'bogusDoctype'
        }
    ],

    // 10.2.4.58 Before DOCTYPE public identifier
    beforeDoctypePublicId: [
        {
            regex:  /^\s+/,
            tag:    'plain'
        },
        {
            regex:  /^"/,
            tag:    'string',
            then:   'doctypePublicIdQQ'
        },
        {
            regex:  /^'/,
            tag:    'string',
            then:   'doctypePublicIdQ'
        },
        {
            regex:  /^>/,
            tag:    'error',
            then:   'start'
        },
        {
            regex:  /^./,
            tag:    'error',
            then:   'bogusDoctype'
        }
    ],

    // 10.2.4.59 DOCTYPE public identifier (double-quoted) state
    doctypePublicIdQQ: [
        {
            regex:  /^"/,
            tag:    'string',
            then:   'afterDoctypePublicId'
        },
        {
            regex:  /^>/,
            tag:    'error',
            then:   'start'
        },
        {
            regex:  /^[^>"]+/,
            tag:    'string'
        }
    ],

    // 10.2.4.60 DOCTYPE public identifier (single-quoted) state
    doctypePublicIdQ: [
        {
            regex:  /^'/,
            tag:    'string',
            then:   'afterDoctypePublicId'
        },
        {
            regex:  /^>/,
            tag:    'error',
            then:   'start'
        },
        {
            regex:  /^[^>']+/,
            tag:    'string'
        }
    ],

    // 10.2.4.61 After DOCTYPE public identifier state
    afterDoctypePublicId: [
        {
            regex:  /^\s/,
            tag:    'plain',
            then:   'betweenDoctypePublicAndSystemIds'
        },
        {
            regex:  /^>/,
            tag:    'directive',
            then:   'start'
        },
        {
            regex:  /^"/,
            tag:    'error',
            then:   'doctypeSystemIdQQ'
        },
        {
            regex:  /^'/,
            tag:    'error',
            then:   'doctypeSystemIdQ'
        },
        {
            regex:  /^./,
            tag:    'error',
            then:   'bogusDoctype'
        }
    ],

    // 10.2.4.62 Between DOCTYPE public and system identifiers state
    betweenDoctypePublicAndSystemIds: [
        {
            regex:  /^\s+/,
            tag:    'plain',
            then:   'betweenDoctypePublicAndSystemIds'
        },
        {
            regex:  /^>/,
            tag:    'directive',
            then:   'start'
        },
        {
            regex:  /^"/,
            tag:    'string',
            then:   'doctypeSystemIdQQ'
        },
        {
            regex:  /^'/,
            tag:    'string',
            then:   'doctypeSystemIdQ'
        },
        {
            regex:  /^./,
            tag:    'error',
            then:   'bogusDoctype'
        }
    ],

    // 10.2.4.63 After DOCTYPE system keyword state
    afterDoctypeSystemKeyword: [
        {
            regex:  /^\s/,
            tag:    'plain',
            then:   'beforeDoctypeSystemId'
        },
        {
            regex:  /^"/,
            tag:    'error',
            then:   'doctypeSystemIdQQ'
        },
        {
            regex:  /^'/,
            tag:    'error',
            then:   'doctypeSystemIdQ'
        },
        {
            regex:  /^>/,
            tag:    'error',
            then:   'start'
        },
        {
            regex:  /^./,
            tag:    'error',
            then:   'bogusDoctype'
        }
    ],

    // 10.2.4.64 Before DOCTYPE system identifier state
    beforeDoctypeSystemId: [
        {
            regex:  /^\s+/,
            tag:    'plain',
            then:   'beforeDoctypeSystemId'
        },
        {
            regex:  /^"/,
            tag:    'string',
            then:   'doctypeSystemIdQQ'
        },
        {
            regex:  /^'/,
            tag:    'string',
            then:   'doctypeSystemIdQ'
        },
        {
            regex:  /^>/,
            tag:    'error',
            then:   'start'
        },
        {
            regex:  /./,
            tag:    'error',
            then:   'bogusDoctype'
        }
    ],

    // 10.2.4.65 DOCTYPE system identifier (double-quoted) state
    doctypeSystemIdQQ: [
        {
            regex:  /^"/,
            tag:    'string',
            then:   'afterDoctypeSystemId'
        },
        {
            regex:  /^>/,
            tag:    'error',
            then:   'start'
        },
        {
            regex:  /^[^">]+/,
            tag:    'string'
        }
    ],

    // 10.2.4.66 DOCTYPE system identifier (single-quoted) state
    doctypeSystemIdQ: [
        {
            regex:  /^'/,
            tag:    'string',
            then:   'afterDoctypeSystemId'
        },
        {
            regex:  /^>/,
            tag:    'error',
            then:   'start'
        },
        {
            regex:  /^[^'>]+/,
            tag:    'string'
        }
    ],

    // 10.2.4.67 After DOCTYPE system identifier state
    afterDoctypeSystemId: [
        {
            regex:  /^\s+/,
            tag:    'plain'
        },
        {
            regex:  /^>/,
            tag:    'directive',
            then:   'start'
        },
        {
            regex:  /^./,
            tag:    'error',
            then:   'bogusDoctype'
        }
    ],

    // 10.2.4.68 Bogus DOCTYPE state
    bogusDoctype: [
        {
            regex:  /^>/,
            tag:    'directive',
            then:   'start'
        },
        {
            regex:  /^[^>]+/,
            tag:    'directive'
        }
    ]
};

createTagStates('normal', 'start');
createTagStates('script', 'start js:start:</script>');

/**
 * This syntax engine exposes an HTML parser modeled on the WHATWG HTML 5
 * specification.
 */
exports.HTMLSyntax = new StandardSyntax(states, [ 'js' ]);

