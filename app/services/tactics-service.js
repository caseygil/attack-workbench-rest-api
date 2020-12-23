'use strict';

const uuid = require('uuid');
const Tactic = require('../models/tactic-model');

const errors = {
    missingParameter: 'Missing required parameter',
    badlyFormattedParameter: 'Badly formatted parameter',
    duplicateId: 'Duplicate id',
    notFound: 'Document not found',
    invalidQueryStringParameter: 'Invalid query string parameter'
};
exports.errors = errors;

exports.retrieveAll = function(callback) {
    Tactic.find(function(err, tactics) {
        if (err) {
            return callback(err);
        }
        else {
            return callback(null, tactics);
        }
    });
};

exports.retrieveById = function(stixId, versions, callback) {
    // versions=all Retrieve all tactics with the stixId
    // versions=latest Retrieve the tactics with the latest modified date for this stixId

    if (!stixId) {
        const error = new Error(errors.missingParameter);
        error.parameterName = 'stixId';
        return callback(error);
    }

    if (versions === 'all') {
        Tactic.find({'stix.id': stixId}, function (err, tactics) {
            if (err) {
                if (err.name === 'CastError') {
                    const error = new Error(errors.badlyFormattedParameter);
                    error.parameterName = 'stixId';
                    return callback(error);
                } else {
                    return callback(err);
                }
            } else {
                return callback(null, tactics);
            }
        });
    }
    else if (versions === 'latest') {
        Tactic.findOne({ 'stix.id': stixId }, function(err, tactic) {
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
                if (tactic) {
                    return callback(null, [ tactic ]);
                }
                else {
                    return callback(null, []);
                }
            }
        });
    }
    else {
        const error = new Error(errors.invalidQueryStringParameter);
        error.parameterName = 'versions';
        return callback(error);
    }
};

exports.retrieveVersionById = function(stixId, modified, callback) {
    // Retrieve the versions of the tactic with the matching stixId and modified date

    if (!stixId) {
        const error = new Error(errors.missingParameter);
        error.parameterName = 'stixId';
        return callback(error);
    }

    if (!modified) {
        const error = new Error(errors.missingParameter);
        error.parameterName = 'modified';
        return callback(error);
    }

    Tactic.findOne({ 'stix.id': stixId, 'stix.modified': modified }, function(err, tactic) {
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
            if (tactic) {
                return callback(null, tactic);
            }
            else {
                console.log('** NOT FOUND')
                return callback();
            }
        }
    });
};

exports.create = function(data, callback) {
    // This function handles two use cases:
    //   1. stix.id is undefined. Create a new object and generate the stix.id
    //   2. stix.id is defined. Create a new object with the specified id. This is
    //      a new version of an existing object.
    //      TODO: Verify that the object already exists (?)

    // Create the document
    const tactic = new Tactic(data);

    if (!tactic.stix.id) {
        // Assign a new STIX id
        tactic.stix.id = `x-mitre-tactic--${uuid.v4()}`;
    }

    // Save the document in the database
    tactic.save(function(err, savedTactic) {
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
            return callback(null, savedTactic);
        }
    });
};

exports.updateFull = function(stixId, stixModified, data, callback) {
    if (!stixId) {
        const error = new Error(errors.missingParameter);
        error.parameterName = 'stixId';
        return callback(error);
    }

    if (!stixModified) {
        const error = new Error(errors.missingParameter);
        error.parameterName = 'modified';
        return callback(error);
    }

    Tactic.findOne({ 'stix.id': stixId, 'stix.modified': stixModified }, function(err, document) {
        if (err) {
            if (err.name === 'CastError') {
                var error = new Error(errors.badlyFormattedParameter);
                error.parameterName = 'stixId';
                return callback(error);
            }
            else {
                return callback(err);
            }
        }
        else if (!document) {
            // document not found
            return callback(null);
        }
        else {
            // Copy data to found document and save
            Object.assign(document, data);
            document.save(function(err, savedDocument) {
                if (err) {
                    if (err.name === 'MongoError' && err.code === 11000) {
                        // 11000 = Duplicate index
                        var error = new Error(errors.duplicateId);
                        return callback(error);
                    }
                    else {
                        return callback(err);
                    }
                }
                else {
                    return callback(null, savedDocument);
                }
            });
        }
    });
};

exports.delete = function (stixId, stixModified, callback) {
    if (!stixId) {
        const error = new Error(errors.missingParameter);
        error.parameterName = 'stixId';
        return callback(error);
    }

    if (!stixModified) {
        const error = new Error(errors.missingParameter);
        error.parameterName = 'modified';
        return callback(error);
    }

    Tactic.findOneAndRemove({ 'stix.id': stixId, 'stix.modified': stixModified }, function (err, tactic) {
        if (err) {
            return callback(err);
        } else {
            //Note: tactic is null if not found
            return callback(null, tactic);
        }
    });
};
