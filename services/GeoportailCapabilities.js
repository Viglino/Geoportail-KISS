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
	var l = new OpenLayers.Layer.WMS( options.title || layer.title, layer.url, 
				{	layers: layer.name,
					format: format || layer.formats[0],
					transparent: true
				},options);
	return l;
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
		var btn;
		if (options.onSelect) btn = $("<button>").text(options.selectText || "Select").appendTo(self);
		var info = $("<div>").appendTo(self);
		select.on ("change", function()
			{	var n = $("option:selected", this).val();
				var l = layers[n];
				info.html("");
				$("<h1>").text(l['title']).appendTo(info);
				$("<p>").text(l['abstract'] || "").appendTo(info);
				if (l.styles)
				{	for (var i in l.styles) if (l.styles[i].legend)
					{	$("<img>").attr("src",l.styles[i].legend.href).appendTo(info);
					}
				}
				if (options.onChange) options.onChange(cap.getLayerFromCap(l));
			});
		if (options.onSelect) btn.click(function()
			{	var n = $("option:selected", select).val();
				if (typeof n == "undefined") return;
				info.html("");
				options.onSelect(cap.getLayerFromCap(layers[n]));
			})
		for (var i=0; i<layers.length; i++) 
		{	$("<option>").text(layers[i].name)
					.val(i)
					.appendTo(select);
		}
	});
}

}( jQuery ));
