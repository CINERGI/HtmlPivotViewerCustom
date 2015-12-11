//
//  HTML5 PivotViewer
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

PivotViewer.Utils.loadScript("lib/wicket/wicket.min.js");
PivotViewer.Utils.loadCSS("lib/leaflet/leaflet.css");
PivotViewer.Utils.loadScript("lib/leaflet/leaflet.js");

///Map View
PivotViewer.Views.MapView = PivotViewer.Views.IPivotViewerView.subClass({
    init: function () {
        this._super();
        this.locCache = [];
        this.map = null; 
        this.markers = [];
        this.overlay;
        this.overlayBaseImageUrl = null;
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
            that.SelectMarker(evt.item);
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
        window.mapView = this;
        this.Activate();
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
            for (var i = 0; i < this.tiles.length; i++) {
                var marker = this.tiles[i].marker;
                if(marker != undefined) marker.setMap(null);
            }
        };

        this.SelectMarker = function(item) {
            var bucket = that.GetBucketNumber(item);
            if (item.marker == that.selectedMarker) {
                item.marker.setIcon(that.icons[bucket]);
                that.selected = null;
                that.selectedMarker.setZIndex(0);
                that.selectedMarker = null;
                that.selectedBucket = -1;
                $('.pv-toolbarpanel-info').empty();
                $('.pv-altinfopanel').fadeIn();

            }
            else {
                item.marker.setIcon(that.iconsSelected[bucket]);
                item.marker.setZIndex(1000000000);
                that.selected = item;
                if (that.selectedMarker != null) {
                    that.selectedMarker.setZIndex(0);
                    that.selectedMarker.setIcon(that.icons[that.selectedBucket]);
                }
                that.selectedMarker = item.marker;
                that.selectedBucket = bucket;
                that.map.panTo(item.loc);
                $('.pv-toolbarpanel-info').empty();
                var toolbarContent = "<img style='height:15px;width:auto' src='" + that.icons[bucket] + "'></img>";
                if (that.buckets[bucket].startRange == that.buckets[bucket].endRange)
                    toolbarContent += that.buckets[bucket].startRange;
                else toolbarContent += that.buckets[bucket].startRange + " to " + that.buckets[bucket].endRange;
                $('.pv-toolbarpanel-info').append(toolbarContent);
                $('.pv-altinfopanel').hide();
            }
        };

        this.NewMarker = function (item) {
            item.marker = new google.maps.Marker({ position: item.loc, map: this.map, title: item.facetItem.Name });
            if (!this.buckets[this._bucket].ids[item.facetItem.Id]) this._bucket++;
            item.marker.setIcon(this.icons[this._bucket]);
            google.maps.event.addListener(item.marker, "click", (function (item) {
                return function () {$.publish("/PivotViewer/Views/Item/Selected", [{ item: item}]);}
            })(item));
        }

        this.RefitBounds = function () {
            var bounds = new google.maps.LatLngBounds();
            for (i = 0; i < this.filter.length; i++) {
                //extend the bounds to include each marker's position
                var item = this.filter[i];
                if(item.loc != undefined) bounds.extend(item.marker.position);
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
        $('.pv-mainpanel').append("<div class='pv-altinfopanel' id='pv-altinfopanel'></div>");
        $('.pv-altinfopanel').css('left', (($('.pv-mainpanel').offset().left + $('.pv-mainpanel').width()) - 205) + 'px').css('height', $(window).height() - $('.pv-toolbarpanel').height() - 58 + 'px');
        this.Activate();  // Activate calls MapView APILoaded? moving to setup
    },
    SetOptions: function (options) {
        $('.pv-viewpanel').append("<div class='pv-mapview-canvas' id='pv-map-canvas'></div>");

        if (options.MapService == undefined || options.MapService.toLowerCase() != "openstreetmap") {
            this.APIKey = options.GoogleAPIKey != undefined ? options.GoogleAPIKey : "AIzaSyAnPWLPKMYKQZa2g1p11d_vllwwT7CFdQg";
            this.mapService = "google";
            PivotViewer.Utils.loadScript("lib/wicket/wicket-gmap3.min.js");
            if (options.GeocodeService == "Google") this.geocodeService = "Google";
            else this.GeocodeService = "Nominatim";
        }
        else {
            this.mapService = "openstreetmap";
            this.geocodeService = "Nominatim";
            PivotViewer.Utils.loadScript("lib/wicket/wicket-leaflet.min.js");

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
                for (var i = 0; i < this.tiles.length; i++) {
                    var marker = this.tiles[i].marker;
                    if(marker != undefined) this.map.removeLayer(marker);
                }
            }

            this.SelectMarker = function (item) {
                var bucket = that.GetBucketNumber(item);
                if (item.marker == that.selectedMarker) {
                    item.marker.setIcon(new that.icons[bucket]);
                    that.selected = null;
                    that.selectedMarker.setZIndexOffset(0);
                    that.selectedMarker = null;    
                    that.selectedBucket = -1;
                    $('.pv-toolbarpanel-info').empty();
                    $('.pv-altinfopanel').fadeIn();
                }
                else {
                    item.marker.setIcon(new that.iconsSelected[bucket]);
                    item.marker.setZIndexOffset(1000000000);
                    that.selected = item;
                    if (that.selectedMarker != null) {
                        that.selectedMarker.setIcon(new that.icons[that.selectedBucket]);
                        that.selectedMarker.setZIndexOffset(0);
                    }
                    that.selectedMarker = item.marker;
                    that.selectedBucket = bucket;
                    that.map.panTo(item.loc);
                    $('.pv-toolbarpanel-info').empty();
                    var toolbarContent = "<img style='height:15px;width:auto' src='" + item.marker._icon.src + "'></img>";
                    if (that.buckets[bucket].startRange == that.buckets[bucket].endRange)
                        toolbarContent += that.buckets[bucket].startRange;
                    else toolbarContent += that.buckets[bucket].startRange + " to " + that.buckets[bucket].endRange;
                    $('.pv-toolbarpanel-info').append(toolbarContent);
                    $('.pv-altinfopanel').hide();
                    
                }
            }

            this.NewMarker = function (item) {
                item.marker = new L.Marker(item.loc, { title: item.facetItem.Name });
                this.map.addLayer(item.marker);
                if (!this.buckets[this._bucket].ids[item.facetItem.Id]) this._bucket++;
                item.marker.setIcon(new this.icons[this._bucket]);
                item.marker.on('click', (function (item) {
                    return function () {$.publish("/PivotViewer/Views/Item/Selected", [{ item: item}]);}
                })(item));
                return marker;
            }

            this.RefitBounds = function () {
                var markerPos = [];

                for (i = 0; i < this.filter.length; i++) {
                    //extend the bounds to include each marker's position
                    var item = this.filter[i];
                    if(item.marker != undefined) markerPos.push(item.marker.getLatLng());
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
        this.Activate();
        if (options.MapOverlay != undefined) this.overlayBaseImageUrl = options.MapOverlay;
    },

    Activate: function () {
        if (!Modernizr.canvas) return;

        this._super();
        $('.pv-toolbarpanel-info').fadeIn();
        $('.pv-altinfopanel').fadeIn();
        $('.pv-toolbarpanel-zoomcontrols').hide();
        $('.pv-toolbarpanel-zoomcontrols').css('border-width', '0');
        $('#MAIN_BODY').css('overflow', 'auto');
        $('.pv-mapview-canvas').fadeIn();
        $('.pv-toolbarpanel-sort').fadeIn();

        if (this.mapService == "google" && this.map == null) {
        	PivotViewer.Utils.loadScript("https://maps.googleapis.com/maps/api/js?key=" + this.APIKey + "&sensor=false&callback=mapView.APILoaded");
        }
        else if (this.filtered) this.Filter(this.filterEvt.tiles, this.filterEvt.filter, this.filterEvt.sort);
    },
    GetButtonImage: function () { return 'images/MapView.png'; },
    GetButtonImageSelected: function () { return 'images/MapViewSelected.png'; },
    GetViewName: function () { return 'Map View'; },
    Deactivate: function () {
        this._super();
        $('.pv-altinfopanel').fadeOut();
        $('.pv-toolbarpanel-info').fadeOut();
        $('.pv-mapview-canvas').fadeOut();
        $('.pv-toolbarpanel-sort').fadeOut();
    },
    GetBucketNumber: function (item) {
        var bkt = this.buckets.ids[item.facetItem.Id];
        return bkt != undefined ? bkt : -1;
    },
    Bucketize: function (tiles, filterList, orderBy) {
        category = PivotCollection.GetFacetCategoryByName(orderBy);
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

        Debug.log('Map View Filtered: ' + filter.length);

        //if (changingView) {
        //    $('.pv-viewarea-canvas').fadeOut();
        //    $('.pv-tableview-table').fadeOut();
        //    $('.pv-mapview2-canvas').fadeOut();
        //    $('.pv-timeview-canvas').fadeOut();
        //    $('.pv-toolbarpanel-sort').fadeIn();
        //    $('.pv-toolbarpanel-timelineselector').fadeOut();
        //    $('.pv-toolbarpanel-zoomslider').fadeOut();
        //    $('.pv-toolbarpanel-maplegend').fadeIn();
        //    if (!selectedItem)
        //        $('.pv-mapview-legend').show('slide', { direction: 'up' });
        //    $('.pv-toolbarpanel-zoomcontrols').css('border-width', '0');
        //    $('#MAIN_BODY').css('overflow', 'auto');
        //    $('.pv-mapview-canvas').fadeIn(function () {
        //        if (selectedItem)
        //            $.publish("/PivotViewer/Views/Item/Selected", [{ id: selectedItem.Id, bkt: 0 }]);
        //    });
        //}

        this.sortFacet = sortFacet;
        this.filter = filter;
        this.tiles = tiles;

        this.buckets = this.Bucketize(tiles, filter, this.sortFacet);       

        //Clear legend info in toolbar
        $('.pv-toolbarpanel-info').empty();
        if (this.selected == null) $('.pv-altinfopanel').fadeIn();

        //Check for geometry facet
        //This should contain a geometry definition im WKT that applies to the whole collection
        //E.g. where a geometry filter has been applied
        var gotGeometry = false;
        for (var i = 0; i < PivotCollection.FacetCategories.length && !gotGeometry; i++) {
            var category = PivotCollection.FacetCategories[i];
            if (category.Name.toUpperCase().indexOf("GEOMETRY") >= 0) {
                for (var j = 0; j < filter.length ; j++) {
                    var facet = filter[j].facetItem.FacetByName[category.Name];
                    if (facet == undefined) continue;
                    this.geometryValue = facet.FacetValues[0].Value;
                    gotGeometry = true;
                    break;
                }
                if (j < filter.length) break;
            }
        }

        //Check for area facet
        for (var i = 0; i < PivotCollection.FacetCategories.length; i++) {
            var category = PivotCollection.FacetCategories[i];
            if (category.Name.toUpperCase().indexOf("AREA") >= 0) {
                for (var j = 0; j < filter.length; j++) {
                    var facet = filter[j].facetItem.FacetByName[category.Name];
                    if (facet == undefined) continue;
                    this.areaValues.push({ id: filter[j].facetItem.Id, area: facet.FacetValues[0].Value });
                    break;
                }
            }
        }

        var category, category1 = null, category2 = null;
        for (var i = 0; i < PivotCollection.FacetCategories.length; i++) {
 

            var category = PivotCollection.FacetCategories[i], name = category.Name.toLowerCase();

            if (name.indexOf("latitude") >= 0) category1 = category;
            else if (name.indexOf("longitude") >= 0) category2 = category;
            if (category1 != null && category2 != null) {
                if (category1.uiInit == false) PV.InitUIFacet(category1);
                if (category2.uiInit == false) PV.InitUIFacet(category2);
                break;
            }
            if (name.indexOf("location") >= 0) {
                if (category.uiInit == false) PV.InitUIFacet(category);
                break;
            }
        }

        for (var i = 0; i < filter.length; i++) {
            var item = filter[i], c;

            //Have we cached the item location?
            if (item.loc == undefined) {
                //First try to get co-ordinate information from the facets
                var facet1 = null, facet2 = null;
                if(category1 != null && category2 != null) {
                    facet1 = item.facetItem.FacetByName[category1.Name];
                    facet2 = item.facetItem.FacetByName[category2.Name];
  
                    if (facet1 != undefined && facet2 != undefined) {
                        var latitude = facet1.FacetValues[0].Value;
                        var longitude = facet2.FacetValues[0].Value;

                        if (longitude != null && latitude != null) {
                            if (typeof latitude == "string") latitude = parseFloat(latitude);
                            if (typeof longitude == "string") longitude = parseFloat(longitude);
                            item.loc = new L.LatLng(latitude, longitude);
                        }
                    }
                }
                else if (category != null) {
                    var facet = item.facetItem.FacetByName[category.Name];
                    if (facet == undefined) continue;
                    var value = facet.FacetValues[0].Value;
                    if (value.toLowerCase().indexOf("point(") == 0) {
                        var longitude = parseFloat(value.substring(6, value.indexOf(' ', 6) - 6));
                        var latitude = parseFloat(value.substring(value.indexOf(' ', 6) + 1, value.indexOf(')') - (value.indexOf(' ') + 1)));
                        if (!isNaN(latitude) && !isNaN(longitude)) item.loc = new L.LatLng(latitude, longitude);
                    }
                    else if (value.indexOf(",") > -1) {
                        //Could be a co-ordinate pair
                        var latitude = parseFloat(value.substring(0, value.indexOf(',')));
                        var longitude = parseFloat(value.substring(value.indexOf(',')));
                        if (!isNaN(latitude) && !isNaN(longitude)) item.loc = new L.LatLng(latitude, longitude);
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
                            for (var c = 0; c < item.facetItem.Facets.length; c++) {
                                if (item.facetItem.Facets[c].Name.toUpperCase().indexOf("COUNTRY") >= 0) {
                                    var country = item.facetItem.Facets[c].FacetValues[0].Value;
                                    if (country.length > 1) geoLoc = geoLoc + ", " + country.replace('_', ' ').toUpperCase();
                                    break;
                                }
                            }
                            // Is it in the cache?
                            if (this.locCache[geoLoc] != undefined) item.loc = this.locCache[geoLoc];
                            else if (this.localStorage) {
                                // Now try the users persistent cache
                                var loc = JSON.parse(localStorage.getItem(geoLoc));
                                if (loc) {
                                    var latitude = parseFloat(loc.latitude);
                                    var longitude = parseFloat(loc.longitude);
                                    if (!isNaN(latitude) && !isNaN(longitude)) {
                                        item.loc = new L.LatLng(latitude, longitude);
                                        this.locCache[geoLoc] = loc;
                                    }
                                }
                            }
                            else {
                                // Not in local or persistent cache so will have to use geocode service
                                if (g < 1000) {//limiting the number of items to geocode at once to 1000 for now
                                    if (this.itemsToGeocode[geoLoc] == undefined) {
                                        this.itemsToGeocode[geoLoc] = [];
                                        g++;
                                    }
                                    this.itemsToGeocode[geoLoc].push(item);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (g > 0) this.GetLocationsFromNames();
        $('.pv-mapview-canvas').css('height', this.height - 12 + 'px');
        $('.pv-mapview-canvas').css('width', this.width - 415 + 'px');
        this.CreateMap();
        this.filtered = false;
    },
    GetButtonImage: function () {return 'images/MapView.png';},
    GetButtonImageSelected: function () {return 'images/MapViewSelected.png';},
    GetViewName: function () { return 'Map View'; },
    MakeGeocodeCallBack: function(locName) {
        var that = this;
        if (this.geocodeService == "Google"){
            var geocodeCallBack = function(results, status) {
                var loc = new L.LatLng(0, 0);
                
                if (status == google.maps.GeocoderStatus.OK) { 
                    var googleLoc = results[0].geometry.location;
                    var lat = googleLoc.lat();
                    var long = googleLoc.lng();
                    if (lat && long) loc = new L.LatLng(lat, long);
                }

                // Add to local cache
                that.locCache[locName] = loc;
       
                // Add to persistent cache
                if (that.localStorage) localStorage.setItem(locName, JSON.stringify(loc));
       
                // Find items that have that location
                for (var i = 0; i < that.itemsToGeocode[locName].length; i++) {
                    that.itemsToGeocode[locName][i].loc = loc;
                }
                delete that.itemsToGeocode[locName];
       
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
                
                if(Object.keys(that.itemsToGeocode).length == 0) that.CreateMap();
            }
        }
        else {
            var geocodeCallBack = function (xml) {
                var loc = new L.LatLng(0, 0);
                var results = $(xml).find("searchresults");
                var place = $(xml).find("place");

                if (place) {
                    var lat = $(place).attr("lat");
                    var lon = $(place).attr("lon");
                    if (lat && lon) loc = new L.LatLng(lat, lon);
                }

                that.locCache[place] = loc;

                // Add to persistent cache
                if (that.localStorage) localStorage.setItem(locName, JSON.stringify(loc));

                // Find items that have that location
                for (var i = 0; i < that.itemsToGeocode[locName].length; i++) {
                    that.itemsToGeocode[locName][i].loc = loc;
                }
                delete that.itemsToGeocode[locName];

                // If geocoding has taken more than 20 secs then try to set
                // the bookmark.  Otherwise, if the time taken is more than 
                // 2 secs make the pins we have so far
                var now = new Date();
                if ((now.getTime() - that.geocodeZero.getTime()) / 1000 > 20) {
                    that.RedrawMarkers();
                    that.startGeocode = new Date();
                }
                else if ((now.getTime() - that.startGeocode.getTime()) / 1000 > 2) {
                    that.RedrawMarkers();
                    that.RefitBounds();
                    that.GetOverlay();
                    that.startGeocode = new Date();
                }

                if (Object.keys(that.itemsToGeocode).length == 0) that.CreateMap();
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
                success: callbackFunction
            });
        }
    },
    GetLocationsFromNames: function () {
        for (var key in Object.keys(this.itemsToGeocode)) {
            this.Geocode(key, this.MakeGeocodeCallBack(key));
        }
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
        if (this['refitBounds'] != undefined) this.refitBounds();
        if (this['GetOverlay'] != undefined)  this.GetOverlay();
        this.CreateLegend();
    },
    CreateMarkers: function () {
        if (this['clearMarkers'] != undefined) this.clearMarkers();
        this._bucket = 0;
        for (var i = 0; i < this.filter.length; i++) {  
            var item = this.filter[i];
            if(item.loc != undefined) this.NewMarker(this.filter[i]);
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
    CreateLegend: function() {
        // Get width of the info panel (width of icon image = 30 )
        var width = $('.pv-altinfopanel').width() - 32;
        $('.pv-altinfopanel').empty();
        $('.pv-altinfopanel').append("<div class='pv-legend-heading' style='height:28px' title='" + this.sortFacet + "'>" + this.sortFacet + "</div>");
        var tableContent = "<table id='pv-legend-data' style='color:#484848;'>";
        for (var i = 0; i < this.buckets.length; i++) {
            var iconFile = this.mapService == "google" ? this.icons[i] : (new this.icons[i]).options.iconUrl;
            tableContent += "<tr><td><img src='" + iconFile + "'></img></td>";
            if (this.buckets[i].startRange == this.buckets[i].endRange)
                tableContent += "<td><div style='overflow:hidden;white-space:nowrap;width:" + width + "px;text-overflow:ellipsis'>" + this.buckets[i].startLabel + "</div></td></tr>"; 
            else tableContent += "<td><div style='overflow:hidden;white-space:nowrap;width:" + width + "px;text-overflow:ellipsis'>" + this.buckets[i].startLabel + " to " + this.buckets[i].endLabel + "</div></td></tr>"; 
        }
        tableContent +="</table>";
        $('.pv-altinfopanel').append(tableContent);
    }
});
