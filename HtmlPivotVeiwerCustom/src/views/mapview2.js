//
//  HTML5 PivotViewer
//
//  Collection loader interface - used so that different types of data sources can be used
//
//  Original Code:
//    Copyright (C) 2011 LobsterPot Solutions - http://www.lobsterpot.com.au/
//    enquiries@lobsterpot.com.au
//
//  Enhancements:
//    Copyright (C) 2012-2013 OpenLink Software - http://www.openlinksw.com/
//
//  This software is licensed under the terms of the
//  GNU General Public License v2 (see COPYING)
//

///Map View
mapView = null;
PivotViewer.Views.MapView2 = PivotViewer.Views.IPivotViewerView.subClass({
    init: function () {
        this._super();
        this.locCache = [];
        this.locList = [];
        this.inScopeLocList = [];
        this.map = null; 
        this.markers = [];
        this.overlay;
        this.overlayBaseImageUrl = null;
        this.geocodeList = [];
        this.itemsToGeocode = [];
        this.startGeocode;
        this.geocodeZero;
        this.applyBookmark = false;
        this.mapService = null;
        this.APIKey = null;
        this.geocodeService = null;
        this.geometryValue = null;
        this.areaValues = [];
        this.areaObj;
        this.buckets = [];
        this.icons = [];
        this.iconsSelected = [];
        this.selectedMarker = null;
        this.selectedBucket = -1;

        var that = this;
        $.subscribe("/PivotViewer/Views/Item/Selected", function (evt) {
            if (!that.isActive) return;
            for (var i = 0; i < that.inScopeLocList.length; i++) {
                var location = that.inScopeLocList[i];
                if (location.tile == evt.item) {
                    that.SelectMarker(that.markers[i], location);
                    break;
                }
            }
        });
    },
    Setup: function (width, height, offsetX, offsetY, tileMaxRatio) { 
        this.width = width;
        this.height = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.currentWidth = this.width;
        this.currentHeight = this.height;
        this.currentOffsetX = this.offsetX;
        this.currentOffsetY = this.offsetY;
        if (Modernizr.localstorage) this.localStorage = true;
        else this.localStorage = false;

        mapView = this;
    },
    APILoaded: function () {
        var that = this;
        this.map = new google.maps.Map(document.getElementById('pv-map-canvas'));
        google.maps.event.addListener(this.map, 'zoom_changed', function () {
            $.publish("/PivotViewer/Views/Item/Updated", null);
            that.GetOverlay();
        });
        google.maps.event.addListener(this.map, 'center_changed', function () {
            $.publish("/PivotViewer/Views/Item/Updated", null);
            that.GetOverlay();
        });

        this.icons = [
            'lib/leaflet/images/Red.png', 'lib/leaflet/images/Yellow.png', 'lib/leaflet/images/DarkGreen.png',
            'lib/leaflet/images/Blue.png', 'lib/leaflet/images/Purple.png', 'lib/leaflet/images/Orange.png',
            'lib/leaflet/images/Pink.png', 'lib/leaflet/images/Sky.png', 'lib/leaflet/images/Lime.png',
            'lib/leaflet/images/Gold.png', 'lib/leaflet/images/Green.png'];
        this.iconsSelected = [
            'lib/leaflet/images/RedDot.png', 'lib/leaflet/images/YellowDot.png', 'lib/leaflet/images/DarkGreenDot.png',
            'lib/leaflet/images/BlueDot.png', 'lib/leaflet/images/PurpleDot.png', 'lib/leaflet/images/OrangeDot.png',
            'lib/leaflet/images/PinkDot.png', 'lib/leaflet/images/SkyDot.png', 'lib/leaflet/images/LimeDot.png',
            'lib/leaflet/images/GoldDot.png', 'lib/leaflet/images/GreenDot.png'];

        this.ClearMarkers = function () {
            for (var i = 0; i < this.markers.length; i++) {
                this.markers[i].setMap(null);
            }
            this.markers = [];
        };
        this.SelectMarker = function (marker, location) {
            var bucket = that.GetBucketNumber(location);
            if (marker == that.selectedMarker) {
                marker.setIcon(that.icons[bucket]);
                that.selected = null;
                that.selectedMarker.setZIndex(0);
                that.selectedMarker = null;
                that.selectedBucket = -1;
                $('.pv-toolbarpanel-info').empty();
                $('.pv-altinfopanel').fadeIn();

            }
            else {
                marker.setIcon(that.iconsSelected[bucket]);
                marker.setZIndex(1000000000);
                that.selected = location.tile;
                if (that.selectedMarker != null) {
                    that.selectedMarker.setZIndex(0);
                    that.selectedMarker.setIcon(that.icons[that.selectedBucket]);
                }
                that.selectedMarker = marker;
                that.selectedBucket = bucket;
                that.map.panTo(location.loc);
                $('.pv-toolbarpanel-info').empty();
                var toolbarContent = "<img style='height:15px;width:auto' src='" + that.icons[bucket] + "'></img>";
                if (that.buckets[bucket].startRange == that.buckets[bucket].endRange)
                    toolbarContent += that.buckets[bucket].startRange;
                else toolbarContent += that.buckets[bucket].startRange + " to " + that.buckets[bucket].endRange;
                $('.pv-toolbarpanel-info').append(toolbarContent);
                $('.pv-altinfopanel').hide();
            }
        };

        this.NewMarker = function (location) {
            var marker = new google.maps.Marker({ position: location.loc, map: this.map, title: location.tile.facetItem.Name });
            if (!this.buckets[this._bucket].ids[location.tile.facetItem.Id]) this._bucket++;
            marker.setIcon(this.icons[this._bucket]);
            google.maps.event.addListener(marker, "click", (function (location) {
                return function () {$.publish("/PivotViewer/Views/Item/Selected", [{ item: location.tile}]);}
            })(location));
            return marker;
        }

        this.RefitBounds = function () {
            var bounds = new google.maps.LatLngBounds();
            for (i = 0; i < this.markers.length; i++) {
                //extend the bounds to include each marker's position
                bounds.extend(this.markers[i].position);
            }
            //now fit the map to the newly inclusive bounds
            this.map.fitBounds(bounds);
        }

        this.GetOverlay = function () {
            // Get the boundary and use to get image to overlay
            var mapBounds = this.map.getBounds();
            if (mapBounds) {
                var southWest = mapBounds.getSouthWest();
                var northEast = mapBounds.getNorthEast();
                var width = $('#pv-map-canvas').width();
                var height = $('#pv-map-canvas').height();
                if (this.overlayBaseImageUrl != null) {
                    if (this.overlay) this.overlay.setMap(null);
                    var overlayImageUrl = this.overlayBaseImageUrl+ "&bbox=" + southWest.lng() + "," + southWest.lat() + "," + northEast.lng() + "," + northEast.lat() + "&width=" + width + "&height=" + height ;
                    this.overlay = new google.maps.GroundOverlay (overlayImageUrl, mapBounds, {opacity: 0.4});
                    this.overlay.setMap(this.map);
                }
            }
        }

        this.Activate();
    },
    SetOptions: function (options) {
        $('.pv-viewpanel').append("<div class='pv-mapview-canvas' id='pv-map-canvas'></div>");
        if (options.GoogleAPIKey) {
            this.APIKey = options.GoogleAPIKey;
            this.mapService = "Google";
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src = "lib/wicket/wicket-gmap3.min.js";
            document.body.appendChild(script);
            if (options.GeocodeService == "Google") this.geocodeService = "Google";
            else GeocodeService = "Nominatim"
        }
        else {
            this.mapService = "OpenStreetMap";
            this.geocodeService = "Nominatim";
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src = "lib/wicket/wicket-leaflet.min.js";
            document.body.appendChild(script);

            this.map = new L.Map(document.getElementById('pv-map-canvas'));

            // create the tile layer with correct attribution
            var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            var osmAttrib = 'Map data © OpenStreetMap contributors';
            this.osm = new L.TileLayer(osmUrl, { attribution: osmAttrib });
            this.map.addLayer(this.osm);

            // create the icon set
            this.icons.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/Red.png' } }));
            this.icons.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/Yellow.png' } }));
            this.icons.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/DarkGreen.png' } }));
            this.icons.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/Blue.png' } }));
            this.icons.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/Purple.png' } }));
            this.icons.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/Orange.png' } }));
            this.icons.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/Pink.png' } }));
            this.icons.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/Sky.png' } }));
            this.icons.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/Lime.png' } }));
            this.icons.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/Gold.png' } }));
            this.icons.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/Green.png' } }));
            this.iconsSelected.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/RedDot.png' } }));
            this.iconsSelected.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/YellowDot.png' } }));
            this.iconsSelected.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/DarkGreenDot.png' } }));
            this.iconsSelected.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/BlueDot.png' } }));
            this.iconsSelected.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/PurpleDot.png' } }));
            this.iconsSelected.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/OrangeDot.png' } }));
            this.iconsSelected.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/PinkDot.png' } }));
            this.iconsSelected.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/SkyDot.png' } }));
            this.iconsSelected.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/LimeDot.png' } }));
            this.iconsSelected.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/GoldDot.png' } }));
            this.iconsSelected.push(L.Icon.Default.extend({ options: { iconUrl: 'lib/leaflet/images/GreenDot.png' } }));
            var that = this;
            this.map.on('zoomend', function (e) {
                $.publish("/PivotViewer/Views/Item/Updated", null);
                that.GetOverlay();
            });
            this.map.on('moveend', function (e) {
                $.publish("/PivotViewer/Views/Item/Updated", null);
                that.GetOverlay();
            });

            this.ClearMarkers = function () {
                for (var i = 0; i < this.markers.length; i++) {
                    this.map.removeLayer(this.markers[i]);
                }
                this.markers = [];
            }

            this.SelectMarker = function (marker, location) {
                var bucket = that.GetBucketNumber(location);
                if (marker == that.selectedMarker) {
                    marker.setIcon(new that.icons[bucket]);
                    that.selected = null;
                    that.selectedMarker.setZIndexOffset(0);
                    that.selectedMarker = null;    
                    that.selectedBucket = -1;
                    $('.pv-toolbarpanel-info').empty();
                    $('.pv-altinfopanel').fadeIn();
                }
                else {
                    marker.setIcon(new that.iconsSelected[bucket]);
                    marker.setZIndexOffset(1000000000);
                    that.selected = location.tile;
                    if (that.selectedMarker != null) {
                        that.selectedMarker.setIcon(new that.icons[that.selectedBucket]);
                        that.selectedMarker.setZIndexOffset(0);
                    }
                    that.selectedMarker = marker;
                    that.selectedBucket = bucket;
                    that.map.panTo(location.loc);
                    $('.pv-toolbarpanel-info').empty();
                    var toolbarContent = "<img style='height:15px;width:auto' src='" + marker._icon.src + "'></img>";
                    if (that.buckets[bucket].startRange == that.buckets[bucket].endRange)
                        toolbarContent += that.buckets[bucket].startRange;
                    else toolbarContent += that.buckets[bucket].startRange + " to " + that.buckets[bucket].endRange;
                    $('.pv-toolbarpanel-info').append(toolbarContent);
                    $('.pv-altinfopanel').hide();
                    
                }
            }

            this.NewMarker = function (location) {
                var marker = new L.Marker(location.loc, { title: location.tile.facetItem.Name });
                this.map.addLayer(marker);
                if (!this.buckets[this._bucket].ids[location.tile.facetItem.Id]) this._bucket++;
                marker.setIcon(new this.icons[this._bucket]);
                marker.on('click', (function (location) {
                    return function () {$.publish("/PivotViewer/Views/Item/Selected", [{ item: location.tile}]);}
                })(location));
                return marker;
            }

            this.RefitBounds = function () {
                var markerPos = [];

                for (i = 0; i < this.markers.length; i++) {
                    //extend the bounds to include each marker's position
                    markerPos.push(this.markers[i].getLatLng());
                }
                var bounds = new L.LatLngBounds(markerPos);

                //now fit the map to the newly inclusive bounds
                this.map.fitBounds(bounds);
            }

            this.GetOverlay = function () {
                // Get the boundary and use to get image to overlay
                var mapBounds = this.map.getBounds();
                var west = mapBounds.getWest();
                var east = mapBounds.getEast();
                var north = mapBounds.getNorth();
                var south = mapBounds.getSouth();
                var mapSize = this.map.getSize();
                var width = mapSize.x;
                var height = mapSize.y;
                if (this.overlayBaseImageUrl != null) {
                    if (this.overlay && this.map.hasLayer(this.overlay)) this.map.removeLayer(this.overlay);
                    var overlayImageUrl = this.overlayBaseImageUrl+ "&bbox=" + west + "," + south + "," + east + "," + north + "&width=" + width + "&height=" + height ;
                    this.overlay = new L.imageOverlay (overlayImageUrl, mapBounds, {opacity: 0.4});
                    this.overlay.addTo(this.map);
                }
            }
        }
        if (options.MapOverlay != undefined) this.overlayBaseImageUrl = options.MapOverlay;
    },

    Activate: function () {
        if (!Modernizr.canvas) return;

        if (this.map == null) {
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src = "https://maps.googleapis.com/maps/api/js?key=" + this.APIKey + "&sensor=false&callback=mapView.APILoaded";
            document.body.appendChild(script);
            return;
        }
        this._super();
        $('.pv-toolbarpanel-info').fadeIn();
        $('.pv-altinfopanel').fadeIn();
        $('.pv-toolbarpanel-zoomcontrols').hide();
        $('.pv-toolbarpanel-zoomcontrols').css('border-width', '0');
        $('#MAIN_BODY').css('overflow', 'auto');
        $('.pv-mapview-canvas').fadeIn();
        $('.pv-toolbarpanel-sort').fadeIn();

        if (this.filtered) this.Filter(this.filterEvt.tiles, this.filterEvt.filter, this.filterEvt.sort);
    },
    Deactivate: function () {
        this._super();
        $('.pv-altinfopanel').fadeOut();
        $('.pv-toolbarpanel-info').fadeOut();
        $('.pv-mapview-canvas').fadeOut();
        $('.pv-toolbarpanel-sort').fadeOut();
    },
    GetBucketNumber: function (location) {
        var bkt = this.buckets.ids[location.tile.facetItem.Id];
        return bkt != undefined ? bkt : -1;
    },
    Bucketize: function (tiles, filterList, orderBy) {
        category = PivotCollection.getCategoryByName(orderBy);
        if (filterList[0].facetItem.FacetByName[orderBy] == undefined)
            return [{ startRange: "(no info)", endRange: "(no info)", tiles: [filterList[0]], values: ["(no info)"], startLabel: "(no info)", endLabel: "(no info)" }];

        var min = filterList[0].facetItem.FacetByName[orderBy].FacetValues[0].Value;
        for (var i = filterList.length - 1; i > 0; i--) {
            if (filterList[i].facetItem.FacetByName[orderBy] != undefined) break;
        }
        var max = filterList[i].facetItem.FacetByName[orderBy].FacetValues[0].Value;

        if (category.Type == PivotViewer.Models.FacetType.DateTime) {
            //Start with biggest time difference
            min = new Date(min); max = new Date(max);
            if (max.getFullYear() - min.getFullYear() + min.getFullYear() % 10 > 9) {
                return GetBuckets(filterList, orderBy,
                    function (value) { var year = new Date(value.Value).getFullYear(); return (year - year % 10); },
                    function (value) { var year = new Date(value.Value).getFullYear(); return (year - year % 10) + "s"; }
                );
            }
            else if (max.getFullYear() > min.getFullYear())
                return GetBuckets(filterList, orderBy, function (value) { return new Date(value.Value).getFullYear(); },
                    function (value) { return new Date(value.Value).getFullYear().toString(); });
            else if (max.getMonth() > min.getMonth())
                return GetBuckets(filterList, orderBy, function (value) { return new Date(value.Value).getMonth(); },
                    function (value) { var date = new Date(value.Value); return GetMonthName(date) + " " + date.getFullYear(); });
            else if (max.getDate() > min.getDate())
                return GetBuckets(filterList, orderBy, function (value) { return new Date(value.Value).getDate(); },
                    function (value) { var date = new Date(value.Value); return GetMonthName(date) + " " + date.getDate() + ", " + date.getFullYear(); });
            else if (max.getHours() > min.getHours())
                return GetBuckets(filterList, orderBy, function (value) { return new Date(value.Value).getHours(); },
                    function (value) {
                        var date = new Date(value.Value);
                        return GetMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + GetStandardHour(date) + " " + GetMeridian(date);
                    });
            else if (max.getMinutes() > min.getMinutes())
                return GetBuckets(filterList, orderBy, function (value) { return new Date(value.Value).getMinutes(); },
                    function (value) {
                        var date = new Date(value);
                        return GetMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + GetStandardHour(date) + ":" + date.getMinutes() + " " + GetMeridian(date);
                    });
            else return GetBuckets(filterList, orderBy, function (value) { return new Date(value.Value).getSeconds(); },
                function (value) {
                    var date = new Date(value.Value);
                    return GetMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + GetStandardHour(date) + ":" + date.getMinutes() + "::" + date.getSeconds() + " " + GetMeridian(date);
                });
        }
        return GetBuckets(filterList, orderBy);
        //Got rid of multiple values for now
    },
    Filter: function (tiles, filter, sortFacet) { 
        var that = this;
        var g = 0;  //keeps track of the no. of geocode locations;

        Debug.Log('Map View Filtered: ' + filter.length);

        this.sortFacet = sortFacet;
        this.filter = filter;
        this.tiles = tiles;

        this.buckets = this.Bucketize(tiles, filter, this.sortFacet);

        //Empty the inScope item list
        this.inScopeLocList = [];        

        //Clear legend info in toolbar
        $('.pv-toolbarpanel-info').empty();
        if (this.selected == null) $('.pv-altinfopanel').fadeIn();

        //Check for geometry facet
        //This should contain a geometry definition im WKT that applies to the whole collection
        //E.g. where a geometry filter has been applied
        for(var i = 0; i < PivotCollection.FacetCategories.length; i++) {
            var category = PivotCollection.FacetCategories[i];
            if (category.Name.toUpperCase().indexOf("GEOMETRY") >= 0) {
                for (j = 0; j < filter.length; j++) {
                    var facet = filter[j].facetItem.FacetByName[category.Name];
                    if (facet == undefined) continue;
                    this.geometryValue = facet.FacetValues[0].Value;
                    break;
                }
                if (j < filter.length) break;
            }
        }

        //Check for area facet
        for (var i = 0; i < PivotCollection.FacetCategories.length; i++) {
            var category = PivotCollection.FacetCategories[i];
            if (category.Name.toUpperCase().indexOf("AREA") >= 0) {
                for (j = 0; j < filter.length; j++) {
                    var facet = filter[j].facetItem.FacetByName[category.Name];
                    if (facet == undefined) continue;
                    this.areaValues.push({ id: filter[j].facetItem.Id, area: facet.FacetValues[0].Value });
                    break;
                }
            }
        }
        
        //Create a list of in scope locations
        for (var i = 0; i < filter.length; i++) {
            //Tile is in scope
            var item = filter[i];

            //Have we cached the item location?
            var c;
            for (var c = 0; c < this.locList.length; c++) {
                if (this.locList[c].tile == filter[i]) {
                    if (this.locList[c].loc.lat != 0 || this.locList[c].loc.lng != 0)
                        this.inScopeLocList.push(this.locList[c]);
                    break;
                }
            }

            if (c == this.locList.length) {
                var l = -1, m = -1;
                //First try to get co-ordinate information from the facets
                for (k = 0; k < item.facetItem.Facets.length; k++) {
                    var facet = item.facetItem.Facets[k];
                    if (facet.Name.toUpperCase().indexOf("LATITUDE") >= 0) l = k;
                    else if (facet.Name.toUpperCase().indexOf("LONGITUDE") >= 0) m = k;
                }
                if (l != -1 && m != -1) {
                    var latitude = item.facetItem.Facets[l].FacetValues[0].Value, longitude = item.facetItem.Facets[m].FacetValues[0].Value;
                    if (typeof latitude == "string") latitude = parseFloat(latitude);
                    if (typeof longitude == "string") longitude = parseFloat(longitude);

                    var newLoc = new L.LatLng(latitude, longitude);
                    this.locList.push({ tile: item, loc: newLoc });
                    this.inScopeLocList.push({ tile: item, loc: newLoc});
                }
                else {
                    for (var k = 0; k < item.facetItem.Facets.length; k++) {
                        var facet = item.facetItem.Facets[k];
                        if (facet.Name.toUpperCase().indexOf("LOCATION") >= 0) {
                            for (var v = 0; v < facet.FacetValues.length; v++) {
                                var value = facet.FacetValues[v].Value;
                                var invalidCoordinates = false;

                                if (value.toUpperCase().indexOf("POINT(") == 0) {
                                    var longitude = parseFloat(value.substring(6, value.indexOf(' ', 6) - 6));
                                    var latitude = parseFloat(value.substring(value.indexOf(' ', 6) + 1, value.indexOf(')') - (value.indexOf(' ') + 1)));
                                    if (isNaN(latitude) || isNaN(longitude)) continue;
                                    var newLoc = new L.LatLng(latitude, longitude);
                                    locList.push({ tille:item,  loc: newLoc });
                                    inScopeLocList.push({ tile: item, loc: newLoc});
                                    break;
                                }
                                else if (value.indexOf(",") > -1) {
                                    //Could be a co-ordinate pair
                                    var latitude = parseFloat(value.substring(0, value.indexOf(',')));
                                    var longitude = parseFloat(value.substring(value.indexOf(',')));
                                    if (isNaN(latitude) || !isNaN(longitude)) continue;
                                    var newLoc = new L.LatLng(lat, lon);
                                    locList.push({ tile: item, loc: newLoc});
                                    inScopeLocList.push({ tile: item, loc: newLoc});
                                    break;
                                }
                                else if (value.length > 1) {
                                    var geoLoc = value.replace('_', ' ').toUpperCase();

                                    // First add region and country to the location.
                                    for (var r = 0; r < item.facetItem.Facets.length; r++) {
                                        if (item.facetItem.Facets[r].Name.toUpperCase().indexOf("REGION") >= 0) {
                                            var region = item.facetItem.Facets[r].FacetValues[0].Value;
                                            if (region.length > 1) geoLoc = geoLoc + ", " + region.replace('_', ' ').toUpperCase();
                                            break;
                                        }
                                    }
                                    for (var s = 0; s < item.facetItem.Facets.length; s++) {
                                        if (item.facetItem.Facets[s].Name.toUpperCase().indexOf("COUNTRY") >= 0) {
                                            var country = item.facetItem.Facets[s].FacetValues[0].Value;
                                            if (country.length > 1) geoLoc = geoLoc + ", " + country.replace('_', ' ').toUpperCase();
                                            break;
                                        }
                                    }
                                    // Is it in the cache?
                                    for (var l = 0; l < this.locCache.length; l++) {
                                        if (this.locCache[l].locName == geoLoc) {
                                            this.locList.push({tile: item, loc: this.locCache[l].loc });
                                            this.inScopeLocList.push({ tile: item, loc: this.locCache[l].loc});
                                            break;
                                        }
                                    }

                                    if (l == this.locCache.length && this.localStorage) {
                                        // Now try the users persistent cache
                                        var newLatLng = null;
                                        var newLoc = JSON.parse(localStorage.getItem(geoLoc));
                                        if (newLoc) {
                                            var latitude = parseFloat(newLoc.lat);
                                            var longitude = parseFloat(newLoc.longitude);
                                            if (!isNaN(latitude) && !isNaN(lng)) {
                                                newLatLng = new L.LatLng(lat, lng);
                                                // Add it to local cache
                                                this.locCache.push({ locName: geoLoc, loc: newLatLng });
                                                this.locList.push({ tile: item, loc: newLatLng });
                                                this.inScopeLocList.push({ tile: item, loc: newLatLng});
                                            }
                                        }
                                        if (newLatLng == null) {
                                            // Not in local or persistent cache so will have to use geocode service
                                            // Add location to list for geocoding (will need to keep itemId name with it)
                                            if (g < 1000) {//limiting the number of items to geocode at once to 1000 for now
                                                var gl = 0;
                                                for (; gl < this.geocodeList.length; gl++) {
                                                    if (this.geocodeList[gl] == geoLoc) break;
                                                }
                                                if (gl == this.geocodeList.length) {
                                                    this.geocodeList.push(geoLoc);
                                                    g++;
                                                }
                                                this.itemsToGeocode.push({ tile: item, locName: geoLoc });
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            if (v != facet.FacetValues.length) break;
                        }
                    }
                }
            }
        }

        //Check that at least one in scope item has a location
        if (this.inScopeLocList.length == 0 && g == 0) {
            this.ShowMapError();
            return;
        }
        else if (g > 0) this.GetLocationsFromNames();
        $('.pv-mapview-canvas').css('height', this.height - 12 + 'px');
        $('.pv-mapview-canvas').css('width', this.width - 415 + 'px');
        this.CreateMap();

        this.filtered = false;
    },
    GetButtonImage: function () {return 'images/MapView.png';},
    GetButtonImageSelected: function () {return 'images/MapViewSelected.png';},
    GetViewName: function () { return 'Map View 2'; },
    MakeGeocodeCallBack: function(locName) {
        var that = this;
        if (this.geocodeService == "Google"){
            var geocodeCallBack = function(results, status) {
                var dummy = new L.LatLng(0, 0);
                var loc = dummy;
                
                if (status == google.maps.GeocoderStatus.OK) { 
                    var googleLoc = results[0].geometry.location;
                    var lat = googleLoc.lat();
                    var lon = googleLoc.lng();
                    if (lat && lon) loc = new L.LatLng(lat, lon);
                }

                // Add to local cache
                that.locCache.push ({locName: locName, loc: loc});
       
                // Add to persistent cache
                if (this.localStorage) {
                    var newLoc = {lat: loc.lat, lng: loc.lng};
                    localStorage.setItem(locName, JSON.stringify(newLoc));
                }
       
                // Find items that have that location
                for (var i = 0; i < that.itemsToGeocode.length; i++ ) {
                    var item = that.itemsToGeocode[i].tile;
                    var value = that.itemsToGeocode[i].locName;
                    if (value == locName) {
                        that.locList.push({tile: item, loc:loc});
                        if (loc.lat != 0 || loc.lng != 0)
                            that.inScopeLocList.push({tile: item, loc:loc});
                    }
                }
       
                var doneGeocoding = true;
                for (var g = 0; g < that.geocodeList.length; g++) {
                    var value = that.geocodeList[g];
                    var currentLocNotFound = true;
                    for (var c = 0; c < that.locCache.length; c++) {
                        if (that.locCache[c].locName == value) {
                            currentLocNotFound = false;
                            break;
                        }
                    }
                    if (currentLocNotFound) {
                        doneGeocoding = false;
                        break;
                    }
                }
                // If geocoding has taken more than 20 secs then try to set
                // the bookmark.  Otherwise, if the time taken is more than 
                // 2 secs make the pins we have so far
                var now = new Date();
                if ((now.getTime() - that.geocodeZero.getTime())/1000 > 20) {
                    that.RedrawMarkers();
                    that.startGeocode = new Date();
                }
                else if ((now.getTime() - that.startGeocode.getTime()) / 1000 > 2) {
                    that.RedrawMarkers();
                    that.RefitBounds();
                    that.GetOverlay();
                    that.startGeocode = new Date();
                }
       
                // If the geocodeResults array is totally filled, make the pins.
                if (doneGeocoding || that.geocodeList.Count == 0) {
                    //change cursor back ?
                    that.geocodeList = [];
                    if (that.inScopeLocList.Count == 0) {
                        this.ShowMapError();
                        return;
                    }
                    else {
                        that.CreateMap();
                        if (that.applyBookmark) {
                            that.SetBookmark();
                            that.applyBookmark = false;
                        }
                    }
                }
            }
        }
        else {
            var geocodeCallBack = function(xml) {
                var dummy = new L.LatLng(0, 0);
                var loc = dummy;
                var results = $(xml).find("searchresults");
                var place = $(xml).find("place");
 
                if (place) {
                    var lat = $(place).attr("lat");
                    var lon = $(place).attr("lon");
                    if (lat && lon)
                        loc = new L.LatLng(lat, lon);
                }

                // Add to local cache
                that.locCache.push ({locName: locName, loc: loc});
       
                // Add to persistent cache
                if (this.localStorage) {
                    var newLoc = {
                        lat: loc.lat,
                        lng: loc.lng
                    };
                    localStorage.setItem(locName, JSON.stringify(newLoc));
                }
       
                // Find items that have that location
                for (var i = 0; i < that.itemsToGeocode.length; i++ ) {
                    var itemId = that.itemsToGeocode[i].tile.Id;
                    var value = that.itemsToGeocode[i].tile.facetItem.Id;
                    if (value == locName) {
                        that.locList.push({tile: item, loc:loc});
                        if (loc.lat != 0 || loc.lng != 0)
                            that.inScopeLocList.push({tile: item, loc:loc});
                    }
                }
       
                var doneGeocoding = true;
                for (var g = 0; g < that.geocodeList.length; g++) {
                    var value = that.geocodeList[g];
                    var currentLocNotFound = true;
                    for (var c = 0; c < that.locCache.length; c++) {
                        if (that.locCache[c].locName == value) {
                            currentLocNotFound = false;
                            break;
                        }
                    }
                    if (currentLocNotFound) {
                        doneGeocoding = false;
                        break;
                    }
                }
                // If geocoding has taken more than 20 secs then try to set
                // the bookmark.  Otherwise, if the time taken is more than 
                // 2 secs make the pins we have so far
                var now = new Date();
                if ((now.getTime() - that.geocodeZero.getTime())/1000 > 20) {
                    that.RedrawMarkers();
                    that.startGeocode = new Date();
                }
                else if ((now.getTime() - that.startGeocode.getTime()) / 1000 > 2) {
                    that.RedrawMarkers();
                    that.RefitBounds();
                    that.startGeocode = new Date();
                }
       
                // If the geocodeResults array is totally filled, make the pins.
                if (doneGeocoding || that.geocodeList.Count == 0) {
                    //change cursor back ?
                    that.geocodeList = [];
                    if (that.inScopeLocList.Count == 0) {
                        this.ShowMapError();
                        return;
                    }
                    else {
                        that.CreateMap();
                        if (that.applyBookmark) {
                            that.SetBookmark();
                            that.applyBookmark = false;
                        }
                    }
                }
            }

        }
        return geocodeCallBack;
    },
    Geocode: function (locName, callbackFunction) {
        if (this.geocodeService == "Google"){
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode( {address: locName}, this.MakeGeocodeCallBack(locName));
        }
        else {
            var that = this;
            var nominatimUrl = "http://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(locName) + "&format=xml";
            $.ajax({
                type: "GET",
                url: nominatimUrl,
                success: callbackFunction,
                error: function(jqXHR, textStatus, errorThrown) {
                    //Throw an alert so the user knows something is wrong
                    var msg = 'Error goecoding<br><br>';
                    msg += 'URL        : ' + nominatimUrl + '<br>';
                    msg += 'Status : ' + jqXHR.status + ' ' + errorThrown + '<br>';
                    msg += 'Details    : ' + jqXHR.responseText + '<br>';
                    msg += '<br>Pivot Viewer cannot continue until this problem is resolved<br>';
                    $('.pv-wrapper').append("<div id=\"pv-dzloading-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>"+ msg + "</p></div></div>");
                    setTimeout(function(){window.open("#pv-dzloading-error","_self")},1000)
  
                }
            });
        }
    },
    GetLocationsFromNames: function () {
        for (l = 0; l < this.itemsToGeocode.length; l ++) {
            var locName = this.itemsToGeocode[l].tile.facetItem.Name;
            this.Geocode(locName, this.MakeGeocodeCallBack(locName));
        }
        // Change cursor?
        this.startGeocode = new Date();
        this.startGeocode.setSeconds(this.startGeocode.getSeconds() + 2);
        this.geocodeZero = new Date();
    },
    CreateMap: function () {
        //Add geometry to map using wicket library for reading WKT
        if (this.geometryValue != null) {
            var wkt = new Wkt.Wkt();
            try { wkt.read(this.geometryValue); }
            catch (e1) {
                try { wkt.read(this.geometryValue.replace('\n', '').replace('\r', '').replace('\t', '')); }
                catch (e2) {
                    if (e2.name === 'WKTError')
                        Debug.Log('Wicket could not understand the WKT string you entered. Check that you have parentheses balanced, and try removing tabs and newline characters.');
                }
            }

            var obj = wkt.toObject(this.map.defaults);
            if (Wkt.isArray(obj)) {
                for (var o = 0; o < obj.length; o++) {
                    this.map.addLayer(obj[o]);
                }
            }
            else this.map.addLayer(obj);
        }

        this.CreateMarkers();
        this.RefitBounds();
        this.GetOverlay();
        this.CreateLegend();
    },
    CreateMarkers: function () {
        this.ClearMarkers();
        this._bucket = 0;
        for (i = 0; i < this.inScopeLocList.length; i++) {  
            this.markers.push(this.NewMarker(this.inScopeLocList[i]));
        }
    },
    DrawArea: function () {
        var areaValue;
        var areaWkt = new Wkt.Wkt();

        //clear existing area object
        if (this.areaObj)
            this.map.removeLayer(this.areaObj);
        for (var i = 0; i < this.areaValues.length; i++) {
            if (this.areaValues[i].id == this.selected.facetItem.Id) {
                areaValue = this.areaValues[i].area;
                break;
            }
        }
        if (areaValue) {
            var geometryOK = true;
            try { // Catch any malformed WKT strings
                areaWkt.read(areaValue);
            }
            catch (e1) {
                try {
                    areaWkt.read(areaValue.replace('\n', '').replace('\r', '').replace('\t', ''));
                }
                catch (e2) {
                    if (e2.name === 'WKTError') {
                        Debug.Log('Wicket could not understand the WKT string you entered. Check that you have parentheses balanced, and try removing tabs and newline characters.');
                        //return;
                        geometryOK = false;
                    }
                }
            }
            if (geometryOK) {
                this.areaObj = areaWkt.toObject({color:'#990000',fillColor:'#EEFFCC',fillOpacity:0.6});
                if (Wkt.isArray(this.areaObj)) {
                    for (var o = 0; o < this.areaObj.length; o++) { 
                        this.map.addLayer(this.areaObj[o]);
                    }
                }
                else this.map.addLayer(this.areaObj);
            }
        }
    },
    RedrawMarkers: function () {
        this.CreateMarkers();
        this.DrawArea();
    },
    ShowMapError: function () {
        var msg = '';
        msg = msg + 'The current data selection does not contain any location information that can be shown on a map<br><br>';
        msg = msg + '<br>Choose a different view<br>';
        $('.pv-wrapper').append("<div id=\"pv-dzlocation-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
        setTimeout(function(){window.open("#pv-dzlocation-error","_self")},1000)
        return;
    },
    CreateLegend: function() {
        // Get width of the info panel (width of icon image = 30 )
        var width = $('.pv-altinfopanel').width() - 32;
        $('.pv-altinfopanel').empty();
        $('.pv-altinfopanel').append("<div class='pv-legend-heading' style='height:28px' title='" + this.sortFacet + "'>" + this.sortFacet + "</div>");
        var tableContent = "<table id='pv-legend-data' style='color:#484848;'>";
        for (var i = 0; i < this.buckets.length; i++) {
            var iconFile = this.mapService == "Google" ? this.icons[i] : (new this.icons[i]).options.iconUrl;
            tableContent += "<tr><td><img src='" + iconFile + "'></img></td>";
            if (this.buckets[i].startRange == this.buckets[i].endRange)
                tableContent += "<td><div style='overflow:hidden;white-space:nowrap;width:" + width + "px;text-overflow:ellipsis'>" + this.buckets[i].startLabel + "</div></td></tr>"; 
            else tableContent += "<td><div style='overflow:hidden;white-space:nowrap;width:" + width + "px;text-overflow:ellipsis'>" + this.buckets[i].startLabel + " to " + this.buckets[i].endLabel + "</div></td></tr>"; 
        }
        tableContent +="</table>";
        $('.pv-altinfopanel').append(tableContent);
    }
});
