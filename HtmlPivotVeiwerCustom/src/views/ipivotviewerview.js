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
		        that.Filter(evt.tiles, evt.filter, evt.sort);
		        that.Activate();
		    }
		});
	},
	Setup: function (width, height, offsetX, offsetY, tileMaxRatio) { },
	Filter: function (tiles, currentFilter) { },
	GetUI: function () {
	    if (Modernizr.canvas) return "";
	    else return "<div class='pv-viewpanel-unabletodisplay'><h2>Unfortunately this view is unavailable as your browser does not support this functionality.</h2>Please try again with one of the following supported browsers: IE 9+, Chrome 4+, Firefox 2+, Safari 3.1+, iOS Safari 3.2+, Opera 9+<br/><a href='http://caniuse.com/#feat=canvas'>http://caniuse.com/#feat=canvas</a></div>";
	},
	GetButtonImage: function () { return ''; },
	GetButtonImageSelected: function () { return ''; },
	GetViewName: function () { return ''; },
	Activate: function () { this.isActive = true; },
	Deactivate: function () { this.isActive = false; },
	SetSelected: function (item) { this.selected = item; },
	CenterOnTile: function (item) { return;}
});
