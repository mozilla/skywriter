---
layout: default
title: Bespin Plugin Guide
subtitle: Editor API
---

## Introduction ##

The Bespin editor provides various functions for interaction. If you have the
environment (env) variable you can access the current editor via

    :::js
    var editor = env.editor;

For example, a basic command function looks like this:

    :::js
    exports.upperCaseCommand = function(env, args, request) {
        // Get the editor instance from the environment variable.
        var editor = env.editor;
        // Replace the selected text with the current selected text, where
        // the current selected text is transformed to upper case.
        editor.selectedText = editor.selectedText.toUpperCase();
    };

## Setter & Getter API ##
<br>
get editor.focus
:   returns true if the editor has the focus, false otherwise.

set editor.focus = `hasFocus`
:   if `hasFocus` is true, the editor is focused, otherwise the editor loses focus.

get editor.readOnly
:   returns true if the editor is readOnly, false otherwise.

set editor.readOnly = `isReadOnly`
:   if `isReadOnly` is true, the editor's content can't get changed, otherwise it can.

get editor.selection
:   returns the currently selected range.

set editor.selection = `newRange`
:   sets the currently selected range to.

get editor.selectedText
:   returns the currently selected text.

set editor.selectedText = `newText`
:   replaces the current selected text with `newText` and moves the cursor at the end of `newText`.
    Returns true if the change was performed, otherwise false.

get editor.value
:   returns the current text.

set editor.value = `newValue`
:   sets the value of the current text. Returns true if the change was performed,
otherwise false.

get editor.syntax
:   returns the initial syntax highlighting context (i.e. the language).

set editor.syntax = `newSyntax`
:   sets the initial syntax highlighting context (i.e. the language).

## Function API ##
<br>
editor.replace(`range`, `newText`, `keepSelection`)
:   replaces the range of text with newText. If keepSelection is true, the
    current selection is maintained otherwise the cursor will jump to the end
    of `newText`. Returns true if the change was performed, otherwise false.

editor.setCursor(`newPosition`)
:   moves the cursor to `newPosition`.

editor.setLineNumber(`lineNumber`)
:   scrolls and moves the cursor to the given `lineNumber`.

editor.getText(`range`)
:   returns the text within `range`.

editor.setSetting(`key`, `newValue`)
:   changes the setting `key` to value `newValue`.

editor.getSetting(`key`)
:   returns the value of the setting `key`.

editor.changeGroup(`func`)
:   performs `func` within one change group. This means, that all the actions
    performed by `func` result in one undo/redo action. Returns true if the change
    was performed, otherwise false.

Example:

    :::js
    editor.changeGroup(function(editor) {
       editor.value = 'Hello';
       editor.selectedText = ' World';
    });

These are two performed actions, but as they are grouped as one change and
are one change in the undo/redo manager.

## Events ##
Listening to an event work like this:

    :::js
    editor.selectionChanged.add(function(newSelection) {
        console.log('selectionChanged', JSON.stringify(newSelection));
    });

editor.textChanged: (oldRange, newRange, newText)
:   Fired whenever the value changed.

editor.selectionChanged: (newSelection)
:   Fired whenever the selection changed.
