/*
	Copyright (c) 2013 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
	jQuery plugin for Leaflet Geoportal maps.
	Create a Leaflet map in a div.
	$("#map").geoportail();
	
	Create a map in ".geoportalMap" div on document load.
	
 */
(function ( $ ) {

jQuery.fn.geoportail = function() 
{
	/** Get "data-coord"
	*/
	function getCoord(o)
	{	var coord = $(o).data("coord") || "";
		coord = coord.split(",");
		return {	lon : coord[0] || false,
					lat : coord[1] || false,
					z : coord[2]
				}
	};
	
	/** Get Layers of the map
	*/
	function getLayers (gpdiv, overlay)
	{	var i;
		var tlayers = [];
		var c = overlay ? ".geoportalOverlay" : ".geoportalLayer";
		var d = overlay ? "data-overlay" : "data-layer";
		
		// div.geoportalLayer 
		var data;
		$(c, gpdiv).each(function()
		{	data = $(this).data();
			if (data.layer) tlayers.push( 
					{	name: $(this).attr("title"), 
						layer: data.layer, 
						visibility: $(this).css("visibility")!=="hidden" , 
						opacity: $(this).css("opacity") 
					});
		});

		// data-layer de la carte
		var dlayers = (gpdiv.attr(d) || "").split("|");
		for (var i=0; i<dlayers.length; i++)
		{	if (dlayers[i]) tlayers.push( { layer:dlayers[i], visibility:false, opacity:1 } );
		}
		
		// Noms simples => noms compliques
		for (i=0; i<tlayers.length; i++)
		{	switch(tlayers[i].layer)
			{	case "PHOTO": 		tlayers[i].layer = "ORTHOIMAGERY.ORTHOPHOTOS"; break;
				case "MAP": 		tlayers[i].layer = "GEOGRAPHICALGRIDSYSTEMS.MAPS"; break;
				case "PARCELS": 	tlayers[i].layer = "CADASTRALPARCELS.PARCELS"; break;
				case "ROADS": 		tlayers[i].layer = "TRANSPORTNETWORKS.ROADS"; break;
				case "ETATMAJOR40":	tlayers[i].layer = "GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40"; break;
				default: break;
			}
		}
			
		// Afficher au moins la carte IGN
		if (!overlay && !tlayers.length) tlayers = [ { layer:"GEOGRAPHICALGRIDSYSTEMS.MAPS", visibility:true, opacity:1 } ];
		
		return tlayers;
	};
	
	/** Convert file (GeoJSON/KML/GPX) to GeoJSON
	*/
	function getJSON (src)
	{	var ext =  src.split('.').pop().toLowerCase();
		var xml = $.ajax({
			type: "GET",
			url: src,
			async: false
		}).responseText;
		// ok
		if (xml)
		{	switch (ext)
			{	case "gpx":
				case "kml":
				{	if (window.DOMParser)
					{	parser=new DOMParser();
						xmlDoc=parser.parseFromString(xml,"text/xml");
					}
					else // code for IE
					{	xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
						xmlDoc.async=false;
						xmlDoc.loadXML(xml);
					}
					return toGeoJSON[ext](xmlDoc);
				}
				default:
				{	return $.parseJSON(xml);
				}
			}
		}
	};

	/** Add css calue
	*/
	function addCSS (o, d)
	{	o.visibility= d.css("visibility")!=="hidden";
		o.color= d.css("color");
		o.fillColor= d.css("background-color");
		o.opacity= d.css("opacity");
		o.width= d.width();
	};
	
	/** Decode HTML tags of the map
	*/
	function decodeGeoportalDiv(gpdiv)
	{	// Recuperer les attributs de la carte
		var gpp = gpdiv.data();

		// Identifiant de la carte
		gpp.id = gpdiv.attr("id");
		if (!gpp.id) 
		{	var c = 0;
			while ($("#jqmap"+c).length) c++;
			gpp.id = "jqmap"+c;
			gpdiv.attr("id", gpp.id);
		}
		
		// Centrage de la carte
		var coord = getCoord(gpdiv)
		gpp.lon = (coord.lon===false) ? 48.84475 : coord.lon;
		gpp.lat = (coord.lat===false) ? 2.4237 : coord.lat;
		if (!gpp.zoom) gpp.zoom = coord.z || 17;
	
		// CERCLES
		gpp.circles = [];
		$(".geoportalCircle", gpdiv).each(function()
		{	var coord = getCoord(this);
			var c =	
				{ 	lon:coord.lon, 
					lat:coord.lat, 
					r:coord.z, 
					html:$(this).html() 
				};
			addCSS (c, $(this));
			gpp.circles.push( c );
			if ($(this).data("center")==true)
			{	gpp.lon = coord.lon;
				gpp.lat = coord.lat;
			}
		});
		
		// MARKERS
		gpp.markers = [];
		$(".geoportalPin", gpdiv).each(function()
		{	var coord = getCoord(this);
			gpp.markers.push( { lon:coord.lon, lat:coord.lat, html:$(this).html() } );
			if ($(this).data("center")==true)
			{	gpp.lon = coord.lon;
				gpp.lat = coord.lat;
			}
		});
		if (gpp["pin"]) 
		{	var m = { lon:gpp.lon, lat:gpp.lat };
			if (!$(".geoportalContainer",  gpdiv).length) m.html = gpdiv.html();
			gpp.markers.push( m );
		}

		// LAYERS
		gpp.layers = getLayers(gpdiv);
		gpp.overlays = getLayers(gpdiv, true);
		
		// Geojson
		gpp.gjson = [];
		var gjson = $("a.geoportalFile", gpdiv);
		gjson.each (function()
			{	var self = $(this);
				var js = { 	
					name: self.attr("title"), 
					data: getJSON($(this).attr("href")),
					popup: self.data("popup")
				};
				addCSS (js, self);
				gpp.gjson.push (js);
			});

		return gpp;
	};
	
	/** Get a leaflet layer
	*/
	function getLeafletLayer(apiKey, layer)
	{	var l;
		switch (layer.layer)
		{	case "OSM" : 
				l = { name:"OpenStreetMap", layer:L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'}) };
				break;
			default:
				l = { layer:L.tileLayer.geoportail (apiKey, layer.layer, { opacity:layer.opacity }) }; 
				l.name = layer.name || String(l.layer.title);
				break;
		}
		return l;
	};
	
	// Go!
	return this.each(function()
	{	var i, self = $(this);
		
		// Get geoportail params on the div
		var geop = decodeGeoportalDiv($(this));
	
		//** LAYERS
		var l, layers = {};
		var visible = [];
		for (i=0; i<geop.layers.length; i++)
		{	l = getLeafletLayer(geop.apikey, geop.layers[i]);
			layers[l.name] = l.layer;
			if (!visible.length || geop.layers[i].visibility) visible = [l.layer];
		}

		//** OVERLAYS
		var overlays=[];
		for (i=0; i<geop.overlays.length; i++)
		{	l = getLeafletLayer(geop.apikey, geop.overlays[i]);
			overlays[l.name] = l.layer;
			if (geop.overlays[i].visibility) visible.push(l.layer);
		}

		//** GeoJSON / KML / GPX
		function onEachFeature(feature, layer) 
		{	if (feature.properties && feature.properties.name) 
			{	var t = "<h1>"+feature.properties.name+"</h1>" + (feature.properties.description || "");
				layer.bindPopup(t);
			}
		}
		for (i=0; i<geop.gjson.length; i++)
		{	var data = geop.gjson[i].data;
			try	{	
				l = L.geoJson (data, 
					{	onEachFeature: geop.gjson[i].popup ? onEachFeature:null,
						style: 
						{ 	color:geop.gjson[i].color, 
							opacity:geop.gjson[i].opacity, 
							weight:geop.gjson[i].width, 
							fillColor:geop.gjson[i].fillColor 
						} } );
				overlays[geop.gjson[i].name] = l;
				if (geop.gjson[i].visibility) visible.push(l);
			}
			catch(e) { console.log("Error parsing GeoJSON file."); }
		}

		// Nettoyer
		self.html("").css("background-image","none");
		// La carte Leaflet
		var map = L.map(geop.id, {
			center: new L.LatLng(geop.lon,geop.lat),
			zoom: geop.zoom,
			layers: visible
		});
		
		// Sauver la carte dans la div
		self.data("map", map);
		
		// Ajouter un controle pour le choix des couches
		L.control.layers(layers,overlays).addTo(map);
		// Afficher un echelle
		if (geop.scale) L.control.scale({'position':'bottomleft','metric':true,'imperial':false}).addTo(map);
		// ...des cercles...
		for (var i=0; i<geop.circles.length; i++)
		{	var m = L.circle( [geop.circles[i].lon,geop.circles[i].lat], 
							geop.circles[i].r, 
							{ 	color:geop.circles[i].color,
								weight:geop.circles[i].width
							}).addTo(map);
			if (geop.circles[i].html) m.bindPopup(geop.circles[i].html);//.openPopup();
		}
		// ...et les punaises
		for (var i=0; i<geop.markers.length; i++)
		{	var m = L.marker([geop.markers[i].lon,geop.markers[i].lat]).addTo(map);
			if (geop.markers[i].html) m.bindPopup(geop.markers[i].html);//.openPopup();
		}
		
	});
};

}( jQuery ));

$(document).ready ( function()
{	$(".geoportalMap").geoportail(); 
});