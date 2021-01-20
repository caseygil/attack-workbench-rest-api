'use strict';

let app;

exports.initializeApp = async function() {
    // Only set up the express app once
    if (app) {
        return app;
    }

    const logger = require('./lib/logger');
    logger.info('ATT&CK Workbench REST API app starting');

    // Configure the app
    logger.info('Configuring the app');
    const config = require('./config/config');

    // Create the express application
    logger.info('Starting express');
    const express = require('express');
    app = express();

    // Allow CORS
    // TBD: Configure CORS for a specific origin
    const cors = require('cors');
    app.use(cors());

    // Compress response bodies
    const compression = require('compression');
    app.use(compression());

    // Set HTTP response headers
    const helmet = require("helmet");
    app.use(helmet());

    // Development Environment
    if (config.app.env === 'development') {
        // Enable request logging
        logger.info('Enabling HTTP request logging');
        const morgan = require('morgan');
        app.use(morgan('dev', {stream: logger.stream}));

        // Enable Swagger UI
        logger.info('Enabling Swagger UI');
        const swaggerUi = require('swagger-ui-express');
        const refParser = require("@apidevtools/json-schema-ref-parser");
        const openApiDoc = await refParser.bundle(config.openApi.specPath);
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));
    }

    // Set up the static routes
    logger.info('Configuring static routes');
    app.use(express.static('public'));

    // Set up the api routes
    logger.info('Configuring REST API routes');
    const routes = require('./routes');
    app.use(routes);

    // Make the config and logger accessible from the app
    app.set('config', config);
    app.set('logger', logger);

    return app;
}