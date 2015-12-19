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
        this.filtered = false;
        this.selected = null;
        this.tiles = [];
        this.filterList = [];
        this.sortCategory = null;
    },
    handleFilter: function (tiles, filterList, sortCategory) {
        if (tiles != undefined) this.tiles = tiles; 
        if (filterList != undefined) this.filterList = filterList; 
        if(sortCategory != undefined) this.sortCategory = sortCategory;
        this.filtered = true;
        if (this.isActive) this.activate();
    },
    setup: function (width, height, offsetX, offsetY, tileMaxRatio) { },
    setOptions: function(options) {}, 
    getButtonImage: function () { return ''; },
    getButtonImageSelected: function () { return ''; },
    getViewName: function () { return ''; },
    filter: function () {},
    activate: function () {
        this.isActive = true;
        $('.pv-viewpanel-view').empty();
        if (this.filtered) {
            this.filter();
            this.filtered = false;
        }
    },
    deactivate: function () { this.isActive = false; },
	setSelected: function (tile) { this.selected = tile; },
	centerOnTile: function (tile) { return; },
	handleClick: function (evt) { return null; },
	handleHover: function (evt) { return null; },
    handleContextMenu: function(evt) {return null; }
});
