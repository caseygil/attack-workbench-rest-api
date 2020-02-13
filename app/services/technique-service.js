'use strict';

const uuid = require('uuid');
const Technique = require('../models/technique-model');

const errors = {
    missingParameter: 'Missing required parameter',
    badlyFormattedParameter: 'Badly formatted parameter',
    duplicateId: 'Duplicate id',
    notFound: 'Document not found'
};
exports.errors = errors;

exports.retrieveAll = function(callback) {
    Technique.find(function(err, techniques) {
        if (err) {
            return callback(err);
        }
        else {
            return callback(null, techniques);
        }
    });
};

exports.retrieveById = function(stixId, callback) {
    if (stixId) {
        Technique.findById(stixId, function(err, technique) {
            if (err) {
                if (err.name === 'CastError') {
                    const error = new Error(errors.badlyFormattedParameter);
                    error.parameterName = 'stixId';
                    return callback(error);
                }
                else {
                    return callback(err);
                }
            }
            else {
                // Note: document is null if not found
                if (technique) {
                    return callback(null, technique);
                }
                else {
                    return callback();
                }
            }
        });
    }
    else {
        const error = new Error(errors.missingParameter);
        error.parameterName = 'stixId';
        return callback(error);
    }
};

exports.create = function(data, callback) {
    // Create the document
    const technique = new Technique(data);

    technique._id = `attack-pattern--${ uuid.v4()}`;
    technique.stix.id = technique._id;

    // Save the document in the database
    technique.save(function(err, savedTechnique) {
        if (err) {
            if (err.name === 'MongoError' && err.code === 11000) {
                // 11000 = Duplicate index
                const error = new Error(errors.duplicateId);
                return callback(error);
            }
            else {
                return callback(err);
            }
        }
        else {
            return callback(null, savedTechnique);
        }
    });
};
