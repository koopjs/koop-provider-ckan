var SM = require('sphericalmercator')
var merc = new SM({ size: 256 })
var fs = require('fs')
var crypto = require('crypto')
var ejs = require('ejs')
var path = require('path')
var templatePath = require.resolve(path.join(__dirname, '/../views/demo.ejs'))
var template = fs.readFileSync(templatePath).toString()

/**
 * controller for interacting with CKAN services
 *
 * @param {object} ckan - model
 * @param {object} BaseController - koop/lib/BaseController (a bad)
 */
function CkanController (ckan, BaseController) {
  var controller = BaseController()

  /**
   * route for registering a host
   *
   * @param {object} req - request object
   * @param {object} res - response object
   */
  controller.register = function (req, res) {
    if (!req.body.host) return res.status(500).send('Must provide a host to register')

    ckan.register(req.body.id, req.body.host, function (err, id) {
      if (err) return res.status(500).send(err)

      res.json({ 'serviceId': id })
    })
  }

  /**
   * route for listing all registered hosts
   *
   * @param {object} req - request object
   * @param {object} res - response object
   */
  controller.list = function (req, res) {
    ckan.find(null, function (err, data) {
      if (err) return res.status(500).send(err)

      res.json(data)
    })
  }

  /**
   * route for returning a registered host's information
   *
   * @param {object} req - request object
   * @param {object} res - response object
   */
  controller.find = function (req, res) {
    ckan.find(req.params.id, function (err, data) {
      if (err) return res.status(404).send(err)

      res.json(data)
    })
  }

  /**
   * route for dropping an item from the cache
   *
   * @param {object} req - request object
   * @param {object} res - response object
   */
  controller.drop = function (req, res) {
    ckan.find(req.params.id, function (err, data) {
      if (err) return res.status(500).send(err)

      ckan.dropItem(data.host, req.params.item, req.query, function (err, itemJson) {
        if (err) return res.status(500).send(err)

        res.json(itemJson)
      })
    })
  }

  /**
   * route for listing all items from a registered host
   *
   * @param {object} req - request object
   * @param {object} res - response object
   */
  controller.listall = function (req, res) {
    ckan.find(req.params.id, function (err, data) {
      if (err) return res.status(500).send(err)

      ckan.getAll(data.host, req.query, function (err, list) {
        if (err) return res.status(500).send(err)

        res.json(list)
      })
    })
  }

  /**
   * route for fetching an item
   *
   * @param {object} req - request object
   * @param {object} res - response object
   */
  controller.findResource = function (req, res) {
    ckan.find(req.params.id, function (err, data) {
      if (err) return res.status(500).send(err)

      ckan.getResource(data.host, req.params.id, req.params.item, req.query, function (err, itemJson) {
        if (err) return res.status(err.code || 500).send(err.message || err)

        if (req.params.format) {
          // change geojson to json
          req.params.format = req.params.format.replace('geojson', 'json')

          var dir = ['ckan', req.params.id, req.params.item].join(':')
          // build the file key as an MD5 hash that's a join on the paams and look for the file
          var toHash = JSON.stringify(req.params) + JSON.stringify(req.query)
          var key = crypto.createHash('md5').update(toHash).digest('hex')
          var path = ['files', dir].join('/')
          var fileName = key + '.' + req.params.format

          ckan.files.exists(path, fileName, function (exists, path) {
            if (exists) {
              if (path.substr(0, 4) === 'http') {
                res.redirect(path)
              } else {
                res.sendfile(path)
              }
            } else {
              ckan.exportToFormat(req.params.format, dir, key, itemJson[0], {}, function (err, file) {
                if (err) return res.status(500).send(err)

                res.sendfile(file)
              })
            }
          })
        } else {
          res.json(itemJson[0])
        }
      })
    })
  }

  /**
   * route for removing a registered host from the cache
   *
   * @param {object} req - request object
   * @param {object} res - response object
   */
  controller.del = function (req, res) {
    if (!req.params.id) return res.status(500).send('Must specify a service id')

    ckan.remove(req.params.id, function (err, data) {
      if (err) return res.status(500).send(err)

      res.json(data)
    })
  }

  /**
   * route for handling featureserver requests
   *
   * @param {object} req - request object
   * @param {object} res - response object
   */
  controller.featureserver = function (req, res) {
    var callback = req.query.callback
    delete req.query.callback

    for (var k in req.body) {
      req.query[k] = req.body[k]
    }

    ckan.find(req.params.id, function (err, data) {
      if (err) return res.status(500).send(err)

      ckan.getResource(data.host, req.params.id, req.params.item, req.query, function (err, geojson) {
        if (err) return res.status(500).send(err)

        // pass to the shared logic for FeatureService routing
        delete req.query.geometry
        delete req.query.where
        req.query.idField = req.query.idField || 'OBJECTID'
        controller.processFeatureServer(req, res, err, geojson, callback)
      })
    })
  }

  /**
   * route for handling tile requests
   *
   * @param {object} req - request object
   * @param {object} res - response object
   */
  controller.tiles = function (req, res) {
    var callback = req.query.callback
    var layer = req.params.layer || 0
    delete req.query.callback

    function _send (err, data) {
      if (err) return res.status(500).send(err)

      req.params.key = key + ':' + layer

      if (req.query.style) {
        req.params.style = req.query.style
      }

      ckan.tileGet(req.params, data[layer], function (err, tile) {
        if (err) return res.status(500).send(err)

        if (req.params.format === 'png' || req.params.format === 'pbf') {
          res.sendfile(tile)
        } else {
          if (callback) {
            res.send(callback + '(' + JSON.stringify(tile) + ')')
          } else {
            if (typeof tile === 'string') {
              res.sendfile(tile)
            } else {
              res.json(tile)
            }
          }
        }
      })
    }

    // build the geometry from z,x,y
    var bounds = merc.bbox(req.params.x, req.params.y, req.params.z)

    req.query.geometry = {
      xmin: bounds[0],
      ymin: bounds[1],
      xmax: bounds[2],
      ymax: bounds[3],
      spatialReference: { wkid: 4326 }
    }

    function _sendImmediate (file) {
      if (req.params.format === 'png' || req.params.format === 'pbf') {
        res.sendfile(file)
      } else {
        fs.readFile(file, function (err, data) {
          if (err) {
            if (callback) return callback(err)
            return res.status(500).json(err)
          }

          if (callback) {
            return res.send(callback + '(' + JSON.parse(data) + ')')
          }

          res.json(JSON.parse(data))
        })
      }
    }

    var key = ['ckan', req.params.id, req.params.item].join(':')
    var file = ckan.files.localDir + '/tiles/'
    file += key + '/' + req.params.format
    file += '/' + req.params.z + '/' + req.params.x + '/' + req.params.y + '.' + req.params.format

    var jsonFile = file.replace(/png|pbf|utf/g, 'json')

    // if the json file alreadty exists, dont hit the db, just send the data
    if (fs.existsSync(jsonFile) && !fs.existsSync(file)) {
      _send(null, fs.readFileSync(jsonFile))
    } else if (!fs.existsSync(file)) {
      ckan.find(req.params.id, function (err, data) {
        if (err) return res.status(500).send(err)

        ckan.getResource(data.host, req.params.id, req.params.item, req.query, _send)
      })
    } else {
      _sendImmediate(file)
    }
  }

  /**
   * route for handling thumbnail requests
   *
   * @param {object} req - request object
   * @param {object} res - response object
   */
  controller.thumbnail = function (req, res) {
    // check the image first and return if exists
    var key = ['ckan', req.params.id, req.params.item].join(':')
    var dir = ckan.files.localDir + '/thumbs/'
    req.query.width = parseInt(req.query.width, 10) || 150
    req.query.height = parseInt(req.query.height, 10) || 150
    req.query.f_base = dir + key + '/' + req.query.width + '::' + req.query.height

    var fileName = ckan.thumbnailExists(key, req.query)
    if (fileName) {
      res.sendfile(fileName)
    } else {
      ckan.find(req.params.id, function (err, data) {
        if (err) return res.status(500).send(err)

        // Get the item
        ckan.getResource(data.host, req.params.id, req.params.item, req.query, function (err, itemJson) {
          if (err) return res.status(500).send(err)

          var key = ['ckan', req.params.id, req.params.item].join(':')

          // generate a thumbnail
          ckan.thumbnailExists(itemJson[0], key, req.query, function (err, file) {
            if (err) return res.status(500).send(err)

            // send back image
            res.sendfile(file)
          })
        })
      })
    }
  }

  /**
   * route for handling preview requests
   *
   * @param {object} req - request object
   * @param {object} res - response object
   */
  controller.preview = function (req, res) {
    var html = ejs.render(template, {
      locals: {
        host: req.params.id,
        item: req.params.item
      }
    })

    res.write(html)
    res.end()
  }

  return controller
}

module.exports = CkanController
