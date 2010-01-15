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

/**
 * This plug-in manages settings.
 *
 * <p>Some quick terminology: A _Choice_, is something that the application
 * offers as a way to customize how it works. For each _Choice_ there will be
 * a number of _Options_ but ultimately the user will have a _Setting_ for each
 * _Choice_. This _Setting_ maybe the default for that _Choice_.
 *
 * <p>It provides an API for controlling the known settings. This allows us to
 * provide better GUI/CLI support. See choice.js
 * <p>It provides 3 implementations of a setting store:<ul>
 * <li>MemorySettings: i.e. temporary, non-persistent. Useful in textarea
 * replacement type scenarios. See memory.js
 * <li>CookieSettings: Stores the data in a cookie. Generally not practical as
 * it slows client server communication (if any). See cookie.js
 * <li>ServerSettings: Stores data on a server using the <tt>server</tt> API.
 * See server.js
 * </ul>
 * <p>It is expected that an HTML5 storage option will be developed soon. This
 * plug-in did contain a prototype Gears implementation, however this was never
 * maintained, and has been deleted due to bit-rot.
 * <p>This plug-in also provides commands to manipulate the settings from the
 * CommandLine and Canon plug-ins.
 *
 * <p>TODO:<ul>
 * <li>Check what happens when we alter settings from the UI
 * <li>Ensure that values can be bound in a SC sense
 * <li>Convert all subscriptions to bindings.
 * <li>Implement HTML5 storage option
 * <li>Make all settings have a 'description' member and use that in set|unset
 * commands.
 * <li>When the command system is re-worked to include more GUI interaction,
 * expose data in settings to that system.
 * </ul>
 *
 * <p>For future versions of the API it might be better to decrease the
 * dependency on settings, and increase it on the system with a setting.
 * e.g. Now:
 * <pre>
 * choice.addChoice({ name:"foo", ... });
 * settings.values.foo = "bar";
 * </pre>
 * <p>Vs the potentially better:
 * <pre>
 * var foo = choice.addChoice({ name:"foo", ... });
 * foo.value = "bar";
 * </pre>
 * <p>Comparison:
 * <ul>
 * <li>The latter version gains by forcing access to the setting to be through
 * the plug-in providing it, so there wouldn't be any hidden dependencies.
 * <li>It's also more compact.
 * <li>It could provide access to to other methods e.g. <tt>foo.reset()</tt>
 * and <tt>foo.onChange(function(val) {...});</tt> (but see SC binding)
 * <li>On the other hand dependencies are so spread out right now that it's
 * probably hard to do this easily. We should move to this in the future.
 * </ul>
 */
