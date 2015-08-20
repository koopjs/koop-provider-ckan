var koop = require('koop')({})
var ckan = require('../')

koop.register(ckan)

var express = require('express')
var app = express()

app.use(koop)

app.get('/', function (req, res) {
  res.redirect('/ckan')
})

app.listen(process.env.PORT || 1337, function () {
  console.log('Koop CKAN server listening at %d', this.address().port)
})
