## CKAN Provider for [Koop](https://github.com/Esri/koop)
-----------

This provider makes it possible to access [ckan's JSON API]() as either GeoJSON or an Esri FeatureService. This is particular useful for making maps and doing analysis on the web.

## Installation

To install/use this provider you first need a working installation of [Koop](https://github.com/Esri/koop). Then from within the koop directory you'll need to run the following:

  ```
    npm install https://github.com/chelm/koop-ckan/tarball/master
  ```

## Register ckan Hosts

Once this provider's been installed you need to "register" a particular instance of Socrate with your Koop instance. To do this you make `POST` request to the `/ckan` endpoint like so: 

  ```
    curl --data "host=https://data.nola.gov&id=nola" localhost:1337/ckan
  ```

What you'll need for that request to work is an ID and a the URL of the ckan instance. The ID is what you'll use to reference datasets that come from ckan in Koop. 

To make sure this works you can visit: http://localhost:1337/ckan and you should see all of the register hosts. 

## Access ckan Data

To access a dataset hosted in ckan you'll need a "resource id" from ckan. Datasets in ckan can be accessed as raw JSON like this: 

* [https://data.nola.gov/Geographic-Reference/NOLA-Short-Term-Rentals-Map/psp3-bvzw](https://data.nola.gov/Geographic-Reference/NOLA-Short-Term-Rentals-Map/psp3-bvzw) translates into -> https://data.nola.gov/resource/psp3-bvzw.json

And then the ID `psp3-bvzw` can be referenced in Koop like so: 

[http://koop.dc.esri.com/ckan/nola/psp3-bvzw](http://koop.dc.esri.com/ckan/nola/psp3-bvzw)


## Examples 

Here's a few examples of data hosted in ckan and accessed via Koop

* GeoJSON [http://koop.dc.esri.com/ckan/nola/psp3-bvzw](http://koop.dc.esri.com/ckan/nola/psp3-bvzw)
* FeatureService [http://koop.dc.esri.com/ckan/nola/psp3-bvzw/FeatureServer/0]
* All of the publicly registered ckan instances [http://koop.dc.esri.com/ckan](http://koop.dc.esri.com/ckan)
