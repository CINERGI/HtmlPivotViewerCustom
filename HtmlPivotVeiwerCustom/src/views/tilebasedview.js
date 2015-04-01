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

PivotViewer.Views.TileBasedView = PivotViewer.Views.IPivotViewerView.subClass({
    Activate: function () {
        this._super();
        $('.pv-toolbarpanel-zoomslider').fadeIn();
        $('.pv-toolbarpanel-zoomcontrols').css('border-width', '1px');
        $('#MAIN_BODY').css('overflow', 'auto');
        $('.pv-toolbarpanel-sort').fadeIn();
        $('.pv-viewarea-canvas').fadeIn();
    },
    Deactivate: function () {
        this._super();
        $('.pv-toolbarpanel-zoomslider').fadeOut();
        $('.pv-toolbarpanel-sort').fadeOut();
        $('.pv-viewarea-canvas').fadeOut();
    },
    OffsetTiles: function (offsetX, offsetY) {
		for (var i = 0; i < this.filter.length; i++) {
            this.filter[i]._locations[0].destinationx += offsetX;
            this.filter[i]._locations[0].destinationy += offsetY;
		}
	},
	GetRowsAndColumns: function (canvasWidth, canvasHeight, tileMaxRatio, tileCount) {
	    var gap = 0.9;
		var a = tileMaxRatio * (tileCount - gap * gap);
		var b = (canvasHeight + (canvasWidth * tileMaxRatio)) * gap;
		var c = -1 * (canvasHeight * canvasWidth);
		var tileMaxWidth = ((-1 * b) + Math.sqrt(b * b - (4 * a * c))) / (2 * a);
		var tileHeight = Math.floor(tileMaxWidth * tileMaxRatio);
		var canvasRows = Math.ceil(canvasHeight / tileHeight);
		var canvasColumns = canvasWidth > tileMaxWidth ? Math.floor(canvasWidth / tileMaxWidth) : 1; //RNP
        var paddingX = canvasWidth - (canvasColumns * tileMaxWidth);
		return { Rows: canvasRows, Columns: canvasColumns, TileMaxWidth: tileMaxWidth, TileHeight: tileHeight, PaddingX : paddingX };
	}
});
