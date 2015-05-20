/*
	Copyright (c) 2013 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
	OpenLayers.Map.Geoportail : IGN's Geoportail Map definition
	OpenLayers.Layer.Geoportail : IGN's Geoportail WMTS layer definition
*/

/** Class: OpenLayers.Map.Geoportail
*	Instances of a Geoportail Map.
*
*	Inherits from:
*	- <OpenLayers.Map>
*/ 
OpenLayers.Map.Geoportail = OpenLayers.Class(OpenLayers.Map,
{	/**	APIProperty: apiKey
	*	Geoportail API key, used to add new Geoportail layers
	*/
	gppKey:null,
	
	/** Constructor: OpenLayers.Map.Geoportail
	*	Create a new Geoportail Map.
	*
	*	Parameters:
	*	key - {String} API key
	*	div - {DOMElement|String}  The element or id of an element in your page
	*		that will contain the map.  May be omitted if the <div> option is
	*		provided or if you intend to call the <render> method later.
	*	options - {Object} Optional object with properties to tag onto the map.
	*/
	initialize: function (apiKey, div, options)
	{	if (!options) options={};
		//options = OpenLayers.Util.extend( { projection:"EPSG:3857" }, options);
		options = OpenLayers.Util.extend( { projection:"EPSG:900913" }, options);
		this.gppKey = apiKey;
		OpenLayers.Map.prototype.initialize.apply(this, [div, options]);
	},
	
	/** APIMethod: setCenterAtLonlat
    *	Set the map center (and optionally, the zoom level).
	*	Parameters:
	*	lonlat - {<OpenLayers.LonLat>} The new center location in EPSG:4326 projection.
	*     If provided as array, the first value is the x coordinate, and the 2nd value is the y coordinate.
	*	  If provides as array(4), suppose to be a bbox
	*	zoom - {Integer} Optional zoom level.
	*/
	setCenterAtLonlat: function (lonlat, zoom)
	{	// extend
		if (lonlat && lonlat.length==4)
		{	var l1 = new OpenLayers.LonLat([lonlat[0],lonlat[1]]);
			var l2 = new OpenLayers.LonLat([lonlat[2],lonlat[3]]);
			var t = new OpenLayers.Projection('EPSG:4326');
			l1.transform(t, this.getProjectionObject());
			l2.transform(t, this.getProjectionObject());
			this.zoomToExtent ([Math.min(l1.lon,l2.lon),Math.min(l1.lat,l2.lat),Math.max(l1.lon,l2.lon),Math.max(l1.lat,l2.lat)]);
		}
		// Centrer
		else
		{	if (lonlat != null && !(lonlat instanceof OpenLayers.LonLat)) 
				lonlat = new OpenLayers.LonLat(lonlat);
			if (zoom) zoom = zoom-(this.baseLayer ? this.baseLayer.minZoom : 0);
			this.setCenter (lonlat.transform(new OpenLayers.Projection('EPSG:4326'), this.getProjectionObject()), zoom);
		}
	},

	/** APIMethod: getCenterLonlat
    *	Get the map center.
	*	Return:
	*	lonlat - {<OpenLayers.LonLat>} The center location in EPSG:4326 projection.
	*/
	getCenterLonlat: function ()
	{	var lonlat = this.getCenter().clone();
		return lonlat.transform(this.getProjectionObject(),new OpenLayers.Projection('EPSG:4326'));
	},
	
    /** APIMethod: addGeoportailLayers 
    *	Add OpenLayers.Layer.Geoportail to the map
    *	Parameters:
    *	layers - {<String>|Array(<String>)} 
    *	options - 
    */
    addGeoportailLayers : function (layers, options)
	{	if (typeof(layers)=='string') layers = [layers];
		for (var i=0; i<layers.length; i++)
			this.addLayer (new OpenLayers.Layer.Geoportail (layers[i], options));
	},
	
	/** APIMethod: showLayers
	*	Show a layer or a group of layers in a regexp
    *	Parameters:
	*	- layers : {<String>|<RegExp>)} 
	*	- classname :  {<String>|<RegExp>)} 
	*/
	showLayers: function (layers, classname)
	{	if (!classname) classname=/Geoportail/;
		for (var i=0; i<this.layers.length; i++) 
		{	if (this.layers[i].CLASS_NAME.match(classname)) wapp.map.layers[i].setVisibility(false);
		}
		var l = this.getLayersBy("layer",layers);
		for (var i=0; i<l.length; i++) if (this.layers[i].CLASS_NAME.match(classname))
		{	if (l[i].isBaseLayer) this.setBaseLayer(l[i]);
			l[i].setVisibility(true);
		}
	},
	
	CLASS_NAME: "OpenLayers.Map.Geoportail"
}); 

/** Class: OpenLayers.Layer.Geoportail
*	Instances of OpenLayers.Layer.Geoportail are used to render Geoportail layers
*
* Inherits from:
*  - <OpenLayers.Layer.WMTS>
*/
OpenLayers.Layer.Geoportail = OpenLayers.Class(OpenLayers.Layer.WMTS, 
{	/** Autodetect HR/LR orthoimagery tiles
	*/
	AUTODETECT_LR: true,

	/** APIProperty: attributionIGN
	*	Attribution table
	*/
	attributionIGN:
	{	c_ign : " &copy; <a href='http://www.ign.fr/'>IGN-France</a> ",
		c_planet: " - <a href='http://www.planetobserver.com/'>Planet Observer</a> ",
		logoGeop : " <a class='attribution-ign' href='http://www.geoportail.fr/'><img src='http://api.ign.fr/geoportail/api/js/2.0.3/theme/geoportal/img/logo_gp.gif' /></a> "
	},
	
	/** APIProperty: capabilities
	*	Capabilities of the Geoportail services
	*/
	capabilities : {},
	
	/** Constructor: OpenLayers.Layer.Geoportail
	*	Create a new Geoportail layer.
	*	Parameters:
	*	layer - {String} Layer name as defined by the service
	*	options - {Object} Configuration properties for the layer.
	*
	*	Any other documented layer properties can be provided in the config object.
	*
	*	Additional options :
	*	- gppKey : geoportal API key, if none is provided the map API key is used instead when used with an OpenLayers.Map.Geoportail
	*	- minZoom - maxZoom : zoom range for layer visibility (use client zoom if different from server resolution)
	*	- minZoomLevel - maxZoomLevel : zoom range for server resolution restriction
	*
	*/
	initialize: function (layer, options)
	{	if (!options) options={};
		// Get apiKey capabilities or defaults
		this.capabilities = geoportailConfig.capabilities[options.key] || geoportailConfig.capabilities["default"];
		this.gppKey = options.key;
		// Default options
		var opt = 
		{	url: geoportailConfig.url + options.key + "/wmts",
			layer: layer,
			matrixSet: "PM",
			style: this.capabilities[layer] ? this.capabilities[layer].style : "normal",
			name: this.capabilities[layer] ? this.capabilities[layer].title : "Carte",
			format: this.capabilities[layer] ? this.capabilities[layer].format : "image/png",
			minZoom : this.capabilities[layer] ? this.capabilities[layer].minZoom : 0,
			maxZoom : this.capabilities[layer] ? this.capabilities[layer].maxZoom : 18,
			visibility : this.capabilities[layer] && this.capabilities[layer].visibility ? this.capabilities[layer].visibility : false,
			displayInLayerSwitcher : this.capabilities[layer] ? this.capabilities[layer].displayInLayerSwitcher : true,
			attribution: this.attributionIGN.c_ign+this.attributionIGN.logoGeop,
			tileFullExtent: (this.capabilities[layer] && this.capabilities[layer].bbox) ? new OpenLayers.Bounds (this.capabilities[layer].bbox) : null,
			exceptions: "text/xml"
		};

		var geopresolutions = [156543.03390625,78271.516953125,39135.7584765625,19567.87923828125,9783.939619140625,4891.9698095703125,2445.9849047851562,1222.9924523925781,611.4962261962891,305.74811309814453,152.87405654907226,76.43702827453613,38.218514137268066,19.109257068634033,9.554628534317017,4.777314267158508,2.388657133579254,1.194328566789627,0.5971642833948135,0.29858214169740677,0.14929107084870338];
		
		// Serveur resolutions 
		options.serverResolutions = [];
		for (var i= (options.minZoomLevel || opt.minZoom); i<= (options.maxZoomLevel || opt.maxZoom); i++) options.serverResolutions.push(geopresolutions[i]);
		options.zoomOffset = opt.minZoom;

		options = OpenLayers.Util.extend(OpenLayers.Util.extend({}, opt), options);

		// Layer resolution
		options.resolutions = [];
		for (var i=options.minZoom; i<=options.maxZoom; i++) options.resolutions.push(geopresolutions[i]);
		options.transitionEffect = 'resize';

		// Load error (detect tile load error)
		options.tileOptions = 
		{	eventListeners: 
			{	'loaderror': function(evt) 
				{	this.imgDiv.src = OpenLayers.Util.getImageLocation("blank.gif");
					this.layer.isLoadError = true;
					// console.log ("loaderror");
				}
			}
		};
		//
		// OpenLayers.Util.onImageLoadErrorColor = "transparent";
		OpenLayers.Layer.WMTS.prototype.initialize.apply(this, [options]);

		/* Autodetect HR/LR orthoimagery tiles and switch to resample mode for LR tiles (when load error occurs)
			HR tiles have serverResolutions up to level 20
			LR tiles have serverResolutions up to level 19
		*/
		if (this.AUTODETECT_LR && layer == "ORTHOIMAGERY.ORTHOPHOTOS" && this.serverResolutions[19] == geopresolutions[19])
		{	this.events.register("moveend", this, function(e)
				{	// Switch to standard mode (HR)
					if (e.zoomChanged && this.map.zoom < 19 && this.serverResolutions.length != 20)
					{      this.serverResolutions.push (geopresolutions[19]);
					}
				});
			this.events.register("loadend", this, function(e)
				{	// Switch to resample mode (LR)
					if (this.isLoadError && this.map.zoom > 18 && this.serverResolutions.length==20)
					{	this.serverResolutions.pop();
						this.redraw();
					}
					this.isLoadError = false;
				});
		}

	},

    /** 
     * Method: setMap
     *
     * Properties:
     * map - {<OpenLayers.Map>} 
     */
    setMap: function(map) 
	{   OpenLayers.Layer.WMTS.prototype.setMap.apply(this, arguments);
		// Set the Geoportal Key if no one is provided
		if (!this.gppKey) 
		{	this.gppKey = map.gppKey;
			this.url = geoportailConfig.url + this.gppKey + "/wmts";
		}
        // Change tileExtent projection
		if (this.tileFullExtent) 
		{	var proj = map.getProjectionObject();
			if (!proj) proj = new OpenLayers.Projection(map.projection);
			this.tileFullExtent.transform(new OpenLayers.Projection('EPSG:4326'), proj);
		}
	},
	
	/**
     * Method: getServerZoom
     * Return the zoom value corresponding to the best matching server
     * resolution, taking into account <serverResolutions> and <zoomOffset> and <baseLayer.minZoom>.
     *
     * Returns:
     * {Number} The closest server supported zoom. This is not the map zoom
     *     level, but an index of the server's resolutions array.
     */
	getServerZoom: function() 
	{   var resolution = this.getServerResolution();
		var zoomOffset = (!this.isBaseLayer && this.map.baseLayer) ? this.map.baseLayer.minZoom : this.zoomOffset;
        return this.map.getZoomForResolution(resolution) + (zoomOffset || 0);
		/*
        return this.serverResolutions ?
            OpenLayers.Util.indexOf(this.serverResolutions, resolution) :
            this.map.getZoomForResolution(resolution) + (zoomOffset || 0);
		*/
    },

    CLASS_NAME: "OpenLayers.Layer.Geoportail"
	
});
