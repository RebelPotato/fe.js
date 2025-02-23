# fe.js:  Simple extensible effects in javascript

A simple & not too slow implementation of extensible effects.

## Notable Points

* < 200 loc (currently at 120 loc)
* constant time&space handling (continuation as a data structure)
* untyped. You should remember what effects your program has!

## Usage

Copy `fe.js` into your project. See `examples.js` (or run `index.html` in a server) for examples.

## Details

This is a simple-minded implementation of extensible effects ([freer monads](https://okmij.org/ftp/Haskell/extensible/index.html)), as described in [Freer monads, more extensible effects](https://dl.acm.org/doi/10.1145/2804302.2804319).
