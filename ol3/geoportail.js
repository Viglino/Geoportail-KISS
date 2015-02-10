/**
* @constructor IGN's Geoportail WMTS layer definition
* @extends {ol.source.WMTS}
* @param {String=} key API key.
* @param {String=} layer Layer name.
* @param {olx.source.OSMOptions=} options WMTS options.
* @todo 
*/
ol.source.Geoportail = function(key, layer, options)
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
		{	url: "http://wxs.ign.fr/" + key + "/wmts",
			layer: layer,
			matrixSet: "PM",
			format: options.format ? options.format:"image/jpeg",
			projection: "EPSG:3857",
			tileGrid: tg,
			style: options.style ? options.style:"normal",
			attributions: attr
		});	
};
ol.inherits (ol.source.Geoportail, ol.source.WMTS);

// Attribution standard
ol.source.Geoportail.prototype.attribution = new ol.Attribution
({	html: '<a href="http://www.geoportail.gouv.fr/">Géoportail</a> &copy; <a href="http://www.ign.fr/">IGN-France</a>'
});