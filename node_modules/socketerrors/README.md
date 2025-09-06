node-socketerrors
=================

[![NPM version](https://badge.fury.io/js/socketerrors.svg)](http://badge.fury.io/js/socketerrors)
[![Build Status](https://travis-ci.org/alexjeffburke/node-socketerrors.svg?branch=master)](https://travis-ci.org/alexjeffburke/unode-socketerrors)

Exposes a function mapping socket errors to SocketError objects.

The defined SocketError objects are created via
<a href="https://github.com/One-com/node-createerror">createerror</a>.

Installation
------------

Make sure you have node.js and npm installed, then run:

    npm install socketerrors

Usage
-----

The primary use case is wrapping errors originating from socket operations:

    var http = require('http');
    var socketErrors = require('socketerrors');

    http.get('nonexistent').on('error', function (err) {
        var socketError = socketErrors(err);

        console.warn(socketError.toString()); // ECONNREFUSED: connect ECONNREFUSED
    });


Other errors will be marked as not being socket errors:

    var socketErrors = require('socketerrors');

    var err = new Error();
    var socketError = socketErrors(err);

    if (socketError.NotSocketError) {
        // what am I?
    }

Mappings
--------

The following is a list of socket errors mapped by this module:

* EADDRINFO
* ECONNABORTED
* ECONNREFUSED
* ECONNRESET
* ENETDOWN
* ENETRESET
* ENETUNREACH
* ETIMEDOUT

License
-------

3-clause BSD license -- see the `LICENSE` file for details.
