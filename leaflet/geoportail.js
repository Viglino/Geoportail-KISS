/*
	Copyright (c) 2013 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
	L.TileLayer.Geoportail : IGN's Geoportail WMTS layer definition
	
 */

L.TileLayer.Geoportail = L.TileLayer.extend(
{	/** APIProperty: attributionIGN
	*	Define the attribution text to use on the map
	*/
	attributionIGN :
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
	*	key - geoportal API key
	*	layer - {String} Layer name as defined by the service
	*	options - {Object} Configuration properties for the layer.
	*
	*	Any other documented layer properties can be provided in the config object.
	*
	*/
	initialize: function (key, layer, options) 
	{	// Get apiKey capabilities or defaults
		this.capabilities = geoportailConfig.capabilities[key] || geoportailConfig.capabilities["default"];
		
		// Default attributions
		switch (layer)
		{	case "ORTHOIMAGERY.ORTHOPHOTOS":
				this.options.attribution = this.attributionIGN.c_ign + this.attributionIGN.c_planet + this.attributionIGN.logoGeop;
				break;
			default:
				this.options.attribution = this.attributionIGN.c_ign + this.attributionIGN.logoGeop;
				break;
		}
		// Default options
		if (this.capabilities && this.capabilities[layer]) 
		{	this.options.format = this.capabilities[layer].format;
			this.options.minZoom = this.capabilities[layer].minZoom;
			this.options.maxZoom = this.capabilities[layer].maxZoom;
			this.options.style = this.capabilities[layer].style;
			this.title = this.capabilities[layer].title;
		}
		else 
		{	this.options.format = "image/png";
			this.options.style = "normal";
		}
		L.setOptions(this, options);
		
		// Calculate url
		this._url = geoportailConfig.url+ key + "/wmts?LAYER=" + layer
				+"&EXCEPTIONS=text/xml&FORMAT="+this.options.format+"&SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&STYLE="+this.options.style+"&TILEMATRIXSET=PM"
				+"&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}" ;
		
		//console.log(this.options);
	}

});

/* Plugin tileLayer.geoportail
*/
L.tileLayer.geoportail = function (key, layer, options) 
{	return new L.TileLayer.Geoportail(key, layer, options);
};