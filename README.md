# Geoportail-KISS

Geoportail-KISS is a simple way to integrate mapping services of the French Geoportail in the main JavaScript mapping API (OpenLayers, Leaflet, OL3, Google).

## Openlayers
- OpenLayers.Map.Geoportail : IGN's Geoportail Map 
- OpenLayers.Layer.Geoportail : IGN's Geoportail WMTS layer to render Geoportail layers

## Leaflet
- 	L.TileLayer.Geoportail : IGN's Geoportail WMTS layer to render Geoportail layers

## OL3
> DEPRECATED - ol integration is now part of [ol-ext](https://github.com/Viglino/ol-ext), see [examples online](https://viglino.github.io/ol-ext/?q=geoportail)


## GMap (Google API)

## Services
A simple way to access geocode and altimetric services

## jQGeoportail
A jQuery plugin for Leaflet Geoportail maps.
- $("#mymap").geoportail(); // to create a simple map in the "mymap" div
- Maps in ".geoportalMap" divs are automatly created on document load.

