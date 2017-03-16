var request = require('request')
var csv = require('csv')
var detect = require('detect-csv')

/**
 * model for interacting with a CKAN service API
 *
 * @param {object} koop - instance of koop
 */
function CkanModel (koop) {
  var model = koop.BaseModel(koop)

  model.ckan_path = '/api/3/action/package_show'
  model.ckan_list_path = '/api/3/action/package_list'
  model.ckan_dump_path = '/datastore/dump'

  /**
   * adds a CKAN service to the cache
   *
   * @param {string} id - service reference (optional, defaults to numeric increment)
   * @param {string} host - web address of CKAN service (required)
   * @param {function} callback
   */
  model.register = function (id, host, callback) {
    var type = 'ckan:services'

    koop.Cache.db.serviceCount(type, function (err, count) {
      if (err) return callback(err)

      id = id || count++

      koop.Cache.db.serviceRegister(type, { 'id': id, 'host': host }, function (err, success) {
        if (err) return callback(err)

        callback(null, id)
      })
    })
  }

  /**
   * removes a CKAN service from the cache
   *
   * @param {string} id - service reference
   * @param {function} callback
   */
  model.remove = function (id, callback) {
    koop.Cache.db.serviceRemove('ckan:services', parseInt(id, 10) || id, callback)
  }

  /**
   * get a CKAN service from the cache by ID
   * returns all services if no ID is specified
   *
   * @param {string} id - service reference
   * @param {function} callback
   */
  model.find = function (id, callback) {
    koop.Cache.db.serviceGet('ckan:services', parseInt(id, 10) || id, function (err, res) {
      if (err) {
        var msg = 'No datastores have been registered with this provider yet. Try POSTing {"host":"url", "id":"yourId"} to /ckan'
        return callback(new Error(msg))
      }

      callback(null, res)
    })
  }

  /**
   * get all... somethings... from a CKAN service
   *
   * @param {string} host - web address of CKAN service
   * @param {object} options - unused
   * @param {function} callback
   */
  model.getAll = function (host, options, callback) {
    var self = this
    var url = host + self.ckan_list_path

    request.get(url, function (err, data, response) {
      if (err) return callback(err)

      var result = JSON.parse(response).result
      callback(null, result)
    })
  }

  /**
   * got the service and get the item
   * TODO: refactor. too many params.
   *
   * @param {string} host - service web address
   * @param {string} hostId - service reference
   * @param {string} id - the item ID?
   * @param {object} options
   * @param {function} callback
   */
  model.getResource = function (host, hostId, id, options, callback) {
    var self = this
    var type = 'ckan'
    var key = id

    koop.Cache.get(type, key, options, function (err, entry) {
      if (err) {
        var url = host + self.ckan_path + '?id=' + id

        request.get(url, function (err, data, response) {
          if (err) return callback(err)

          try {
            var result = JSON.parse(response).result
            var itemUrl

            if (result) {
              for (var i = 0; i < result.resources.length; i++) {
                if (result.resources[i].format === 'CSV') {
                  itemUrl = host + self.ckan_dump_path + '/' + result.resources[i].id
                } else if (result.resources[i].format === 'ICMS') {
                  // It's working but not sure how to improve it
                  itemUrl = result.resources[i].url + '.csv'
                }
              }
              if (itemUrl) {
                request.get(itemUrl, function (err, data, res) {
                  if (err) return callback(err)

                  var notOk = data && data.statusCode !== 200
                  if (notOk) {
                    return callback(new Error('Unable to retrieve data from ' + itemUrl + ' (' + data.statusCode + ')'))
                  }
                  var guess = detect(res)
                  csv.parse(res, {delimiter: guess.delimiter}, function (err, csvData) {
                    if (err) return callback(err)

                    koop.GeoJSON.fromCSV(csvData, function (err, geojson) {
                      if (err) return callback(err)

                      geojson.updated_at = Date.now()
                      geojson.name = key
                      geojson.host = {
                        id: hostId,
                        url: host
                      }

                      koop.Cache.insert(type, key, geojson, 0, function (err, success) {
                        if (err) return callback(err)

                        callback(null, [geojson])
                      })
                    })
                  })
                })
              } else {
                callback(new Error('no CSV resources found'))
              }
            } else {
              callback(new Error('no CSV resources found'))
            }
          } catch (e) {
            callback(new Error('Resource not found'))
          }
        })
      } else {
        callback(null, entry)
      }
    })
  }

  //

  /**
   * drops a CKAN resource (item) from the cache
   * TODO: refactor. bad waterfall callback pattern.
   *
   * @param {string} host - either the CKAN service address or the service reference, not sure
   * @param {string} itemId - ID of CKAN resource (item)
   * @param {object} options - unused
   * @param {Function} callback
   */
  model.dropItem = function (host, itemId, options, callback) {
    var dir = ['ckan', host, itemId].join(':')

    koop.Cache.remove('ckan', itemId, options, function (err, res) {
      if (err) return callback(err)

      koop.files.removeDir('files/' + dir, function (err, res) {
        if (err) return callback(err)

        koop.files.removeDir('tiles/' + dir, function (err, res) {
          if (err) return callback(err)

          koop.files.removeDir('thumbs/' + dir, function (err, res) {
            if (err) return callback(err)

            callback(null, true)
          })
        })
      })
    })
  }

  return model
}

module.exports = CkanModel
