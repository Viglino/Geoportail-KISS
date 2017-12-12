/*
	Copyright (c) 2014 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
	ol.source.Geoportail : IGN's Geoportail WMTS source definition
	ol.layer.Geoportail : IGN's Geoportail WMTS layer definition
	ol.Map.Geoportail : IGN's Geoportail Map definition

	Originators: ol.Map.Geoportail use originators to display attributions 
	depending on position and zoom (constraints).
	Just add originators to the layer to the layer using layer.getOriginator
	olx.originators:
	{	"orig1":
		{	attribution: {String},
			constraint: Array{bbox, maxZoom, minZoom},
			href: {String} link to informations
			logo: {String} logo originator
			maxZoom: {Number|null}
			minZoom: {Number|null}
		},
		"orig2":{...}
	}
*/

/** Add a setOriginators function to layers
*/
ol.layer.Base.prototype.setOriginators = function(o)
{	this._originators = o;
	this.changed();
};

/** Add a getOriginators function to layers
*/
ol.layer.Base.prototype.getOriginators = function()
{	return this._originators;
};

/**
* @constructor IGN's Geoportail WMTS source definition
* @extends {ol.source.WMTS}
* @param {String=} layer Layer name.
* @param {olx.source.OSMOptions=} options WMTS options 
*	@param {string} options.key: apiKey
*	@param {string} options.authentication: basic authentication as "login:pwd" string
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
	if (options.attributions) attr = options.attributions;

	var url = this.serviceURL();

	this._server = options.server;
	this.gppKey = options.key;

	wmts_options = 
	{	url: this.serviceURL(),
		layer: layer,
		matrixSet: "PM",
		format: options.format ? options.format:"image/jpeg",
		projection: "EPSG:3857",
		tileGrid: tg,
		style: options.style ? options.style:"normal",
		attributions: attr,
		crossOrigin: (typeof options.crossOrigin == 'undefined') ? 'anonymous' : options.crossOrigin,
		wrapX: !(options.wrapX===false)
	};
	ol.source.WMTS.call (this, wmts_options);

	// Save function to change apiKey
	this._urlFunction = this.getTileUrlFunction();
	// Load url using basic authentification
	if (options.authentication) {
		this.setTileLoadFunction(ol.source.Geoportail.tileLoadFunctionWithAuthentication(options.authentication, this.getFormat()));
	}
};
ol.inherits (ol.source.Geoportail, ol.source.WMTS);

/** Get service URL according to server url or standard url
*/
ol.source.Geoportail.prototype.serviceURL = function()
{	if (this._server) 
	{	return this._server.replace (/^(https?:\/\/[^\/]*)(.*)$/, "$1/"+this.gppKey+"$2") ;
	}
	else return (window.geoportailConfig ? geoportailConfig.url : "//wxs.ign.fr/") +this.gppKey+ "/wmts" ;
}

/**
 * Return the associated API key of the Map.
 * @function
 * @return the API key.
 * @api stable
 */
ol.source.Geoportail.prototype.getGPPKey = function()
{	return this.gppKey;
}

/**
 * Set the associated API key to the Map.
 * @param {String} the API key.
 * @api stable
 */
ol.source.Geoportail.prototype.setGPPKey = function(key, authentication)
{	this.gppKey = key;
	var serviceURL = this.serviceURL();
	this.setTileUrlFunction ( function()
	{	var url = this._urlFunction.apply(this, arguments);
		if (url) 
		{	var args = url.split("?");
			return serviceURL+"?"+args[1];
		}
		else return url;
	});
	// Load url using basic authentification
	if (authentication) {
		this.setTileLoadFunction(ol.source.Geoportail.tileLoadFunctionWithAuthentication(authentication, this.getFormat()));
	}
}

/** Get a tile load function to load tiles with basic authentication
 * @param {string} authentication as "login:pwd" string
 * @param {string} format mime type
 * @return {function} tile load function to load tiles with basic authentication
 */
ol.source.Geoportail.tileLoadFunctionWithAuthentication = function(authentication, format) {
	return function(tile, src){
		var xhr = new XMLHttpRequest();
		xhr.open("GET", src);
		xhr.setRequestHeader("Authorization", "Basic " + btoa(authentication));
		/* https://github.com/openlayers/openlayers/issues/4213
		xhr.onload = function() {
			var data = 'data:image/png;base64,' + btoa(unescape(encodeURIComponent(this.responseText)));
			tile.getImage().src = data;
		  };
		*/
		xhr.responseType = "arraybuffer";
		xhr.onload = function () {
			var arrayBufferView = new Uint8Array(this.response);
			var blob = new Blob([arrayBufferView], { type: format });
			var urlCreator = window.URL || window.webkitURL;
			var imageUrl = urlCreator.createObjectURL(blob);
			tile.getImage().src = imageUrl;
		};
		xhr.send();
	};
};

/** Standard IGN-GEOPORTAIL attribution 
*/
ol.source.Geoportail.prototype.attribution = new ol.Attribution
({	html: '<a href="http://www.geoportail.gouv.fr/">Géoportail</a> &copy; <a href="http://www.ign.fr/">IGN-France</a>'
});

/**
* @constructor IGN's Geoportail WMTS layer definition
* @extends {ol.layer.Tile}
* @param {options=} layer: Layer name, key: APIKey.
* @param {olx.source.WMTSOptions=} options WMTS options if not defined default are used
* @todo 
*/
ol.layer.Geoportail = function(layer, options, tileoptions)
{	if (!options) options={};
	if (!tileoptions) tileoptions={};
	options.layer = layer;

	var capabilities = window.geoportailConfig ? geoportailConfig.capabilities[options.key] || geoportailConfig.capabilities["default"] : {};
	capabilities = capabilities[options.layer];
	if (!capabilities) throw new Error("ol.layer.Geoportail: no layer definition for \""+layer+"\"");

	// tileoptions default params
	for (var i in capabilities) if (typeof	tileoptions[i]== "undefined") tileoptions[i] = capabilities[i];

	this._originators = capabilities.originators;

	if (!tileoptions.key) tileoptions.key = options.key;
	options.source = new ol.source.Geoportail(options.layer, tileoptions);
	if (!options.name) options.name = capabilities.title;
	if (!options.desc) options.desc = capabilities.desc;
	if (!options.extent) 
	{	if (capabilities.bbox[0]>-170 && capabilities.bbox[2]<170)
			options.extent = ol.proj.transformExtent(capabilities.bbox, 'EPSG:4326', 'EPSG:3857');
	}

	// calculate layer max resolution
	if (!options.maxResolution && tileoptions.minZoom)
	{	options.source.getTileGrid().minZoom -= (tileoptions.minZoom>1 ? 2 : 1);
		options.maxResolution = options.source.getTileGrid().getResolution(options.source.getTileGrid().minZoom)
		options.source.getTileGrid().minZoom = tileoptions.minZoom;
	}
	
	ol.layer.Tile.call (this, options);
};
ol.inherits (ol.layer.Geoportail, ol.layer.Tile);


/**
* @constructor IGN's Geoportail Map definition
* @extends {ol.Map}
* @param {ol.Map.options=} add the API key to the map options (key)
*	@param {string} options.key Geoportail API key
*	@param {string} options.authentication: basic authentication as "login:pwd" string
*   @param {none|text|logo} options.attributionMode advanced attribution mode (attribution calculate on position / zoom)
* @todo 
*/
ol.Map.Geoportail = function(options)
{	// constructor
	ol.Map.apply (this, arguments);
	
	// Set API key to the Geoportail layers
	if (!options) options={};
	this.gppKey = options.key;
	this.authentication = options.authentication;

	// Recursive function to set layers keys even in ol.layer.Group
	function setGPPKey(key, authentication, layers)
	{	for (var i in layers)
		{	if (layers[i].getSource)
			{	if (layers[i].getSource().setGPPKey) layers[i].getSource().setGPPKey(key, authentication);
			}
			else 
			{	if (layers[i].getLayers) setGPPKey (key, authentication, layers[i].getLayers().getArray());
			}
		}
	}
	if (this.gppKey && options.layers) setGPPKey(this.gppKey, this.authentication, options.layers);

	this._attributionMode = (options.attributionMode=="none" ? false : options.attributionMode||"text");
	this.setLayerAttributions();

	// Attribution on layers depend on position/zoom
	this.on ("moveend", this.setLayerAttributions, this);
};
ol.inherits (ol.Map.Geoportail, ol.Map);

/** Format attribution to display on the map
* @param {String} title
* @param {String} long attribution 
* @param {String} url
* @param {String} logo
* @return {String} formated attribution
*/
ol.Map.Geoportail.prototype.formatAttribution = function(title, attribution, href, logo)
{	if (logo) return '<a href=\"'+href+'"><img src="'+logo+'" title="&copy; '+attribution+'" /></a>';
	else return '&copy; <a href=\"'+href+'" title="&copy; '+attribution+'" >'+title+'</a>'
};

(function(){

// Get default attribution
function getAttrib (map, mode, a, o)
{	var islogo = (mode=="logo" ? "logo":"");
	// Default attribution > IGN
	if (!a) 
	{	return ol.Attribution.uniqueAttributionKey["IGN"+islogo] || ol.Attribution.getUniqueAttribution();
	}
	// Create attribution (if not exist)
	var attr;
	if (!ol.Attribution.uniqueAttributionKey[a+islogo])
	{	attr = map.formatAttribution(a, o.attribution||a, o.href, islogo ? o.logo:null);
	}
	// Create attribution
	return ( ol.Attribution.getUniqueAttribution(attr, a+islogo ));
}

// Set attribution according to position / zoom
function setLayerAttribution (map, l, ex, z, mode)
{	// Geoportail layer
	if (l._originators)
	{	var attrib = l.getSource().getAttributions();
		attrib.splice(0, attrib.length);
		var maxZoom = 0;
		for (var a in l._originators)
		{	var o = l._originators[a];
			for (var i=0; i<o.constraint.length; i++)
			{	if (o.constraint[i].maxZoom > maxZoom
					&& ol.extent.intersects(ex, o.constraint[i].bbox))
				{	maxZoom = o.constraint[i].maxZoom;
				}
			}	
		}
		if (maxZoom < z) z = maxZoom;
		if (l.getSource().getTileGrid() && z < l.getSource().getTileGrid().getMinZoom())
		{	z = l.getSource().getTileGrid().getMinZoom();
		}
		for (var a in l._originators)
		{	var o = l._originators[a];
			if (!o.constraint.length) attrib.push (getAttrib(map, mode, a, o));
			else for (var i=0; i<o.constraint.length; i++)
			{	if ( z <= o.constraint[i].maxZoom 
					&& z >= o.constraint[i].minZoom 
					&& ol.extent.intersects(ex, o.constraint[i].bbox))
				{	attrib.push (getAttrib(map, mode, a, o));
					break;
				}
			}
		}
		if (!attrib.length) attrib.push ( getAttrib(map, mode) );
		// l.getSource().setAttributions(attrib);
	}
	// Layer group > set attribution for all layers in the groupe
	else if (l.getLayers)
	{	l.getLayers().forEach(function(layer)
		{	setLayerAttribution (map, layer, ex, z, mode);
		});
	}
}

/** Set attribution according to layers attribution and map position
*/
ol.Map.Geoportail.prototype.setLayerAttributions = function(change)
{	if (this._attributionMode) 
	{	var ex = this.getView().calculateExtent(this.getSize());
		ex = ol.proj.transformExtent (ex, this.getView().getProjection(), "EPSG:4326");
		var z = this.getView().getZoom();
		var self = this;
		this.getLayers().forEach(function(l)
		{	setLayerAttribution (self, l, ex, z, self._attributionMode);
			if (change===true) l.changed();
		});
	}
};

/** Set Attribution mode
* @param {none|text|logo}
*/
ol.Map.Geoportail.prototype.setAttributionsMode = function(mode)
{	this._attributionMode = (mode=="none" ? false : mode);
	var div = this.getTargetElement().firstElementChild || this.getTargetElement().firstChild;
	div.className = div.className.replace(/ ol\-attributionlogo/g, "");
	if (mode=="logo") div.className += " ol-attributionlogo";
	if (!this._attributionMode)
	{	this.getLayers().forEach(function(l)
		{	l.getSource().setAttributions([ ol.source.Geoportail.prototype.attribution ]);
		});
	}
	else this.setLayerAttributions(true);
};

})();

/**
*	Set the API key to Geoportail layers when added
*/
ol.Map.Geoportail.prototype.addLayer = function(layer)
{	// Recursive setkey for group layers
	function setLayerKey (layer, key, authentication)
	{	// Geoportail layer
		if (layer.getSource && layer.getSource() && layer.getSource().setGPPKey) {
			layer.getSource().setGPPKey(key, authentication);
		}
		// or a group layer
		else if (layer.getLayers && layer.setGPPKey) 
		{	layer.getLayers().forEach( function(l)
			{	setLayerKey (l, key, authentication)
			});
		}
	}

	if (this.gppKey) setLayerKey (layer, this.gppKey, this.authentication)
	var l = ol.Map.prototype.addLayer.apply (this, arguments);
	this.setLayerAttributions();
	return l;
}

/** 
*	Set the API key to a group of layers 
*/
ol.layer.Group.prototype.setGPPKey = function(key, authentication)
{	this.getLayers().forEach( function(layer)
	{	if (layer.getSource && layer.getSource() && layer.getSource().setGPPKey) {
			layer.getSource().setGPPKey(key, authentication);
		}
		else if (layer.getLayers && layer.setGPPKey) {
			layer.setGPPKey(key, authentication);
		}
	});
}

/** Usefull functions
*/

/**
 * Get layers in a map giving his name
 * @param {String|RegExp} exp The name of the layer or a regexp.
 * @return {Array<ol.layer>} an array of layer
 * @api stable
 */
ol.Map.prototype.getLayersByName = function(exp)
{	return this.getLayersBy("name",exp);
}

/**
 * Get layers in a map giving an attribute
 * @param {String} n Name of the attribute to search for.
 * @param {String|RegExp} exp attribute of the layer or a regexp.
 * @return {Array<ol.layer>} an array of layer
 * @api stable
 */
ol.Map.prototype.getLayersBy = function(n,exp)
{	if (!(exp instanceof RegExp)) exp = new RegExp(exp);
	var layers = [];
	function findLayers(o)
	{	o.getLayers().getArray().forEach(function(l)
		{	if (exp.test(l.get(n))) layers.push(l);
			if (l.getLayers) findLayers(l);
		});
	}
	findLayers(this);
	return layers;
}

/**
 * Set the center of the current view.
 * @param {ol.Coordinate} center The center of the view in EPSG:4326.
 * @param {number} zoom Zoom level.
 * @api stable
 */
 ol.View.prototype.setCenterAtLonlat = function(lonlat, zoom)
{	this.setCenter (ol.proj.transform(lonlat, 'EPSG:4326', this.getProjection()));
	if (zoom) this.setZoom(zoom);
}


/**
 * Static function : ol.Attribution.getUniqueAttribution
 * Get a unique attribution ie. with the same attribution markup.
 * if a key is provided get the attribution corresponding to the key.
 * @param {olx.AttributionOptions} options Attribution options.
 * @return {ol.Attribution} The attribution HTML.
 * @api stable
 */
ol.Attribution.uniqueAttributionList = [];
ol.Attribution.uniqueAttributionKey = {};

ol.Attribution.getUniqueAttribution = function(a, key)
{	if (!a) a = { html:"" };
	if (typeof(a)=="string") a = {html:a};
	if (key)
	{	var attr = this.uniqueAttributionKey[key];
		if (!attr)
		{	attr = this.uniqueAttributionKey[key] = new ol.Attribution(a);
		}
		return attr;
	}
	else
	{
		// Search existing
		for (var i=0; i<this.uniqueAttributionList.length; i++)
			if (this.uniqueAttributionList[i].getHTML() == a.html) return this.uniqueAttributionList[i];
		// Create new one
		var u = new ol.Attribution(a);
		this.uniqueAttributionList.push(u);
		return u;
	}
};
