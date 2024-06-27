const crypto = require('crypto');

function jwtGenerator() {
  return crypto.randomBytes(64).toString('hex');
}

console.log(jwtGenerator());