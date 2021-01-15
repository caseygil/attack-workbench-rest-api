'use strict';

const mongoose = require('mongoose');
const AttackObject = require('./attack-object-model');

const identityProperties = {
    // identity specific properties
    name: { type: String, required: true },
    description: String,
    roles: [ String ],
    identity_class: String,
    sectors: [ String ],
    contact_information: String,

    // ATT&CK custom stix properties
    x_mitre_version: String
};

// Create the definition
const identityDefinition = {
    stix: {
        ...identityProperties
    }
};

// Create the schema
const identitySchema = new mongoose.Schema(identityDefinition);

// Create the model
const IdentityModel = AttackObject.discriminator('IdentityModel', identitySchema);

module.exports = IdentityModel;
