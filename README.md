# koop-ckan

> CKAN Provider for [Koop](https://github.com/koopjs/koop)

[![npm version][npm-img]][npm-url]
[![build status][travis-img]][travis-url]

[npm-img]: https://img.shields.io/npm/v/koop-ckan.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/koop-ckan
[travis-img]: https://img.shields.io/travis/koopjs/koop-ckan.svg?style=flat-square
[travis-url]: https://travis-ci.org/koopjs/koop-ckan

## Install

To use this provider you first need a working installation of [Koop](https://github.com/koopjs/koop). Then from within the koop directory you'll need to run the following:

```
npm install koop-ckan --save
```

## Usage

### Registering CKAN Hosts

Once this provider's been installed you need to register a particular instance of CKAN with your Koop instance. To do this you need to make a `POST` request to the `/ckan` endpoint like so:

```
curl --data "host=https://data.nola.gov&id=nola" localhost:1337/ckan
```

*for Windows users, download cURL from http://curl.haxx.se/download.html or use a tool of your choice to generate the POST request*

What you'll need for that request to work is an ID and the URL of the CKAN instance. The ID is what you'll use to reference datasets that come from CKAN in Koop.

To make sure this works you can visit `http://localhost:1337/ckan` and you should see all of the registered hosts.

### Access CKAN Data

To access a dataset hosted in CKAN you'll need a "dataset id" from CKAN which could be referenced in Koop like so:

[http://koop.dc.esri.com/ckan/rwlabs/ourairports-ind](http://koop.dc.esri.com/ckan/rwlabs/ourairports-ind)

### Examples

Here's a few examples of data hosted in CKAN and accessed via Koop

* GeoJSON: http://koop.dc.esri.com/ckan/rwlabs/ourairports-ind
* FeatureService: http://koop.dc.esri.com/ckan/rwlabs/ourairports-ind/FeatureServer/0
* KML http://koop.dc.esri.com/ckan/rwlabs/ourairports-ind.kml
* All of the publicly registered ckan instances: http://koop.dc.esri.com/ckan

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/Esri/contributing).

## License

[Apache 2.0](LICENSE)
