var test = require('tape')
var koop = require('koop/lib')
var Model = require('../model')
var path = require('path')

koop.config = {
  data_dir: path.join(__dirname, '/output/')
}

koop.log = new koop.Logger({logfile: './test.log'})
koop.Cache = new koop.DataCache(koop)
koop.Cache.db = koop.LocalDB
koop.Cache.db.log = koop.log

var ckan = new Model(koop)

test('ckan model', function (t) {
  t.ok(ckan, 'exists')
  t.end()
})
