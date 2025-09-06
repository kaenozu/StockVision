/* global describe, it */
var expect = require('unexpected')
  .clone()
  .use(require('magicpen-prism'))
  .use(require('unexpected-function-equality'));

var esanimate = require('../lib/esanimate');

expect.addAssertion('<any> to convert to [canonical] ast <object>', function(
  expect,
  subject,
  value
) {
  expect(
    esanimate.astify(subject, expect.flags.canonical),
    'to exhaustively satisfy',
    value
  );
});

expect.addAssertion('to convert to object', function(expect, subject, value) {
  expect(esanimate.objectify(subject), 'to equal', value);
});

expect.addAssertion('to be converted from ast', function(
  expect,
  subject,
  value
) {
  expect(esanimate.objectify(value), 'to equal', subject);
});

expect.addAssertion('to convert back and forth to', function(
  expect,
  subject,
  value
) {
  return expect
    .it('to convert to ast', value)
    .and('to be converted from ast', value)(subject);
});

describe('esanimate', function() {
  describe('#astify', function() {
    it('should support the canonicalize option', function() {
      expect({ b: 456, a: [1, 2] }, 'to convert to canonical ast', {
        type: 'ObjectExpression',
        properties: [
          {
            type: 'Property',
            kind: 'init',
            key: { type: 'Identifier', name: 'a' },
            value: {
              type: 'ArrayExpression',
              elements: [
                { type: 'Literal', value: 1 },
                { type: 'Literal', value: 2 }
              ]
            }
          },
          {
            type: 'Property',
            kind: 'init',
            key: { type: 'Identifier', name: 'b' },
            value: { type: 'Literal', value: 456 }
          }
        ]
      });
    });
  });

  it('should convert undefined', function() {
    expect(undefined, 'to convert back and forth to', {
      type: 'Identifier',
      name: 'undefined'
    });
  });

  it('should convert null', function() {
    expect(null, 'to convert back and forth to', {
      type: 'Literal',
      value: null
    });
  });

  it('should convert false', function() {
    expect(false, 'to convert back and forth to', {
      type: 'Literal',
      value: false
    });
  });

  it('should convert true', function() {
    expect(true, 'to convert back and forth to', {
      type: 'Literal',
      value: true
    });
  });

  it('should convert string literal', function() {
    expect('foo', 'to convert back and forth to', {
      type: 'Literal',
      value: 'foo'
    });
  });

  it('should convert number literal', function() {
    expect(123, 'to convert back and forth to', {
      type: 'Literal',
      value: 123
    });
  });

  it('should convert array literal', function() {
    expect(['foo', true, [null]], 'to convert back and forth to', {
      type: 'ArrayExpression',
      elements: [
        { type: 'Literal', value: 'foo' },
        { type: 'Literal', value: true },
        {
          type: 'ArrayExpression',
          elements: [{ type: 'Literal', value: null }]
        }
      ]
    });
  });

  it('should convert object literal', function() {
    expect(
      { keyName1: 'stringValue', keyName2: [null, 10] },
      'to convert back and forth to',
      {
        type: 'ObjectExpression',
        properties: [
          {
            type: 'Property',
            kind: 'init',
            key: { type: 'Identifier', name: 'keyName1' },
            value: { type: 'Literal', value: 'stringValue' }
          },
          {
            type: 'Property',
            kind: 'init',
            key: { type: 'Identifier', name: 'keyName2' },
            value: {
              type: 'ArrayExpression',
              elements: [
                { type: 'Literal', value: null },
                { type: 'Literal', value: 10 }
              ]
            }
          }
        ]
      }
    );
  });

  it('should use a Literal for a key that needs quoting', function() {
    expect({ 'needs.quoting': 123 }, 'to convert back and forth to', {
      type: 'ObjectExpression',
      properties: [
        {
          type: 'Property',
          kind: 'init',
          key: { type: 'Literal', value: 'needs.quoting' },
          value: { type: 'Literal', value: 123 }
        }
      ]
    });
  });

  it('should convert regular expression', function() {
    expect(/foobar/gim, 'to convert back and forth to', {
      type: 'Literal',
      value: /foobar/gim
    });
  });

  it('should convert a named function', function() {
    expect(
      function foo(bar, quux) {
        bar(123);
      },
      'to convert back and forth to',
      {
        type: 'FunctionExpression',
        id: { type: 'Identifier', name: 'foo' },
        generator: false,
        expression: false,
        async: false,
        params: [
          { type: 'Identifier', name: 'bar' },
          { type: 'Identifier', name: 'quux' }
        ],
        body: {
          type: 'BlockStatement',
          body: [
            {
              type: 'ExpressionStatement',
              expression: {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: 'bar' },
                arguments: [{ type: 'Literal', value: 123, raw: '123' }]
              }
            }
          ]
        }
      }
    );
  });

  it('should convert an anonymous function', function() {
    expect(
      function(bar) {
        bar();
      },
      'to convert back and forth to',
      {
        type: 'FunctionExpression',
        id: null,
        generator: false,
        expression: false,
        async: false,
        params: [{ type: 'Identifier', name: 'bar' }],
        body: {
          type: 'BlockStatement',
          body: [
            {
              type: 'ExpressionStatement',
              expression: {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: 'bar' },
                arguments: []
              }
            }
          ]
        }
      }
    );
  });
});
