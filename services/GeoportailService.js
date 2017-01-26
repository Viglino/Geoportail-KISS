/*
	Copyright (c) 2013 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
	GeoportailService : IGN's Geoportail srvices definition
	
	# Geocode OpenLS services :
	 - geocode : Adress / geographical names search 
	 - reverseGeocode : reverse search
	 - autocomplete : autocompletion
	
	# Altimetric services :
	 - altimetry : altimetric search on IGN's BDAlti(r) 75m DTM
	
	doc : http://api.ign.fr/tech-docs-js/fr/developpeur/search.html
	http://depot.ign.fr/geoportail/api/develop/tech-docs-js/fr/developpeur/search.html
	http://depot.ign.fr/geoportail/api/develop/tech-docs-js/fr/developpeur/alti.html
	
	Dependencies : jQuery
*/
var GeoportailService = function (apiKey, proxy)
{	// Decodage d'une adresse
	this.decodeAdresse = function(a)
	{	var r =
		{	place:
			{	municipality: a.find("Place[type=Municipality]").text(),
				qualite: a.find("Place[type=Qualite]").text(),
				commune: a.find("Place[type=Commune]").text(),
				departement: a.find("Place[type=Departement]").text(),
				insee: a.find("Place[type=INSEE]").text(),
				nature: a.find("Place[type=Nature]").text(),
				importance: a.find("Place[type=Importance]").text(),
				territoire: a.find("Place[type=Territoire]").text(),
				id_adresse: a.find("Place[type=ID]").text()
			},
			bbox: a.find("Place[type=Bbox]").text().split(';')
		}

		// Parcelle
		if (a.find("Address").attr("countryCode")==	"CadastralParcel")
		{	r.parcelle = 
			{	id: a.find("Street").text(),
				numero: a.find("Place[type=Numero]").text(),
				feuille: a.find("Place[type=Feuille]").text(),
				section: a.find("Place[type=Section]").text(),
				departement: a.find("Place[type=Departement]").text(),
				commune: a.find("Place[type=Commune]").text(),
				communeAbsorbee: a.find("Place[type=CommuneAbsorbee]").text(),
				arrondissement: a.find("Place[type=Arrondissement]").text(),
				insee: a.find("Place[type=INSEE]").text()
			}
		}

		r.match = { distance: Number(a.find("SearchCentreDistance").attr("value")) };
		var t = a.find("GeocodeMatchCode");
		if (t.length)
		{	r.match['type'] = t.attr('matchType');
			r.match.accuracy = t.attr('accuracy');
		}
		t = a.find("ExtendedGeocodeMatchCode");
		if (t.length)
		{	r.match['type'] =  t.text();
		}
		var sa = a.find("StreetAddress");
		r.adresse =
		{	num: sa.find("Building").attr("number"),
			rue: sa.find("Street").text(),
			cpost: a.find ("PostalCode").text()
		};
		// Position
		var p = $(a).find("pos").text().split(' ');
		r.lon = Number(p[1]);
		r.lat = Number(p[0]);
		return r;
	};
	
	// Encapsulation dans une requete XLS
	this.xlsRequest = function(query)
	{	return '<?xml version="1.0" encoding="UTF-8"?>'
			+'<XLS version="1.2"'
			+'    xmlns:xls="http://www.opengis.net/xls"'
			+'    xmlns:gml="http://www.opengis.net/gml"'
			+'    xmlns="http://www.opengis.net/xls"'
			+'    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
			+'    xsi:schemaLocation="http://www.opengis.net/xls http://schemas.opengis.net/ols/1.2/olsAll.xsd">'
			+'  <RequestHeader/>'
			+ query 
			+'</XLS>';
			
	};

	/** Recherche par adresse
		@param (String) : adresse
		@param callback (function) : fontion de retour
		@param options
			{	bbox (object) : {lonmin, latmin, lonmax, latmax }
				poi (bool) : recherche d'un poi
			}
		@return dans callback (false si pas de reponse)
		[	{	lon, lat:
				adresse:
				{	num: 
					rue:
				}
				bbox:
				[ lonmin, latmin, lonmax, latmax ]
				match:
				{	occuracy: 
					type:
				}
				place:
				{	commune:
					departement:
					insee:
					municipality:
					qualite:
					territoire:
				}
			}
		]
	*/
	this.geocode = function (queryString, callback, options)
	{	if (!options) options={};
		var self = this;
		/*
		<?xml version="1.0" encoding="UTF-8"?><xls:XLS xmlns:xls="http://www.opengis.net/xls" version="1.2"><xls:RequestHeader sessionID=""/><xls:Request methodName="GeocodeRequest" version="1.2" requestID=""><xls:GeocodeRequest><xls:Address countryCode="StreetAddress"><xls:freeFormAddress>152 rue claude nicolas ledoux, 30900 NÎMES</xls:freeFormAddress></xls:Address></xls:GeocodeRequest></xls:Request></xls:XLS>
		*/
		// LocationUtilityService
		var xls = '  <Request requestID="1" version="1.2" methodName="GeocodeRequest" maximumResponses="'+(options.max?options.max:10)+'">'
			+'   <GeocodeRequest returnFreeForm="false">'
			+'     <Address countryCode="'+(options.poi?'PositionOfInterest':'StreetAddress')+'">' /* => ALL */
			+'OPTIONS'
			+'ADRESSE'
			+'     </Address>'
			+'   </GeocodeRequest>'
			+' </Request>';

		// DEPARTEMENT
		opt="";
		if (options.departement) opt += '<Place type="Departement">'+options.departement+'</Place>';
		// if (options.municipality) opt += '<Place type="Municipality">'+options.municipality+'</Place>';
		// if (options.nature) opt += '<Place type="Nature">'+options.nature+'</Place>';
		// BBOX
		if (opt.bbox)
		{	opt += '<gml:envelope>'
				+' <gml:pos>'+opt.bbox.latmin+' '+opt.bbox.lonmin+'</gml:pos>'
				+' <gml:pos>'+opt.bbox.latmax+' '+opt.bbox.lonmax+'</gml:pos>'
				+'</gml:envelope>';
		}
		xls = xls.replace ('OPTIONS',opt);
		// console.log(opt);
		// REQUETE
		xls = xls.replace ('ADRESSE','<freeFormAddress>'+queryString+'</freeFormAddress>');
	/*TODO : decomposition de l'adresse
		+'       <StreetAddress>'
		+'         <Street>1 rue Marconi</Street>'
		+'       </StreetAddress>'
		+'       <Place type="Municipality">Metz</Place>'
		+'       <PostalCode>57000</PostalCode>'
	*/	

		xls = this.xlsRequest(xls);

		// 152 rue claude nicolas ledoux, 30900 NÎME
		// ??? xls = '<?xml version="1.0" encoding="UTF-8"?><xls:XLS xmlns:xls="http://www.opengis.net/xls" version="1.2"><xls:RequestHeader sessionID=""/><xls:Request methodName="GeocodeRequest" version="1.2" requestID=""><xls:GeocodeRequest><xls:Address countryCode="StreetAddress"><xls:freeFormAddress>152 rue claude nicolas ledoux, 30900 NÎMES</xls:freeFormAddress></xls:Address></xls:GeocodeRequest></xls:Request></xls:XLS>';

		$.ajax({
			url: geoportailConfig.url+apiKey+"/geoportail/ols",
			dataType: "jsonp",
			data: { output: 'json', xls: xls },
			//timeout:5000,
			success: function( resp )
			{	var r, result = [] ;
				if (resp.xml)
				{	var xml = $.parseXML(resp.xml.replace(/gml:/g,""));
					var add = $(xml).find("GeocodedAddress");
					for (var i=0; i<add.length; i++)
					{	r = self.decodeAdresse($(add[i]));
						result.push(r);
					}
					//console.log(result);		
					if (callback) callback( result );
				}
				else
				{	if (callback) callback (false, resp.http.status, resp.http.error);
				}
			},
			error: function(resp, status, error)
			{	console.log (resp);
				if (callback) callback (false, status, error);
			}
		});
	} ;
	
	/** Service de geocodage inverse
		@param (Number) : lon
		@param (Number) : lat,
		@param callback (function) : fontion de retour
		@param options
			{	dist (Number) : rayon de recherche
				adresse (bool) : recherche par adresse
				poi (bool) : recherche parmi les noms de lieux,
				max : nombre maximum de reponse
			}
		@return dans callback (false si pas de reponse)
		[	{	lon, lat:
				adresse:
				{	num: 
					rue:
				}
				bbox:
				[ lonmin, latmin, lonmax, latmax ]
				match:
				{	distance: 
					type:
				}
				place:
				{	commune:
					departement:
					insee:
					municipality:
					qualite:
					territoire:
				}
			}
		]
	*/
	this.reverseGeocode = function( lon, lat, callback, options )
	{	if (!options) options={};
		var self = this;
		var xls = '<Request'
				+'    methodName="ReverseGeocodeRequest"'
				+'    maximumResponses="'+(options.max?options.max:'10')+'"'
				+'    requestID="abc"'
				+'    version="1.2">'
				+'   <ReverseGeocodeRequest>'
				+'ADRESSE'
				+'    <Position>'
				+'     <gml:Point><gml:pos>'+lat+' '+lon+'</gml:pos></gml:Point>'
				+'RAYON'
				+'    </Position>'
				+'   </ReverseGeocodeRequest>'
				+'</Request>';
		// Type de recherche (adresse ou poi)
		var a=''
		if (options.adresse) a += '<ReverseGeocodePreference>StreetAddress</ReverseGeocodePreference>';
		if (options.poi) a += '<ReverseGeocodePreference>PositionOfInterest</ReverseGeocodePreference>';
		if (options.parcelle) a = '<ReverseGeocodePreference>CadastralParcel</ReverseGeocodePreference>';
		if (!a) a = '<ReverseGeocodePreference>StreetAddress</ReverseGeocodePreference>';
		xls = xls.replace('ADRESSE',a);

		// Recherche dans un rayon
		a = '';
		if (options.dist)
		{	a =	'<gml:CircleByCenterPoint>'
				+'  <gml:pos>'+lat+' '+lon+'</gml:pos>'
				+'  <gml:radius>'+options.dist+'</gml:radius>'
				+'</gml:CircleByCenterPoint>';
		}
		xls = xls.replace ('RAYON',a);
		// TODO : recherche dans un polygone
		
		xls = this.xlsRequest(xls);
			
		$.ajax({
			url: geoportailConfig.url+apiKey+"/geoportail/ols",
			dataType: "jsonp",
			data: { output: 'json', xls: xls },
			success: function( resp )
			{	if (resp.xml)
				{	var result = [] ;
				
					var xml = $.parseXML(resp.xml.replace(/gml:/g,"").replace(/xlsext:/g,""));
					var loc = $(xml).find("ReverseGeocodedLocation");
					for (var i=0; i<loc.length; i++)
					{	var r = self.decodeAdresse($(loc[i]));
						result.push(r);
					}
					//console.log(result);
					if (callback) callback (result);
				}
				else
				{	console.log ("noxml :"+resp);
					callback (false, resp.http.status, resp.http.error);
				}
			},
			error: function(resp)
			{	console.log (resp);
			}
		});
	} ;
	
	/** Service d'autocompletion
		@param txt (String) : le texte a completer
		@param callback (function) : fontion de retour
		@param options
			{	terr : 
					-'METROPOLE' pour une recherche sur la métropole et la corse ;
					-'DOMTOM' pour une recherche sur les DOM­ TOMs uniquement ;
					-une liste de codes de départements ou codes INSEE de communes pour une recherche limitée à ces département ou commues spécifiés ;
				adresse (bool) : recherche par adresse
				poi (bool) : recherche parmi les noms de lieux,
				max : nombre maximum de reponse
			}
		@return dans callback
		{	country : type du localisant : 'StreetAddress' ou 'PositionOfInterest' ;
			fulltext : proposition complete ;
			street : rue ou toponyme ;
			city : ville ;
			zipcode : code postal ;
			classification : classification ;
			kind : type ;
			x,y : longitude, latitude.
		}
	*/
	this.autocomplete = function (txt, callback, options)
	{	if (!options) options = {};
		var type = '';
		if (options.adresse) type = 'StreetAddress';
		if (options.poi) type = (type?type+',':'')+'PositionOfInterest';
		$.ajax(
		{	url : geoportailConfig.url+apiKey+"/ols/apis/completion",
			dataType : "jsonp",
			data : 
			{	text : txt,
            	terr: options.territoire?options.territoire:'METROPOLE'),	// 75;77;78;91;92;93;94;95
            	type: (type?type:'StreetAddress'), // StreetAddress,PositionOfInterest
            	maximumResponses: (options.max?options.max:'10')
            },
			success: function (resp)
			{	//console.log (resp.results);
				if (callback) callback(resp.results);
			}
		});
	};
	
	/** Service altimetrique
		@param lon (Array|String|Number) : lon du point ou tableau de longitude
		@param lat (Array|String|Number) : lat du point ou tableau de latitude
		@param callback (function) : fontion de retour
		@param s : nombre de chiffre significatif (pour limiter la taille de l'url)
		@return dans callback (Array) : tableau de point
		[	{	lon, lat : position
				z : altitude
				acc : precision
			}
		}		
	*/
	this.altimetry = function(lon,lat, callback, s)
	{	if (!s) s = 4;
		if (lon instanceof Array) 
		{	// Limiter la taille des urls si trop de points)
			if (lon.length>10)
			{	var r = Math.pow(10,s);
				for (var i=0; i<lon.length; i++) lon[i] = Math.round(lon[i]*r)/r;
				for (var i=0; i<lat.length; i++) lat[i] = Math.round(lat[i]*r)/r;
			}
			lontxt = lon.join('|');
			lattxt = lat.join('|');
		}
		else
		{	lontxt = lon;
			lattxt = lat;
			lon = [lon];
			lat = [lat];
		}
		$.ajax(
			{	url : geoportailConfig.url+apiKey+"/alti/rest/elevation.xml",
				dataType : "jsonp",
				data : 
				{	lon: lontxt,
					lat: lattxt,
					output: "json"
				},
				success: function (resp)
				{	console.log (resp);
					if (resp)
					{	var xml = $.parseXML(resp.xml);
						var e = $(xml).find("elevation");
						var result=[];
						for (var i=0; i<e.length; i++)
						{	var r = 
							{	lon: lon[i], // Number($(e[i]).find("lon").text()),
								lat: lat[i], // Number($(e[i]).find("lat").text()), 
								z: Number($(e[i]).find("z").text()), 
								acc: Number($(e[i]).find("acc").text())
							};
							result.push(r);
						}
						console.log(result);
					}
					if (callback) callback(result);
				},
				error: function()
				{	//console.log(arguments);
					if (callback) callback(resp);
				}
			});
	};
	
	/** Service altimetrique (necessite un proxy)
		@param lon (Array|String|Number) : lon du point ou tableau de longitude
		@param lat (Array|String|Number) : lat du point ou tableau de latitude
		@param nb (Number) : Nombre de point de l'echantillon
		@param callback (function) : fontion de retour
		@param s : nombre de chiffre significatif (pour limiter la taille de l'url)
		@return dans callback (Array) : tableau de point
		[	{	lon, lat : position
				z : altitude
				acc : precision
			}
		}		
	*/
	this.altimetryLine = function(lon,lat,nb, callback, s)
	{	if (!s) s = 4;
		if (lon instanceof Array) 
		{	// Limiter la taille des urls si trop de points)
			if (lon.length>10)
			{	var r = Math.pow(10,s);
				for (var i=0; i<lon.length; i++) lon[i] = Math.round(lon[i]*r)/r;
				for (var i=0; i<lat.length; i++) lat[i] = Math.round(lat[i]*r)/r;
			}
			lontxt = lon.join('|');
			lattxt = lat.join('|');
		}
		else
		{	lontxt = lon;
			lattxt = lat;
			lon = [lon];
			lat = [lat];
		}
		$.ajax(
			{	url : geoportailConfig.url+apiKey+"/alti/rest/elevationLine.xml",
				dataType : "jsonp",
				data : 
				{	lon: lontxt,
					lat: lattxt,
					sampling:(nb?nb:20),
					output: "json"
				},
				success: function (resp)
				{	if (resp)
					{	var xml = $.parseXML(resp.xml);
						var e = $(xml).find("elevation");
						var result=[];
						for (var i=0; i<e.length; i++)
						{	var r = 
							{	lon: Number($(e[i]).find("lon").text()),
								lat: Number($(e[i]).find("lat").text()), 
								z: Number($(e[i]).find("z").text()), 
								acc: Number($(e[i]).find("acc").text())
							};
							result.push(r);
						}
					}
					if (callback) callback(result);
				},
				error: function()
				{	//console.log(arguments);
					if (callback) callback(resp);
				}
			});
	};
	
	// Calcul JSON via proxy (bug en JSONP)
	this.altimetry0 = function(lon,lat, callback)
	{	if (!proxy) { condole.log ("[ALTIMETRY] Error : no proxy found"); return; }
		if (lon instanceof Array) 
		{	lon = lon.join('|');
			lat = lat.join('|');
		}
		$.ajax(
			{	url: proxy,
				data : 
				{	url : geoportailConfig.url+apiKey+"/alti/rest/elevation.json",
					lon: lon,
					lat: lat,
					indent: false
				},
				success: function (resp)
				{	//console.log (resp);
					if (resp)
					{	resp = eval ("resp="+resp);
						resp = resp.elevations;
					}
					if (callback) callback(resp);
				},
				error: function()
				{	//console.log(arguments);
				 if (callback) callback(resp);
				}
			});
	};
};

