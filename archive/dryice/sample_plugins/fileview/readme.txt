
How to use Closure with Skywriter
------------------------------

This is a quick sample of how Closure can be used with Skywriter.

It creates a very simple File Explorer, allowing you to look at your Skywriter
files. In addition to the files in this plugin, there are 2 other changes that
are required:
- Add closure to your page. The diff to static/index.html below is an example
of how this can be done. It is likely that these changes will already be current
in your environment, otherwise checkout closure into the static directory.
- Tell Skywriter about the new plugin. The mechanism for doing this is new and
currently being fleshed out. The diff to appconfig below currently works, but
might break in the future. Also it is likely there is likely to soon be a less
hacky way to do this. Check the docs to see the status of customizing the editor


diff -r 3a9c1da28aab plugins/supported/appconfig/index.js
--- a/plugins/supported/appconfig/index.js  Thu May 20 18:16:16 2010 +0100
+++ b/plugins/supported/appconfig/index.js  Thu May 20 18:23:23 2010 +0100
@@ -131,6 +131,9 @@
         config.objects.commandLine = {
         };
     }
+    if (!config.objects.fileView && catalog.plugins.fileview) {
+        config.objects.fileView = { };
+    }
 
     if (config.gui === undefined) {
         config.gui = {};
@@ -159,6 +162,10 @@
             height: 300
         };
     }
+    if (!config.gui.east && config.objects.fileView
+            && !alreadyRegistered.fileView) {
+        config.gui.east = { component: "fileView" };
+    }
 };
 
 exports.launchEditor = function(config) {
diff -r 3a9c1da28aab static/index.html
--- a/static/index.html Thu May 20 18:16:16 2010 +0100
+++ b/static/index.html Thu May 20 18:23:23 2010 +0100
@@ -10,11 +10,18 @@
       margin: 0;
     }
   </style>
+  <link rel="stylesheet" href="closure/closure/goog/demo/css/demo.css">
+  <link rel="stylesheet" href="closure/closure/goog/css/tree.css">
 </head>
 <body class="skywriter">
   <div id="_skywriter_loading">Loading...</div>
   <script type="text/javascript" src="tiki.js"></script>
   <script type="text/javascript" src="plugin/register/boot"></script>
+  <script src="closure/closure/goog/base.js"></script>
+  <script>
+    goog.require('goog.dom');
+    goog.require('goog.ui.tree.TreeControl');
+  </script>
   <script type="text/javascript" src="boot.js"></script>
 </body>
 </html>
