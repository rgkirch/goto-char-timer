Only 247 lines of code!!



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

### timeout
when typing the text to search for, if you pause for this many milliseconds, any text matching the string will be highlighted

default: 500ms

### charset
character set to use for jump labels

default: abcdefghijklmnopqrstuvwxyz

## Known Issues

### messes up marked regions
when it jumps the cursor, it creates a new selected region start and end. it should not do that...

### lables are longer than they need to be
if there's enough matches to bump up the label length then all lables are longer even though you might have an unambiguous match at a shorter number of characters

