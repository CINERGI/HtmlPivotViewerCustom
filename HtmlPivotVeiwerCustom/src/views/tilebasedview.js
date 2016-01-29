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
    init: function() {
        this._super();
        var that = this;
        $.subscribe("/PivotViewer/Views/Canvas/Drag", function (evt) {
            if (!that.isActive) return;

            var dragX = evt.x, dragY = evt.y;

            //LHS bounds check
            if (dragX > 0 && that.currentOffsetX > that.offsetX) dragX = 0;
                //RHS bounds check
                //if the current offset is smaller than the default offset and the zoom scale == 1 then stop drag
            else if (that.currentOffsetX < that.offsetX && that.currentWidth == that.width) dragX = 0;
            else if (dragX < 0 && that.currentOffsetX < (-that.currentWidth + that.width)) dragX = 0;
            else that.currentOffsetX += dragX;

            //Top bounds check
            if (dragY > 0 && (that.currentOffsetY + that.canvasHeightUIAdjusted) > that.currentHeight + that.offsetY) dragY = 0;
                //bottom bounds check
            else if (that.currentOffsetY < that.offsetY && that.currentHeight == that.height) dragY = 0;
            else if (dragY < 0 && (that.currentOffsetY - that.offsetY) < (-that.currentHeight + that.height)) dragY = 0;
            else that.currentOffsetY += dragY;

            if (dragX == 0 && dragY == 0) return;
            else that.offsetTiles(dragX, dragY);
        });
    },
    super_handleClick: function (evt) {
        for (var i = 0; i < this.filterList.length; i++) {
            var loc = this.filterList[i].contains(evt.x, evt.y);
            if (loc >= 0) return this.filterList[i];
        }
    },
    handleClick: function (evt) { return this.super_handleClick(evt); },
    super_handleHover: function (evt) {
        if (this.selected != null) return;
        for (var i = 0; i < this.filterList.length; i++) {
            var loc = this.filterList[i].contains(evt.x, evt.y);
            if (loc >= 0) this.filterList[i].setSelected(true);
            else this.filterList[i].setSelected(false);
        }
    },
    handleHover: function (evt) { this.super_handleHover(evt); },
    activate: function () {
        this._super();
        $('.pv-toolbarpanel-zoomslider').fadeIn();
        $('.pv-toolbarpanel-zoomcontrols').css('border-width', '1px');
        $('#MAIN_BODY').css('overflow', 'auto');
        $('.pv-toolbarpanel-sort').fadeIn();
        $('.pv-canvas').fadeIn();
    },
    deactivate: function () {
        this._super();
        $('.pv-toolbarpanel-zoomslider').fadeOut();
        $('.pv-toolbarpanel-sort').fadeOut();
        $('.pv-canvas').fadeOut();
    },
    offsetTiles: function (offsetX, offsetY) {
		for (var i = 0; i < this.filterList.length; i++) {
            this.filterList[i]._locations[0].destinationx += offsetX;
            this.filterList[i]._locations[0].destinationy += offsetY;
		}
	},
	calculateDimensions: function (canvasWidth, canvasHeight, tileMaxRatio, tileCount) {
	    var gap = 0.9;
		var a = tileMaxRatio * (tileCount - gap * gap);
		var b = (canvasHeight + (canvasWidth * tileMaxRatio)) * gap;
		var c = -1 * (canvasHeight * canvasWidth);
		var tileMaxWidth = ((-1 * b) + Math.sqrt(b * b - (4 * a * c))) / (2 * a);
		var tileHeight = Math.floor(tileMaxWidth * tileMaxRatio);
		var canvasRows = Math.floor(canvasHeight / tileHeight);
		var canvasColumns = canvasWidth > tileMaxWidth ? Math.floor(canvasWidth / tileMaxWidth) : 1; //RNP
		var paddingX = canvasWidth - (canvasColumns * tileMaxWidth), paddingY = canvasHeight - (canvasRows * tileHeight);
		if (tileHeight < 3) tileHeight = 3;
		return { Rows: canvasRows, Columns: canvasColumns, TileMaxWidth: tileMaxWidth, TileHeight: tileHeight, PaddingX : paddingX, PaddingY: paddingY };
	},
	getTileDimensions: function (canvasWidth, canvasHeight, tileMaxRatio, tileCount, rowscols) {
	    var gap = 0.9;
	    var a = tileMaxRatio * (tileCount - gap * gap);
	    var b = (canvasHeight + (canvasWidth * tileMaxRatio)) * gap;
	    var c = -1 * (canvasHeight * canvasWidth);
	    var tileMaxWidth = ((-1 * b) + Math.sqrt(b * b - (4 * a * c))) / (2 * a);
	    var tileHeight = Math.floor(tileMaxWidth * tileMaxRatio);
	    var paddingX = canvasWidth - (rowscols.Columns * tileMaxWidth), paddingY = canvasHeight - (rowscols.Rows * tileHeight);
	    return { Rows: rowscols.Rows, Columns: rowscols.Columns, TileMaxWidth: tileMaxWidth, TileHeight: tileHeight, PaddingX: paddingX, PaddingY: paddingY };
	}
});
