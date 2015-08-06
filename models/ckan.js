var request = require('request')
var csv = require('csv')

function CkanModel (koop) {
  var ckan = koop.BaseModel(koop)

  // adds a service to the koop.Cache.db
  // needs a host, generates an id
  ckan.register = function (id, host, callback) {
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

  ckan.remove = function (id, callback) {
    koop.Cache.db.serviceRemove('ckan:services', parseInt(id, 10) || id, callback)
  }

  // get service by id, no id == return all
  ckan.find = function (id, callback) {
    koop.Cache.db.serviceGet('ckan:services', parseInt(id, 10) || id, function (err, res) {
      if (err) {
        return callback(new Error('No datastores have been registered with this provider yet. Try POSTing {"host":"url", "id":"yourId"} to /ckan'), null)
      }

      callback(null, res)
    })
  }

  ckan.ckan_path = '/api/3/action/package_show'
  ckan.ckan_list_path = '/api/3/action/package_list'
  ckan.ckan_dump_path = '/datastore/dump'

  ckan.getAll = function (host, options, callback) {
    var self = this
    var url = host + self.ckan_list_path

    request.get(url, function (err, data, response) {
      if (err) return callback(err, null)

      var result = JSON.parse(response).result
      callback(null, result)
    })
  }

  // got the service and get the item
  ckan.getResource = function (host, hostId, id, options, callback) {
    var self = this
    var type = 'ckan'
    var key = id

    koop.Cache.get(type, key, options, function (err, entry) {
      if (err) {
        var url = host + self.ckan_path + '?id=' + id

        request.get(url, function (err, data, response) {
          if (err) return callback(err, null)

          try {
            var result = JSON.parse(response).result
            var item_url

            if (result) {
              for (var i = 0; i < result.resources.length; i++) {
                if (result.resources[i].format === 'CSV') {
                  item_url = host + self.ckan_dump_path + '/' + result.resources[i].id
                }
              }
              if (item_url) {
                request.get(item_url, function (err, data, res) {
                  if (err) return callback(err)

                  var notOk = data && data.statusCode !== 200
                  if (notOk) {
                    return callback(new Error('Unable to retrieve data from ' + item_url + ' (' + data.statusCode + ')'))
                  }

                  csv.parse(res, function (err, csv_data) {
                    if (err) return callback(err)

                    koop.GeoJSON.fromCSV(csv_data, function (err, geojson) {
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
          } catch(e) {
            callback(new Error('Resource not found'))
          }
        })
      } else {
        callback(null, entry)
      }
    })

  }

  // drops the item from the cache
  ckan.dropItem = function (host, itemId, options, callback) {
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

  return ckan
}

module.exports = CkanModel
