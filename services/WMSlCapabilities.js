/** 
	WMS Layer with EPSG:4326 projection.
	The tiles will be reprojected to map pojection (EPSG:3857).
	NB: reduce tileSize to minimize deformations on small scales.
*/
(function(){
var proj = new OpenLayers.Projection("EPSG:4326");

OpenLayers.Layer.WMS4326 = OpenLayers.Class(OpenLayers.Layer.WMS, 
{
	initialize: function(name, url, params, options) {
		options.singleTile = false;
		OpenLayers.Layer.WMS.prototype.initialize.apply(this, arguments);
	},

	getURL: function (bounds) 
	{	// recalculate bounds from map projection to WGS84
		bounds = bounds.clone().transform(this.map.projection, proj);

		var imageSize = this.getImageSize();
		// WMS 1.3 introduced axis order
		var reverseAxisOrder = this.reverseAxisOrder();
		var bbox = this.encodeBBOX ?
			bounds.toBBOX(null, reverseAxisOrder) :
			bounds.toArray(reverseAxisOrder);

        // construct WMS request
		var url = this.url;
			url += "?REQUEST=GetMap";
			url += "&SERVICE=WMS";
			url += "&VERSION=" + this.params.VERSION;
			url += "&LAYERS=" + this.params.LAYERS;
			url += "&FORMAT=" + this.params.FORMAT;
			url += "&TRANSPARENT=" + (this.params.TRANSPARENT ? "TRUE" : "FALSE");
			url += (parseFloat(this.params.VERSION) >= 1.3 ? "&CRS=" + "EPSG:4326" : "&SRS=" + "EPSG:4326");
			url += "&BBOX=" + bbox;
			url += "&WIDTH=" + imageSize.w;
			url += "&HEIGHT=" + imageSize.h;
        return url;
    }
});
})();

/** WMSCapabilities
*/
var WMSCapabilities = function (proxy)
{	if (proxy)
	{	OpenLayers.ProxyHost= function(url) 
		{	return proxy+"?url=" + encodeURIComponent(url);
		};
	}
};


WMSCapabilities.prototype.getLayerFromCap = function(layer, options)
{	if (!options) options={};
	options = OpenLayers.Util.extend(
		{	isBaseLayer: false,
			minScale: layer.minScale,
			maxScale: layer.maxScale,
			attribution: layer.attribution
		}, options);
	var format = false;
	// Look for prefered format first
	var pref =[/png/,/jpeg/,/gif/];
	for (var i=0; i<3; i++)
	{	for (var f=0; f<layer.formats.length; f++)
		{	if (pref[i].test(layer.formats[f]))
			{	format=layer.formats[f];
				break;
			}
		}
		if (format) break;
	}
	if (!format) format = layer.formats[0];

	// Check srs
	var wms, srs = options.srs;
	delete (options.srs);
	if (srs && !layer.srs[srs] && layer.srs["EPSG:4326"]) wms = "WMS4326";
	else wms = "WMS";

	// Trace
	if (WMSCapabilities.prototype.trace)
	{	console.log ("OpenLayers.Layer."+wms+" (\"" +(options.title || layer.title)+ "\", \""+ layer.url +"\", "
		+ JSON.stringify ({	layers: layer.name,
				format: format,
				transparent: true
			}) +", "
		+ JSON.stringify(options) +")" );
	}
	return new OpenLayers.Layer[wms] ( options.title || layer.title, layer.url, 
		{	layers: layer.name,
			format: format,
			transparent: true
		}, options);
};


WMSCapabilities.prototype.get = function(url, callback, version) 
{	OpenLayers.Request.GET(
	{   url: url,
		params: 
		{	SERVICE: "WMS",
			VERSION: version || "1.3.0",
			REQUEST: "GetCapabilities"
		},
		success: function(request) 
		{   var doc = request.responseXML;
			if (!doc || !doc.documentElement) doc = request.responseText;

			var format = new OpenLayers.Format.WMSCapabilities({ version: version || "1.3.0" });
			var capabilities = format.read(doc);
			if (!capabilities.capability && capabilities.error && capabilities.error.version)
			{	format = new OpenLayers.Format.WMSCapabilities();
				capabilities = format.read(doc);
			}
			var layers;
			if (!capabilities.capability) layers = [];
			else layers	= capabilities.capability.layers;
			for (var i=0; i<layers.length; i++) layers[i].url = url;
			
			if (callback) callback (layers);
		}, 
		failure: function() 
		{   OpenLayers.Console.error("...error...");
			if (callback) callback (false);
		}
	});
};

WMSCapabilities.prototype.getLayers = function(url, callback) 
{	var self = this;
	this.get(url, function(layers)
	{	if (layers) for (var i=0; i<layers.length; i++) 
		{	layers[i] = self.getLayerFromCap(layers[i]);
		}
		if (callback) callback (layers);
	});
};


/** jQuery plugin to get capabilities
*/
(function ( $ ) {

jQuery.fn.wmsCapabilities = function(url, options)
{	if (!options) options={};
	var self = this;
	self.html("").addClass("loading");
	var cap = new WMSCapabilities(options.proxy);
	cap.get(url, function(layers)
	{	self.removeClass("loading");
		if (!layers || !layers.length)
		{	$("<p>").addClass("error").text("Chargement impossible...").appendTo(self);
			return;
		}
		var select = $("<select>").appendTo(self);
		if (options.selectSize) select.attr("size", options.selectSize);
		var btn, proj;
		if (options.onSelect) btn = $("<button>").text(options.selectText || "Select").appendTo(self);
		if (options.srs) 
		{	proj = $("<input type='checkbox'>");
			$("<label>").text(options.reprojectText || "Reproject").appendTo(self).append(proj);
		}
		var info = $("<div>").appendTo(self);
		select.on ("change", function()
			{	var n = $("option:selected", this).val();
				var l = layers[n];
				if (options.srs)
				{	if (!l.srs[options.srs]) proj.prop("checked","checked");
					else proj.prop("checked","");
				}
				info.html("");
				$("<h1>").text(l['title']).appendTo(info);
				$("<p>").text(l['abstract'] || "").appendTo(info);
				if (l.styles)
				{	for (var i in l.styles) if (l.styles[i].legend)
					{	$("<img>").attr("src",l.styles[i].legend.href).appendTo(info);
					}
				}
				if (options.onChange) options.onChange(cap.getLayerFromCap(l,{srs:options.srs}));
			});
		if (options.onSelect) btn.click(function()
			{	var n = $("option:selected", select).val();
				if (typeof n == "undefined") return;
				info.html("");
				options.onSelect(cap.getLayerFromCap(layers[n],{ srs:(proj.prop("checked")?options.srs:false) }));
			})
		for (var i=0; i<layers.length; i++) 
		{	$("<option>").text(layers[i].name)
					.val(i)
					.appendTo(select);
		}
	});
}

}( jQuery ));
