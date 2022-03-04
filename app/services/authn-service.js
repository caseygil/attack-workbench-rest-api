'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const NodeCache = require('node-cache');

const config = require('../config/config');
const authnBearer = require('../lib/authn-bearer');

/**
 * Each challenge/apikey pair for a service is cached when the challenge is created. The cached value is used to
 * verify the hashed value provided by the client when requesting a token.
 */
const cache = new NodeCache();

function generateNonce() {
    const stringBase = 'base64';
    const byteLength = 48;
    const buffer = crypto.randomBytes(byteLength);
    const nonce = buffer.toString(stringBase);

    return nonce;
}

const errors = {
    serviceNotFound: 'Service not found',
    invalidChallengeHash: 'Invalid challenge hash',
    challengeNotFound: 'Challenge not found'
};
exports.errors = errors;

exports.createChallenge = function(serviceName) {
    // Verify that the service is on the list of configured services and get the apikey
    const services = config.serviceAuthn.apikey.serviceAccounts;
    const service = services.find(s => s.name === serviceName);
    if (!service) {
        throw new Error(errors.serviceNotFound);
    }

    // Generate the challenge string
    const challenge = generateNonce();

    // Save the challenge string and apikey in the cache
    cache.set(serviceName, { challenge, apikey: service.apikey }, 60);

    // Return the challenge
    return challenge;
}

exports.createToken = function(serviceName, challengeHash) {
    // Get the cached challenge and apikey
    const cachedValue = cache.take(serviceName);
    if (!cachedValue) {
        throw new Error(errors.challengeNotFound);
    }
    const { challenge, apikey } = cachedValue;

    // Generate the hash
    const hmac = crypto.createHmac('sha256', apikey);
    hmac.update(challenge);
    const digest = hmac.digest('hex');

    // Does the generated hash match the hash provided in the request?
    if (digest !== challengeHash) {
        throw new Error(errors.invalidChallengeHash);
    }

    // Create the payload
    const timeout = config.serviceAuthn.apikey.tokenTimeout;
    const payload = {
        serviceName,
        exp: Math.floor(Date.now() / 1000) + timeout
    };

    // Generate the access token and return it
    const token = jwt.sign(payload, config.serviceAuthn.apikey.secret);
    return { token, expiresIn: timeout };
}

/**
 * The bearer strategy requires the Bearer token to be validated for every request. This middleware function
 * checks for the Authorization header, and if present, calls the authenticate() function for the Bearer
 * strategy (which cause the token to be validated).
 *
 * Other strategies authenticate the user through dedicated endpoints and set a session cookie in the browser.
 * Those strategies rely on the existence of the session cookie and the corresponding server session object
 * when authenticating subsequent requests.
 */
exports.authenticate = function(req, res, next) {
    if ((config.serviceAuthn.oidcClientCredentials.enable  || config.serviceAuthn.apikey.enable) && req.get('Authorization')) {
        // Authorization header found
        // Authenticate the user using the Bearer token
        authnBearer.authenticate(req, res, next);
    }
    else if (req.isAuthenticated()) {
        // User has been authenticated using a non-Bearer strategy
        next();
    }
    else {
        return res.status(401).send('Not authorized');
    }
}