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
    "depends": [
        "AppSupport", "CommandLine", "Editor", "UserIdent", "Settings",
        "PluginDev"
    ],
    "provides": [
        {
            "ep":       "factory",
            "name":     "applicationcontroller",
            "pointer":  "#applicationController",
            "action":   "create"
        },
        {
            "ep": "factory",
            "name": "view",
            "pointer": "#view",
            "action": "value"
        },
        {
            "ep": "factory",
            "name": "model",
            "pointer": "#model",
            "action": "value"
        }
    ]
});
"end";

var SC = require('sproutcore/runtime').SC;
var CliInputView = require('CommandLine:views/cli').CliInputView;
var DockView = require('bespin:views/dock').DockView;
var EditorView = require('Editor:views/editor').EditorView;
var KeyListener = require('AppSupport:views/keylistener').KeyListener;

var INITIAL_TEXT;   // defined at the end of the file to reduce ugliness

exports.applicationController = SC.Object.extend({
    _application: SC.Application.extend(),

    _mainPage: SC.Page.extend({
        mainPane: SC.MainPane.design({
            applicationView: DockView.design({
                centerView: EditorView.design(),
                dockedViews: [ CliInputView.design() ]
            }),
            childViews: 'applicationView'.w(),
            defaultResponder: KeyListener.create(),
            layout: { centerX: 0, centerY: 0, width: 640, height: 480 }
        })
    }),

    init: function() {
        arguments.callee.base.apply(this, arguments);

        this._application = this._application.create();

        var mainPage = this._mainPage.create();
        this._mainPage = mainPage;

        var mainPane = mainPage.get('mainPane');
        mainPane.setPath('applicationView.centerView.layoutManager.' +
            'textStorage.value', INITIAL_TEXT);
        mainPane.append();
        exports.view = mainPane.getPath("applicationView.centerView.textView");
        exports.model = mainPane.getPath('applicationView.centerView.layoutManager.' +
            'textStorage');
    }
});

INITIAL_TEXT =
"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc mollis massa mauris. Donec ipsum neque, molestie quis\nelementum a, lacinia lobortis massa. Fusce at nisl est. Aliquam quam nisl, mattis ac bibendum ut, iaculis in velit.\nPraesent lectus elit, dignissim ut scelerisque a, pretium ut nisl. Proin consectetur tincidunt convallis. Cras libero\nsem, lobortis vitae blandit eu, volutpat id arcu. Morbi non risus pretium risus rhoncus pulvinar. Sed consectetur\nsagittis turpis, ut pellentesque turpis ultrices non. Sed vulputate turpis sed odio laoreet ut vulputate massa\nsagittis. Praesent eu molestie libero. In a magna et nulla luctus mollis. Morbi vitae nulla a orci egestas ornare eget\nvitae lorem. Morbi malesuada, purus nec eleifend convallis, dolor felis fringilla dolor, ac scelerisque nisi ipsum et\nquam. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vivamus et nisi\nmetus. Aenean tortor metus, dapibus a placerat eget, cursus et libero. Lorem ipsum dolor sit amet, consectetur\nadipiscing elit. Mauris pellentesque adipiscing massa, a feugiat neque auctor non. Ut condimentum varius diam vitae\nviverra.\n\nSuspendisse sed sem turpis, et tincidunt enim. Mauris vel nunc sit amet purus gravida mollis. Aliquam ante elit, congue\nat porta id, volutpat id tellus. Maecenas scelerisque tristique enim, nec eleifend nisi condimentum quis. Vivamus porta\nleo at ligula ullamcorper mollis. Nullam congue massa et lorem varius id elementum sem tempus. Praesent dui orci,\npulvinar a tristique in, dictum vel quam. Ut tincidunt, elit ac posuere suscipit, turpis ante accumsan neque, at\nvehicula mi velit eleifend libero. Ut non magna elit, sed mollis est. Integer neque nunc, condimentum nec facilisis\nvitae, rutrum non justo. Morbi ullamcorper rutrum est, in tristique elit pulvinar ac. Proin orci enim, sagittis eget\nlaoreet vel, porttitor at neque. Sed scelerisque metus a lorem egestas venenatis. Fusce at enim neque. Suspendisse\niaculis varius lorem, at dignissim lorem dictum non. Sed ac auctor purus. Morbi ante eros, posuere ac viverra sed,\ndignissim a felis.\n\nVivamus sapien tortor, ultrices sit amet vestibulum non, ornare id leo. Mauris at nibh ligula. Vivamus faucibus\nvehicula mi, a malesuada ante rhoncus non. Cras lorem sapien, elementum in commodo vitae, tempus sit amet nisi. Nullam\nut mattis odio. Morbi condimentum ipsum ac sapien consectetur ut porttitor ipsum iaculis. Maecenas hendrerit dictum\ndiam, sed aliquet metus euismod nec. Praesent a felis turpis, id tempus dui. Integer rutrum rhoncus nunc vitae euismod.\nFusce dolor lectus, consectetur consectetur adipiscing ut, lacinia quis justo. Morbi fermentum lorem eu sem blandit vel\nfacilisis felis rhoncus. Suspendisse consectetur bibendum quam eu accumsan.\n\nSed lacinia nisl nulla, posuere tempus tortor. Curabitur quis dictum felis. Phasellus gravida, enim vel molestie\nmalesuada, neque ligula tempus nisl, at ullamcorper dui augue in massa. Pellentesque dui ligula, ultricies non\nhendrerit nec, dapibus ac lorem. Nullam luctus arcu non quam consectetur sed tempus lorem imperdiet. Etiam faucibus\ndictum ipsum at fermentum. Fusce ut ipsum urna. Praesent eget purus vitae mi faucibus vulputate. Aliquam interdum orci\nquis lorem venenatis vel consectetur magna pharetra. Nam non velit elit, et lobortis felis. Donec ultricies eleifend\nleo, eget adipiscing ante malesuada a.\n\nPhasellus lectus nunc, condimentum ac tincidunt bibendum, dignissim et orci. Donec quis leo sapien, at vestibulum\nmetus. Nulla facilisi. Duis suscipit erat at erat blandit viverra. Nunc a est et nulla laoreet adipiscing quis non\nnulla. Donec fermentum bibendum est vel consectetur. Ut varius elit id nisi vehicula scelerisque. Etiam volutpat, orci\nvitae rhoncus dictum, nisl libero adipiscing dui, non placerat leo purus sit amet lacus. Suspendisse potenti. Nunc eros\nleo, dictum quis placerat volutpat, euismod vitae sapien. Pellentesque ultricies consequat auctor. In in velit at dui\nconvallis ultricies. Phasellus nec neque sem. In elementum tincidunt venenatis. Ut imperdiet eros eu elit fermentum\nultrices. Ut ultricies luctus neque eget interdum. Nam aliquam arcu sit amet tortor eleifend consectetur. In ornare\nmolestie dolor, pellentesque viverra orci posuere eget. Proin ultrices, felis ac accumsan suscipit, ligula diam egestas\nmetus, eu placerat quam urna eu eros. Aliquam id nunc ac urna commodo ullamcorper quis ut metus.\n\nDonec fringilla pharetra odio. Aenean interdum tempus sem ut posuere. Ut luctus, nisl sit amet tristique accumsan, quam\nmagna vulputate urna, in varius diam risus et orci. Etiam vitae neque sit amet ligula varius vehicula ut rhoncus\ntellus. In vitae est ipsum. Mauris tincidunt bibendum est eu tincidunt. Phasellus augue eros, pellentesque dignissim\nscelerisque id, commodo accumsan felis. Ut non nunc nulla. Proin eget eros ante. Nunc consectetur libero a leo pretium\nsit amet vehicula augue fringilla. Praesent non nulla ut dolor semper hendrerit pharetra sed lectus. Integer vel nisi\nvitae libero ultricies volutpat sed sit amet risus. Donec lobortis ullamcorper magna sed rhoncus. Cras mollis tortor ac\nmi dapibus fermentum. Ut egestas arcu a felis hendrerit facilisis. Proin tellus libero, blandit id ultrices eu, cursus\nsed nisl.\n\nDuis cursus ligula ut ligula lacinia venenatis. Cras consectetur erat et turpis eleifend scelerisque. Nulla lacus\nmauris, lacinia et luctus consectetur, sollicitudin quis quam. Integer ac felis quam. Mauris lacinia fringilla aliquam.\nPellentesque nibh urna, luctus nec venenatis nec, venenatis eget nisl. Fusce euismod sodales scelerisque. Nullam\nsodales venenatis fringilla. Praesent commodo justo vel diam dictum lobortis. Nulla sagittis tempor velit in commodo.\nQuisque pharetra cursus dapibus. Maecenas volutpat urna in tellus pulvinar posuere. Vestibulum hendrerit vulputate\nquam, nec mollis mauris scelerisque eu. Vestibulum id ligula augue, eget consectetur nulla. Aliquam convallis laoreet\nvulputate. Nulla non pulvinar nulla. Vivamus quis metus non orci facilisis fringilla quis a dolor.\n\nQuisque eget eleifend ante. Sed posuere, velit sed laoreet accumsan, nulla felis auctor dui, sit amet porta nunc nunc\nid felis. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus vel neque ipsum, pretium mollis nisi. Nunc\nbibendum fermentum turpis a lacinia. Ut nec purus elit. Cras et lacus quis velit dictum consequat. Vivamus euismod,\nmagna non ultrices euismod, lectus leo sollicitudin dui, at aliquet diam elit vel nibh. Duis non enim vel nisl\nsollicitudin tincidunt eget vel eros. Praesent varius, enim id imperdiet hendrerit, nisl lectus aliquam dui, vel\npharetra urna leo quis est. Suspendisse placerat dolor a lectus gravida porta eget non eros. Vestibulum felis nulla,\nsuscipit ut iaculis quis, eleifend eget mi. Vivamus in iaculis erat. Sed eros purus, viverra eu consequat et, tempor\nquis ligula.\n\nMaecenas vel augue in sem vulputate interdum vitae ac mauris. Suspendisse vulputate lobortis felis, quis porta leo\nhendrerit nec. Ut turpis quam, laoreet a sodales non, bibendum ac arcu. Pellentesque habitant morbi tristique senectus\net netus et malesuada fames ac turpis egestas. Etiam metus dolor, sagittis vel elementum nec, vulputate sed ante.\nPraesent dolor eros, posuere et pellentesque id, dictum id orci. Cras bibendum volutpat nulla et pulvinar. Fusce\nfaucibus sem sit amet elit tristique commodo. Vestibulum augue metus, posuere quis rhoncus in, pretium quis nunc.\nSuspendisse nunc massa, adipiscing vel ultrices ac, faucibus ac mi. Nullam in felis at lorem pulvinar adipiscing. Proin\nnon lectus at odio congue ornare eget ac turpis. Curabitur augue lacus, aliquet ullamcorper molestie sed, sollicitudin\neu quam.\n\nNunc pretium pulvinar convallis. Ut cursus molestie lobortis. In ornare, purus a malesuada iaculis, velit nulla\ninterdum magna, ut semper felis nisl vitae neque. Suspendisse sit amet orci mauris, id congue nunc. Suspendisse aliquet\nviverra arcu, at congue nulla elementum a. Aliquam felis lectus, faucibus eu suscipit eget, mollis et lorem. Fusce sit\namet tortor ligula, quis feugiat elit. Sed volutpat ornare risus et lacinia. Curabitur placerat enim non ipsum lobortis\nac congue purus porta. Donec nec mauris ac eros commodo consequat. Aliquam aliquam, diam id pellentesque tincidunt,\nlacus eros fermentum quam, et facilisis nunc nulla at ipsum. Vestibulum vitae quam non nisl blandit aliquam sit amet at\nleo. Nam porttitor mollis varius. Curabitur imperdiet sem et odio hendrerit id vulputate orci pharetra. Vivamus auctor\njusto id ligula dapibus varius. Nullam velit enim, rhoncus in venenatis sed, facilisis nec ante. Sed rhoncus tellus in\nligula pretium hendrerit. Suspendisse pharetra consequat orci, sit amet blandit magna feugiat et. Sed mattis tortor at\njusto euismod consectetur.\n\n";

