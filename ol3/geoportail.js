/*
	Copyright (c) 2014 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
	ol.source.Geoportail : IGN's Geoportail WMTS source definition
	ol.layer.Geoportail : IGN's Geoportail WMTS layer definition
	ol.Map.Geoportail : IGN's Geoportail Map definition
*/

/**
* @constructor IGN's Geoportail WMTS source definition
* @extends {ol.source.WMTS}
* @param {String=} layer Layer name.
* @param {olx.source.OSMOptions=} options WMTS options + key: apiKey
* @todo 
*/
ol.source.Geoportail = function(layer, options)
{	if (!options) options={};

	var matrixIds = new Array();
	var resolutions = new Array();//[156543.03392804103,78271.5169640205,39135.75848201024,19567.879241005125,9783.939620502562,4891.969810251281,2445.9849051256406,1222.9924525628203,611.4962262814101,305.74811314070485,152.87405657035254,76.43702828517625,38.218514142588134,19.109257071294063,9.554628535647034,4.777314267823517,2.3886571339117584,1.1943285669558792,0.5971642834779396,0.29858214173896974,0.14929107086948493,0.07464553543474241];
	var size = ol.extent.getWidth(ol.proj.get('EPSG:3857').getExtent()) / 256;
	for (var z=0; z <= (options.maxZoom ? options.maxZoom:18) ; z++) 
	{	matrixIds[z] = z ; 
		resolutions[z] = size / Math.pow(2, z);
	}
	var tg = new ol.tilegrid.WMTS
			({	origin: [-20037508, 20037508],
				resolutions: resolutions,
				matrixIds: matrixIds
			});
	tg.minZoom = (options.minZoom ? options.minZoom:0);
	var attr = [ ol.source.Geoportail.prototype.attribution ];
	if (options.attributions) attr.push(options.attributions);
	ol.source.WMTS.call (this, 
		{	url: "http://wxs.ign.fr/" + options.key + "/wmts",
			layer: layer,
			matrixSet: "PM",
			format: options.format ? options.format:"image/jpeg",
			projection: "EPSG:3857",
			tileGrid: tg,
			style: options.style ? options.style:"normal",
			attributions: attr,
			crossOrigin: options.crossOrigin ? options.crossOrigin :'anonymous'
		});
	// Save function to change apiKey
	this._urlFunction = this.getTileUrlFunction();
};
ol.inherits (ol.source.Geoportail, ol.source.WMTS);


/**
 * Return the associated API key of the Map.
 * @function
 * @return the API key.
 * @api stable
 */
ol.source.Geoportail.prototype.getGPPKey = function()
{	var url = this.getUrls()[0];
	return url.replace (/http:\/\/wxs.ign.fr\/(.*)\/.*/,"$1");
}
/**
 * Set the associated API key to the Map.
 * @param {String} the API key.
 * @api stable
 */
ol.source.Geoportail.prototype.setGPPKey = function(key)
{	var url = this.getUrls();
	url[0] = url[0].replace (/(http:\/\/wxs.ign.fr\/)(.*)(\/.*)/, "$1"+key+"$3");
	this.setTileUrlFunction ( function()
	{	var url = this._urlFunction.apply(this, arguments);
		return url.replace (/(http:\/\/wxs.ign.fr\/)(.*)(\/.*)/, "$1"+key+"$3");
	});
}

// Attribution standard
ol.source.Geoportail.prototype.attribution = new ol.Attribution
({	html: '<a href="http://www.geoportail.gouv.fr/">Géoportail</a> &copy; <a href="http://www.ign.fr/">IGN-France</a>'
});


/**
* @constructor IGN's Geoportail WMTS layer definition
* @extends {ol.layer.Tile}
* @param {options=} layer: Layer name, key: APIKey.
* @param {olx.source.OSMOptions=} options WMTS options if not defined default are used
* @todo 
*/
ol.layer.Geoportail = function(layer, options, tileoptions)
{	if (!options) options={};
	if (!tileoptions) tileoptions={};
	options.layer = layer;

	var capabilities = window.geoportailConfig ? geoportailConfig.capabilities[options.key] || geoportailConfig.capabilities["default"] : {};
	capabilities = capabilities[options.layer] || {};

	for (var i in capabilities) if (typeof	tileoptions[i]== "undefined") tileoptions[i] = capabilities[i];

	if (!tileoptions.key) tileoptions.key = options.key;
	options.source = new ol.source.Geoportail(options.layer, tileoptions);
	options.name = capabilities.title;
	options.desc = capabilities.desc;

	ol.layer.Tile.call (this, options);	
};
ol.inherits (ol.layer.Geoportail, ol.layer.Tile);


/**
* @constructor IGN's Geoportail Map definition
* @extends {ol.Map}
* @param {ol.Map.options=} add the API key to the map options (key)
* @todo 
*/
ol.Map.Geoportail = function(options)
{	// constructor
	ol.Map.apply (this, arguments);
	
	// Set API key to the Geoportail layers
	if (!options) options={};
	this.gppKey = options.key;
	if (this.gppKey && options.layers)
	{	for (var i in options.layers)
			if (options.layers[i].getSource().setGPPKey) options.layers[i].getSource().setGPPKey(this.gppKey);
	}
}
ol.inherits (ol.Map.Geoportail, ol.Map);

/**
*	Set the API key to Geoportail layers when added
*/
ol.Map.Geoportail.prototype.addLayer = function(layer)
{	if (this.gppKey && layer.getSource().setGPPKey) layer.getSource().setGPPKey(this.gppKey);
	return ol.Map.prototype.addLayer.apply (this, arguments);
}

/** Usefull functions
*/
ol.Map.prototype.getLayersByName = function(exp)
{	return this.getLayersBy("name",exp);
}

ol.Map.prototype.getLayersBy = function(n,exp)
{	if (!(exp instanceof RegExp)) exp = new RegExp(exp);
	var layers = [];
	this.getLayers().getArray().forEach(function(l)
	{	if (exp.test(l.get(n))) layers.push(l);
	});
	return layers;
}

ol.View.prototype.setCenterAtLonlat = function(lonlat, zoom)
{	this.setCenter (ol.proj.transform(lonlat, 'EPSG:4326', this.getProjection()));
	if (zoom) this.setZoom(zoom);
}


/**
 * Return a preview image of the layer.
 * @param {ol.Coordinate|undefined} lonlat The center of the preview.
 * @param {number} resolution of the preview.
 * @return {String} the preview url
 * @api
 */
ol.source.Source.prototype.getPreview = function(lonlat, resolution, resolution)
{	return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAk6QAAJOkBUCTn+AAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANeSURBVHic7ZpPiE1RHMc/780MBhkik79JSUlIUbOxI+wkI2yRhYSUlJLNpJF/xcpiJBmZGBZsNM1CkmhKITGkGbH0/BuPmXnP4rxbb/TOn3fvOffeec6nfqvb/b7f93fveeec37ng8Xg8Ho/nf6Uu4d+fDswFssCvhHOJhaXAMeApMAQUyyIPPAdOAiuTStAVy4EHjDWsix5gdRLJ2mY34ulWYz6IEeA4kIk9awtkgTOEM/5vdAKT4k0/Ou3YMR/ELcbRm9AKFLBbgCJwNE4TYZkJfMG++SIwDCyLz0o4bI17WdyJz0r1TAZ+oDcxCBwAFgIzEIuhvcBbg3sLwOK4DFXLFvQGniCGSSUagS4DjUPOHESkA3XiOWCORqMR6Nfo9DjI3QqPUSd+ylBnv0Zn0GrWFvmIOvGNhjqrNDp/EAutyFgRKUM2tgO+Gur81FxvAKYZaimxXYBvmuuLDHWWaK4X0RfJCNsF6NdcbzXU2a65PohYFKWOc+jn8PUajbWIXaBKp9NB7lZYh34OzwFbFfd/NtDYYSth27urLGIm0M31AL3APWAAmIooymaDnPIl/Vz4NN1yHrd7gcvxWQnHAuA3bsyPop8hUsE13BSgK04TUViBeFo2zedJ8S6wElexW4D2eNOPTjNi6WvD/DtEr8E6tk6GGoAmxFY2iFHE9NZiQf8gogiB9gTEH23izAZuE77vHyU+ANucO1QwD3hD/MbLowAcdm20EmkwXx4n3NodS9rMB2HabYpEWs0HcRqHp0fNwAvJD+eBTZr7p6BvmQVxUaEzEbiruNfJekH15L8jtrEm7JJolEcOmKXRqQOuKDQuY7HZY8s8iNfzkSLxIuI43FTrkkLnOlBfRW4VsWk+oAX5weknxFAxJQNckGgVgZuIRVoomoGXEmGTMa+iQ6K7M4SW7k24QYgiuDQPYinbhugiF4H3RGtzZYCzyIvQXfpNI1ybLyeLpf5+iTbkRbiP2EcocTHm4+YI8iI8RFHwWjAfsA95Q+YZFU6wasl8wB7kReijtNbIILa0vcg/PRlGfPQwHmlCviDqAzaA+OREtzqr1ejOIDorxlNEjTGUBV4nnUWCvAJxGDlA8q9j3DEArAn2zvXAfOwfl6eVAmJrPpJ0Ih6Px+PxeJLjLwPul3vj5d0eAAAAAElFTkSuQmCC";
}

/**
 * Return the tile image of the layer.
 * @param {ol.Coordinate|undefined} lonlat The center of the preview.
 * @param {number} resolution of the preview.
 * @return {String} the preview url
 * @api
 */
ol.source.Tile.prototype.getPreview = function(lonlat, resolution)
{	if (!lonlat) lonlat = [21020, 6355964];
	if (!resolution) resolution = 150;
	var coord = this.getTileGrid().getTileCoordForCoordAndResolution(lonlat, resolution);
	var fn = this.getTileUrlFunction();
	return fn.call(this, coord, this.getProjection());
}

