---
title: Bespin Developer's Guide
subtitle: Manual Test Plan
layout: default
---

Before shipping a release, we need to manually check some things out for three 
reasons:

1. It's not always possible or practical to programmatically test things
2. Even when things can be tested automatically, we'll want to be sure that 
   things *look* right
3. The docs still need to be reviewed.

## Automated Tests ##

Within Bespin, you can use the "test" command to run the tests for plugins.

## Browsers To Test In ##

We should test Embedded and server-based code in:

1. Firefox *without Firebug*
2. Chrome
3. Safari

## Bespin Embedded ##

Start by creating a new release:

    paver release_embed

Note: when trying things out in Embedded, it's often *much* faster to avoid the
compression step. You can do this by running

    dryice dropin.json

This is normally run as part of release\_embed.


You'll find the release in `tmp/BespinEmbedded-DropIn-VERSION/` and
`tmp/BespinEmbedded-Customizable-VERSION/`. Next, you'll want 
to make sure the release works. Make sure that you're in the virtualenv (you 
should see `(bespinclient)` at the beginning of your command prompt).
If you aren't in the virtualenv, run

    source bin/activate

Once you're set, you can take a look at the sample.html:

    cd tmp/BespinEmbedded-DropIn-VERSION
    static . localhost:8080

Point your web browser at [http://localhost:8080/samples/sample.html](http://localhost:8080/samples/sample.html) [^1].

Make sure that the **editor displays fine** and that you can **successfully resize 
the window** without any strange effects.

Next, get out of the virtualenv by running:

    deactivate

Then, try to run and test a build:

    cd tmp/BespinEmbedded-Customizable-VERSION
    dryice sample.json
    cd tmp
    static . localhost:8080

Point your web browser at [http://localhost:8080/samples/sample.html](http://localhost:8080/samples/sample.html) [^1].

This editor should work as well.

## Editor Behavior ##

As we use Bespin to edit itself more, there will be less need for this test.
Until that time, we should test common editor behavior:

* Arrows move the insertion point around
* Shift+arrows change the selection
* Alt+arrows move a word at a time
* Home and End move to the beginning and end of the line
* Page Up and Page Down scroll one screenful at a time
* Cmd+X, Cmd+C, Cmd+V perform the appropriate clipboard operations, both into
  and out of the editor
* Basic selection works
* Moving to the edge of the screen while selecting scrolls the editor
* Backspace and delete work appropriately
* HTML and JavaScript are correctly highlighted (for the former, use
  [samples/html.html](http://localhost:8080/samples/html.html)).

## Documentation ##

Finally, run

    paver docs

Compare the [Release Notes][] with [Bugzilla](https://bugzilla.mozilla.org/) to
ensure that everything is covered. This will also give you an idea for the kinds
of documentation changes that would have been required for this release.

**Skim through the docs** to make sure everything looks reasonable for this
release. You should obviously **pay attention to any areas that have changed
in this release** and ensure that they are correct.

[^1]: You can't just open sample.html directly in Firefox, because you'll get 
    a permission denied error. The Python "static" package includes this easy
    command line static file server. You can successfully open sample.html
    in Safari and Chrome.

[Release Notes]: ../releases/index.html
