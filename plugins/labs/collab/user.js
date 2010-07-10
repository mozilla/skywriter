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

var $ = require("jquery").$;
var server = require('bespin_server').server;
var util = require('collab:util');

var userDataCache = {};

// well-known urls
var urlDict = {
	avatar: {
		url: 'http://www.gravatar.com/avatar/{email_md5}?s={size}',
		def: 'http://www.gravatar.com/avatar/default?s={size}'
	},
	ohloh_link: {
		url: 'https://www.ohloh.net/accounts/{email_md5}?ref=Detailed',
		def: 'javascript:alert("Information on this user is not available yet");return false'	// hack
	},
	ohloh_badge: {
		url: 'https://www.ohloh.net/accounts/{email_md5}/widgets/account_detailed.gif',
		def: ''
	}
}

/**
 * Check if user data is available
 */
exports.getUserDataIfAvailable = function (username) {
	return userDataCache[username];
}

/**
 * Get url for a given user.
 */
exports.interpolateUrl = function (username, str, extra) {
	if (typeof str == 'string') {
		str = urlDict[str];
	}
	if (userDataCache.hasOwnProperty(username)) {
		if (userDataCache[username]) {
			return util.replace(str.url, extra ? util.delegate(userDataCache[username], extra) : userDataCache[username]);
		}
	} else {
		// fetch user's data
		fetchUserData(username);
	}
	// return the default
	return extra ? util.replace(str.def, extra) : str.def;
};

/**
 * Get an avatar image for a given user.
 */
exports.getAvatarImageUrl = function (username, size) {
	size = size || 80;
	return exports.interpolateUrl(username, 'avatar', {size: size});
};

/**
 * Get an ohloh link for a given user.
 */
exports.getOhlohLink = function (username) {
	return exports.interpolateUrl(username, 'ohloh_link');
};

/**
 * Get an ohloh badge for a given user.
 */
exports.getOhlohBadgeUrl = function (username) {
	return exports.interpolateUrl(username, 'ohloh_badge');
};

/**
 * fetch user data from server
 */
function fetchUserData (username) {
	userDataCache[username] = null;	// prevent others from fetching
	getUserData(username, {
		evalJSON: true,
		onSuccess: function(userdata) {
			userDataCache[username] = userdata;
			var gravatar   = exports.interpolateUrl(username, 'avatar', {size: ''});
			var ohlohLink  = exports.interpolateUrl(username, 'ohloh_link');
			var ohlohBadge = exports.interpolateUrl(username, 'ohloh_badge');
			$('.social_user_name_' + username).each(function () {
				switch (this.tagName.toLowerCase()) {
					case 'img':
						this.src = gravatar + this.width;
						var parent = this.parentNode;
						if (parent && parent.tagName.toLowerCase() == 'a'){
							parent.href = ohlohLink;
						}
						break;
					case 'div':
						$(this).find('img.social_user_avatar').each(function () {
							this.src = gravatar + this.width;
							var parent = this.parentNode;
							if (parent && parent.tagName.toLowerCase() == 'a'){
								parent.href = ohlohLink;
							}
						});
						$(this).find('img.social_user_ohloh_badge').each(function () {
							this.src = ohlohBadge;
							var parent = this.parentNode;
							if (parent && parent.tagName.toLowerCase() == 'a'){
								parent.href = ohlohLink;
							}
							if (parent && parent.style.display == 'none'){
								parent.style.display = '';
							}
						});
				}
			});
		}
	});
}

/**
 * get user data from server
 */
function getUserData (username, opts) {
    server.request('GET', '/register/userdata/' + username, null, opts);
};
