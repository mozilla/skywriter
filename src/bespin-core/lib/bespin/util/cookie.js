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

/**
 * Get a cookie value by name
 * @param {String} name The cookie value to retrieve
 * @return The value, or undefined if the cookie was not found
 */
exports.get = function(name) {
    var matches = document.cookie.match(new RegExp("(?:^|; )" +
        dojo.regexp.escapeString(name) + "=([^;]*)"));
    return matches ? decodeURIComponent(matches[1]) : undefined;
};

/**
 * Set a cookie value
 * @param {String} name The cookie value to alter
 * @param {String} value The new value for the cookie
 * @param {Object} props (Optional) cookie properties. One of:<ul>
 * <li>expires: Date|String|Number|null If a number, the number of days from
 * today at which the cookie will expire. If a date, the date past which the
 * cookie will expire. If expires is in the past, the cookie will be deleted.
 * If expires is omitted or is 0, the cookie will expire either directly (ff3)
 * or when the browser closes
 * <li>path: String|null The path to use for the cookie.
 * <li>domain: String|null The domain to use for the cookie.
 * <li>secure: Boolean|null Whether to only send the cookie on secure connections
 * </ul>
 */
exports.set = function(name, value, props) {
    props = props || {};

    if (typeof props.expires == "number") {
        var date = new Date();
        date.setTime(date.getTime() + props.expires * 24 * 60 * 60 * 1000);
        props.expires = date;
    }
    if (props.expires && props.expires.toUTCString) {
        props.expires = props.expires.toUTCString();
    }

    value = encodeURIComponent(value);
    var updatedCookie = name + "=" + value, propName;
    for (propName in props) {
        updatedCookie += "; " + propName;
        var propValue = props[propName];
        if (propValue !== true) {
            updatedCookie += "=" + propValue;
        }
    }

    document.cookie = updatedCookie;
};

/**
 * Remove a cookie by name. Depending on the browser, the cookie will either
 * be deleted directly or at browser close.
 * @param {String} name The cookie value to retrieve
 */
exports.remove = function(name) {
    exports.set(name, "", { expires: -1 });
};

/**
 * Use to determine if the current browser supports cookies or not.
 * @return Returns true if user allows cookies, false otherwise
 */
exports.isSupported = function() {
    if (!("cookieEnabled" in navigator)) {
        exports.set("__djCookieTest__", "CookiesAllowed");
        navigator.cookieEnabled = exports.get("__djCookieTest__") == "CookiesAllowed";
        if (navigator.cookieEnabled) {
            exports.remove("__djCookieTest__");
        }
    }
    return navigator.cookieEnabled;
};
