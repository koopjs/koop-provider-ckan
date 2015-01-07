
exports.name = 'ckan';
// tells koop that this provider uses host registration
exports.hosts = true;

exports.controller = require('./controller');
exports.routes = require('./routes');
exports.model = require('./models/ckan.js');
