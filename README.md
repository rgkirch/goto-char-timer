Only 238 lines of code!!

# goto-char-timer

like emacs avy-goto-char-timer

you can jump the cursor to anywhere

activate the extension

quickly type the text where you want the cursor to go to

after a pause, the extension will add an overlay to all the matches

type the text in the overlay

then the cursor jumps to the begining of that match

## Features

There are other similar extensions but I didn't find any that worked the way I wanted.

## Requirements

## Extension Settings

TODO timeout

TODO character set to use for jump completions

e.g.

This extension contributes the following settings:

* `gotoCharTimer.timeout`: Enable/disable this extension.
* `gotoCharTimeout.charset`: e.g. `asdfghjkl` for homerow or `aoeuidhtns` for dvorak homerow. defaults to `abcdefghijklmnopqrstuvwxyz`

## Known Issues

### messes up marked regions
when it jumps the cursor, it creates a new selected region start and end. it should not do that...

## Release Notes

### 1.0.0

Initial release.

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
