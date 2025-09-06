# Hreftypes

[![NPM version](https://badge.fury.io/js/hreftypes.svg)](http://badge.fury.io/js/hreftypes)
[![Build Status](https://travis-ci.org/assetgraph/hreftypes.svg?branch=master)](https://travis-ci.org/assetgraph/hreftypes)
[![Coverage Status](https://img.shields.io/coveralls/assetgraph/hreftypes.svg)](https://coveralls.io/r/assetgraph/hreftypes?branch=master)
[![Dependency Status](https://david-dm.org/assetgraph/hreftypes.svg)](https://david-dm.org/assetgraph/hreftypes)

Hreftypes helps you determine if a href is of type `absolute`, `protocolRelative`, `rootRelative`, `relative` or `inline`. This can be useful while resolving URI's across different types of assets in a website dependency graph.

## Installation

```
npm install --save- hreftypes
```

## Usage

```js
const assert = require('assert');
const { hrefTypes, getHrefType } = require('hreftype');

assert(getHrefType('http://foo.com') === hrefTypes.ABSOLUTE);
assert(getHrefType('https://foo.com') === hrefTypes.ABSOLUTE);
assert(getHrefType('//foo.com') === hrefTypes.PROTOCOL_RELATIVE);
assert(getHrefType('/foo.com') === hrefTypes.ROOT_RELATIVE);
assert(getHrefType('foo.com') === hrefTypes.RELATIVE);
assert(getHrefType('data:text/html,<h1>Hi</h1>') === hrefTypes.INLINE);
```

## License

[BSD 3-Clause License](<https://tldrlegal.com/license/bsd-3-clause-license-(revised)>)
