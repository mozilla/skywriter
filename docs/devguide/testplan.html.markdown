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

## Bespin Embedded ##

Start by creating a new release:

    paver release_embed

You'll find the release in `tmp/BespinEmbedded-VERSION/`. Next, you'll want 
to make sure the release works. Make sure that you're in the virtualenv (you 
should see `(bespinclient)` at the beginning of your command prompt).
If you aren't in the virtualenv, run

    source bin/activate

Once you're set, you can take a look at the sample.html:

    cd tmp/BespinEmbedded-VERSION
    static . localhost:8080

Point your web browser at [http://localhost:8080/sample.html](http://localhost:8080/sample.html) [^1].

Make sure that the **editor displays fine** and that you can **successfully resize 
the window** without any strange effects.

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
    in Safari.

[Release Notes]: ../releases/index.html
