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
//    Copyright (C) 2012-2014 OpenLink Software - http://www.openlinksw.com/
//
//  This software is licensed under the terms of the
//  GNU General Public License v2 (see COPYING)
//

///Views interface - all views must implement this
PivotViewer.Views.IPivotViewerView = Object.subClass({
	init: function () {
		this.isActive = false;
		this.filtered = true;
		this.selected = null;
		this.tiles = [];

		var that = this;
		$.subscribe("/PivotViewer/Views/Filtered", function (evt) {
		    that.filtered = true;
		    that.filterEvt = evt;
		    if (that.isActive) {
		        that.filter(evt.tiles, evt.filterList, evt.sort);
		        that.activate();
		    }
		});
	},
	setup: function (width, height, offsetX, offsetY, tileMaxRatio) { },
	setOptions: function(options) {}, 
	filterList: function (tiles, currentFilter) { },
	getUI: function () {
	    if (Modernizr.canvas) return "";
	    else return "<div class='pv-viewpanel-unabletodisplay'><h2>Unfortunately this view is unavailable as your browser does not support this functionality.</h2>Please try again with one of the following supported browsers: IE 9+, Chrome 4+, Firefox 2+, Safari 3.1+, iOS Safari 3.2+, Opera 9+<br/><a href='http://caniuse.com/#feat=canvas'>http://caniuse.com/#feat=canvas</a></div>";
	},
	getButtonImage: function () { return ''; },
	getButtonImageSelected: function () { return ''; },
	getViewName: function () { return ''; },
	activate: function () { this.isActive = true; },
	deactivate: function () { this.isActive = false; },
	setSelected: function (item) { this.selected = item; },
	centerOnTile: function (item) { return;}
});
