const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

process.env.JWT_SECRET = 'test-secret';

const runAuth = (authorization) => {
  const req = { header: () => authorization };
  const result = { nextCalled: false };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };

  auth(req, res, () => {
    result.nextCalled = true;
  });

  return { req, result };
};

test('authorizes a bearer token and exposes the nested user', () => {
  const token = jwt.sign({ user: { id: 'user-123' } }, process.env.JWT_SECRET);
  const { req, result } = runAuth(`Bearer ${token}`);

  assert.equal(result.nextCalled, true);
  assert.equal(req.user.id, 'user-123');
});

test('rejects a missing bearer token', () => {
  const { result } = runAuth(undefined);

  assert.equal(result.statusCode, 401);
  assert.equal(result.body.msg, 'No token, authorization denied');
});