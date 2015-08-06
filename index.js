var pkg = require('./package')

var provider = {
  name: 'ckan',
  hosts: true,
  controller: require('./controller'),
  routes: require('./routes'),
  model: require('./models/ckan.js'),
  status: {
    version: pkg.version
  }
}

module.exports = provider
