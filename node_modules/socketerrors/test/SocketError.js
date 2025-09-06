var expect = require('unexpected');
var HttpError = require('httperrors');
var http = require('http');
var socketCodesMap = require('../lib/socketCodesMap');
var SocketError = require('../lib/SocketError');
// Alias to avoid jshint complaints due to capitalized function used without new:
var socketErrorConstructorInLowerCase = SocketError;

describe('SocketError', function () {
    it('will create a properly subclassed instance', function (done) {
        // capture a genuine ECONNREFUSED error
        http.get('http://localhost:59891/').on('error', function (err) {
            var socketError = SocketError(err);
            var httpError = new HttpError[504]();

            expect(socketError, 'to equal', new SocketError[err.code](err));

            // has the original error propeties
            expect(socketError, 'to have properties', Object.keys(err));

            // has the httpError properties
            expect(socketError, 'to have properties', Object.keys(httpError));

            // has named errorCode property
            expect(socketError[err.code], 'to be true');

            expect(socketError, 'to be a', SocketError.SocketError);

            done();
        });
    });

    it('will return unknown error if it was not mapped', function () {
        var err = new Error();
        var socketError = SocketError(err);

        expect(socketError, 'to equal', new SocketError.NotSocketError());

        expect(socketError.code, 'to equal', 'NotSocketError');

        // has named errorCode property
        expect(socketError.NotSocketError, 'to be true');
    });

    it('will not alter the original error', function () {
        var err = new Error();
        err.code = 'ECONNREFUSED';
        var socketError = SocketError(err);

        // assert socketError was altered
        expect(socketError, 'to equal', new SocketError[err.code](err));

        // assert orignal err was untouched
        expect(err, 'not to have properties', ['statusCode']);
    });

    // check the various error codes will be transformed correctly
    Object.keys(socketCodesMap).forEach(function (errorCode) {
        var statusCode = socketCodesMap[errorCode];

        describe(errorCode, function () {
            it('is correctly instantiated', function () {
                var err = new Error();
                err.code = errorCode;
                var socketError = SocketError(err);

                expect(socketError, 'to equal', new SocketError[errorCode](err));

                // has named errorCode property
                expect(socketError[errorCode], 'to be true');
            });

            it('returns a ' + statusCode, function () {
                var socketError = SocketError((function () {
                    var err = new Error();
                    err.code = errorCode;
                    return err;
                })());

                expect(socketError.statusCode, 'to equal', statusCode);
            });

            it('lets the `code` from the original instance take precedence over the one built into the class', function () {
                var err = new Error();
                err.code = 'SOMETHINGELSE';
                var socketError = SocketError(err);

                expect(socketError.code, 'to equal', 'SOMETHINGELSE');
            });

            describe('when instantiated via the constructor', function () {
                it('has a `code` property', function () {
                    expect(new SocketError[errorCode]().code, 'to equal', errorCode);
                });
            });
        });
    });

    it('has the SocketError superclass constructor as the main export', function () {
        expect(new SocketError.ECONNREFUSED(), 'to be a', SocketError);
    });

    it('should create an instance via SocketError(errorCode)', function () {
        expect(socketErrorConstructorInLowerCase('ECONNREFUSED'), 'to be a', SocketError.ECONNREFUSED);
    });

    describe('#supports', function () {
        it('should return true for a mapped socket error code', function () {
            expect(SocketError.supports('ECONNREFUSED'), 'to be true');
        });

        it('should return false for an unmapped socket error code', function () {
            expect(SocketError.supports('FOOBAR'), 'to be false');
        });

        it('should return true for a unmapped socket error instance', function () {
            var fakeSocketError = new Error('ECONNREFUSED');
            fakeSocketError.code = 'ECONNREFUSED';
            expect(SocketError.supports(fakeSocketError), 'to be true');
        });

        it('should return false for a unmapped socket error instance', function () {
            var fakeSocketError = new Error('FOOBAR');
            fakeSocketError.code = 'FOOBAR';
            expect(SocketError.supports(fakeSocketError), 'to be false');
        });
    });

    it('should produce instances that have a falsy http property, despite being inherited from HttpError', function () {
        expect(new SocketError.ECONNREFUSED().http, 'to be falsy');
    });

    it('should produce instances that have a falsy HttpError property, despite being inherited from HttpError', function () {
        expect(new SocketError.ECONNREFUSED().HttpError, 'to be falsy');
    });
});
