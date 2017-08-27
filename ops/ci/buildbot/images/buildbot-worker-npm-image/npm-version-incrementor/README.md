# npm-version-incrementor
Increments the patch version of the package in the current directory

## Purpose
 To increment the patch version of a package, so that it can be published.

## Installation
 ```sh
 npm install --save npm-version-incrementor
```

## Usage
There are two ways to use this package:
* `incrementor = require('npm-version-incrementor`)` to use the API.
* Run the script `scripts/npm-version-incrementor.js`, which increments the patch version of the package.

### API
Look in `index.js` and figure out the API. This is the same API used by the `npm-version-incrementor.js` script.

### npm-version-incrementor.js
It does not simply increment the version, because that version may already be in the npm registry. So what it does
is reads all the versions of the package (using `npm view`), finds all the versions with the same major.minor version
as the one in the `package.json`, finds the last one, and increments it by one.

