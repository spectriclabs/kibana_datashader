# Third party kibana maps source plugin for spectric datashader

A custom raster tile datashader source in kibana Maps. 

This plugin uses [spectric datashader to create map tiles](https://github.com/spectriclabs/elastic_datashader) tms server. 


## Installation
git clone repo into kibana/plugins directory

##configuration
Add tms endpoint to the kibana config `datashader.url: "http://localhost:8000"`
