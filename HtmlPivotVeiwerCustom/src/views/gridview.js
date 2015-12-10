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

PivotViewer.Views.GridView = PivotViewer.Views.TileBasedView.subClass({
    init: function () {
        this.scale = 1;
        this._super();
        this.dontZoom = false;
        this.numMissing = 0;
        var that = this;

        $.subscribe("/PivotViewer/Views/Canvas/Click", function (evt) {
            if (!that.isActive) return;

            var selectedTile = null;
            for (var i = 0; i < that.filter.length; i++) {
                var loc = that.filter[i].Contains(evt.x, evt.y);
                if (loc >= 0) {
                    selectedTile = that.filter[i];
                }
                else that.filter[i].Selected(false);
            }
	        that.handleSelection(selectedTile);
	    });

        $.subscribe("/PivotViewer/Views/Canvas/Hover", function (evt) {
            if (!that.isActive || that.selected != null)
                return;

            for (var i = 0; i < that.filter.length; i++) {
                var loc = that.filter[i].Contains(evt.x, evt.y); 
                if ( loc >= 0 ) that.filter[i].Selected(true);
                else that.filter[i].Selected(false);
            }
        });

        $.subscribe("/PivotViewer/Views/Canvas/Zoom", function (evt) {
            if (!that.isActive) return;

            if (that.dontZoom) {
                that.dontZoom = false;
                return;
            }

            var oldScale = that.scale;
            var preWidth = that.currentWidth;
            var preHeight = that.currentHeight;
            //Set the zoom time - the time it takes to zoom to the scale
            //if on a touch device where evt.scale != undefined then have no delay
            var zoomTime = evt.scale != undefined ? 0 : 1000;
                        
            if (evt.scale != undefined) {
                if (evt.scale >= 1) that.scale += (evt.scale - 1);
                else {
                    that.scale -= evt.scale;
                    that.scale = that.scale < 1 ? 1 : that.scale;
                }
            }
            else if (evt.delta != undefined)
                that.scale = evt.delta == 0 ? 1 : (that.scale + evt.delta);

            if (isNaN(that.scale)) that.scale = 1;

            var newWidth = (that.width - that.offsetX) * that.scale;

            //if trying to zoom out too far, reset to min
            if (newWidth < that.width || that.scale == 1) {
                that.currentOffsetX = that.offsetX;
                that.currentOffsetY = that.offsetY;
                that.currentWidth = that.width;
                that.currentHeight = that.height;
                that.scale = 1;
                // Reset the slider to zero 
                that.dontZoom = true;
                PV.Zoom(0);
                that.RecalibrateUISettings();
            }
            else {
                //Move the scaled position to the mouse location
                that.currentOffsetX = evt.x - ((evt.x - that.currentOffsetX) / oldScale) * that.scale;
                that.currentOffsetY = evt.y - ((evt.y - that.currentOffsetY) / oldScale) * that.scale;
                that.currentWidth = newWidth;
                that.currentHeight = (that.height - that.offsetY) * that.scale;
                that.RecalibrateUISettings();
            }

            that.SetVisibleTilePositions(that.rowscols, that.filter, that.currentOffsetX, that.currentOffsetY, true, true, zoomTime);

            //deselect tiles if zooming back to min size
            if (that.scale == 1 && oldScale != 1) {
                for (var i = 0; i < that.tiles.length; i++) {
                    that.tiles[i].Selected(false);
                }
                that.selected = null;
                $.publish("/PivotViewer/Views/Item/Selected", [{item: that.selected, bkt: 0}]);
            }
        });

        $.subscribe("/PivotViewer/Views/Canvas/Drag", function (evt) {
            if (!that.isActive) return;

            var dragX = evt.x;
            var dragY = evt.y;
            var noChangeX = false, noChangeY = false;
            that.currentOffsetX += dragX;
            that.currentOffsetY += dragY;

            //LHS bounds check
            if (dragX > 0 && that.currentOffsetX > that.offsetX) {
                that.currentOffsetX -= dragX;
                noChangeX = true;
            }
            //Top bounds check
            if (dragY > 0 && that.currentOffsetY > that.offsetY) {
                that.currentOffsetY -= dragY;
                noChangeY = true;
            }
            //RHS bounds check
            //if the current offset is smaller than the default offset and the zoom scale == 1 then stop drag
            if (that.currentOffsetX < that.offsetX && that.currentWidth == that.width) {
                that.currentOffsetX -= dragX;
                noChangeX = true;
            }
            if (dragX < 0 && (that.currentOffsetX) < -1 * (that.currentWidth - that.width)) {
                that.currentOffsetX -= dragX;
                noChangeX = true;
            }
            //bottom bounds check
            if (that.currentOffsetY < that.offsetY && that.currentHeight == that.height) {
                that.currentOffsetY -= dragY;
                noChangeY = true;
            }
            if (dragY < 0 && (that.currentOffsetY - that.offsetY) < -1 * (that.currentHeight - that.height)) {
                that.currentOffsetY -= dragY;
                noChangeY = true;
            }

            if (noChangeX && noChangeY) return;
            if (noChangeX) that.OffsetTiles(0, dragY);
            else if (noChangeY) that.OffsetTiles(dragX, 0);
            else that.OffsetTiles(dragX, dragY);
        });
    },
    ResetUISettings: function () { this.rowscols = this.GetRowsAndColumns(this.currentWidth - this.offsetX, this.currentHeight - this.offsetY, this.maxRatio, this.filter.length - this.numMissing); },
    RecalibrateUISettings: function () { this.rowscols = this.GetTileDimensions(this.currentWidth - this.offsetX, this.currentHeight - this.offsetY, this.maxRatio, this.filter.length - this.numMissing, this.rowscols); },
    Setup: function (width, height, offsetX, offsetY, tileMaxRatio) {
        this.width = width;
        this.height = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.maxRatio = tileMaxRatio;
        this.currentWidth = this.width;
        this.currentHeight = this.height;
        this.currentOffsetX = this.offsetX;
        this.currentOffsetY = this.offsetY;
    },
    Activate: function () {
        var that = this;
        if (!Modernizr.canvas) return;

        this._super();

        if (this.filtered) this.Filter(this.filterEvt.tiles, this.filterEvt.filter);

        // Clear all the multiple images that are used in the grid view
        for (var l = 0; l < this.tiles.length; l++) {
            while (this.tiles[l]._locations.length > 1)
                this.tiles[l]._locations.pop();
        }
        // Ensure any selected location is zero
        for (var i = 0; i < this.tiles.length; i++) {
            this.tiles[i].selectedLoc = 0;
        }

        var pt1Timeout = 0;
        //zoom out first
        var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
        if (value > 0) {
            this.selected = null;
            //zoom out
            this.currentOffsetX = this.offsetX;
            this.currentOffsetY = this.offsetY;
            PV.Zoom(0);

            this.ResetUISettings();
            for (var i = 0; i < this.filter.length; i++) {
                var tile = this.filter[i];
                tile.origwidth = this.rowscols.TileHeight / TileController._imageController.GetRatio(tile.facetItem.Img);
                tile.origheight = this.rowscols.TileHeight;
            }
            this.SetVisibleTilePositions(this.rowscols, this.tiles, this.currentOffsetX, this.currentOffsetY, true, false, 1000);
            pt1Timeout = 1000;
        }
        setTimeout(function () {
            for (var i = 0; i < that.tiles.length; i++) {
                //setup tiles
                var tile = that.tiles[i];
                tile._locations[0].startx = tile._locations[0].x;
                tile._locations[0].starty = tile._locations[0].y;
                tile.startwidth = tile.width;
                tile.startheight = tile.height;

                if (tile.filtered && (settings.showMissing || !tile.missing)) continue;
                tile.start = PivotViewer.Utils.now();
                tile.end = tile.start + 1000;
                var theta = Math.atan2(tile._locations[0].y - (that.currentHeight / 2), tile._locations[0].x - (that.currentWidth / 2))
                tile._locations[0].destinationx = that.currentWidth * Math.cos(theta) + (that.currentWidth / 2);
                tile._locations[0].destinationy = that.currentHeight * Math.sin(theta) + (that.currentHeight / 2);
                tile.destinationwidth = 1;
                tile.destinationheight = 1;
            }

            // recalculate max width of images in filter
            that.maxRatio = TileController._imageController.GetRatio(that.tiles[0].facetItem.Img);
            for (var i = 0; i < that.filter.length; i++) {
                var ratio = TileController._imageController.GetRatio(that.filter[i].facetItem.Img);
                if (ratio < that.maxRatio) that.maxRatio = ratio;
            }

            var pt2Timeout = that.filter.length == that.tiles.length ? 0 : 500;
            setTimeout(function () {
                that.numMissing = 0;
                if(!settings.showMissing) {
                    for (var i = 0; i < that.filter.length; i++) {
                        if(that.filter[i].missing) that.numMissing++;
                    }
                }
                that.ResetUISettings();
                for (var i = 0; i < that.tiles.length; i++) {
                    var tile = that.tiles[i];
                    tile.origwidth = that.rowscols.TileHeight / TileController._imageController.GetRatio(tile.facetItem.Img);
                    tile.origheight = that.rowscols.TileHeight;
                }
                that.SetVisibleTilePositions(that.rowscols, that.filter, that.offsetX, that.offsetY, false, false, 1000);
            }, pt2Timeout);

        }, pt1Timeout);
    },
    Filter: function (tiles, filter) {
        this.tiles = tiles;
        this.filter = filter;
        this.filtered = false;
    },
    GetButtonImage: function () {return 'images/GridView.png';},
    GetButtonImageSelected: function () {return 'images/GridViewSelected.png';},
    GetViewName: function () { return 'Grid View'; },

    /// Sets the tiles position based on the GetRowsAndColumns layout function
    SetVisibleTilePositions: function (rowscols, tiles, offsetX, offsetY, initTiles, keepColsRows, milliseconds) {
        //re-use previous columns
        var columns = (keepColsRows && this.rowscols)  ? this.rowscols.Columns : rowscols.Columns;
        if (!keepColsRows) this.rowscols = rowscols;

        var currentColumn = 0;
        var currentRow = 0;
        for (var i = 0; i < tiles.length; i++) {
            var tile = tiles[i];
            if (!settings.showMissing && tile.missing) continue;
            if (initTiles) {
                //setup tile initial positions
                tile._locations[0].startx = tile._locations[0].x;
                tile._locations[0].starty = tile._locations[0].y;
                tile.startwidth = tile.width;
                tile.startheight = tile.height;
            }

            //set destination positions
            tile.destinationwidth = rowscols.TileMaxWidth;
            tile.destinationheight = rowscols.TileHeight;
            tile._locations[0].destinationx = (currentColumn * rowscols.TileMaxWidth) + offsetX;
            tile._locations[0].destinationy = (currentRow * rowscols.TileHeight) + offsetY;
            tile.start = PivotViewer.Utils.now();
            tile.end = tile.start + milliseconds;
            if (currentColumn == columns - 1) {
                currentColumn = 0;
                currentRow++;
            }
            else currentColumn++;
        }
    },
    CenterOnTile: function (tile) {
        var col = Math.round((tile._locations[0].x - this.currentOffsetX) / tile.width);
        var row = Math.round((tile._locations[0].y - this.currentOffsetY) / tile.height);

        var canvasHeight = tile.context.canvas.height
        var canvasWidth = tile.context.canvas.width - ($('.pv-filterpanel').width() + $('.pv-infopanel').width());

        // Find which is proportionally bigger, height or width
        if (tile.height / canvasHeight > (tile.height / TileController._imageController.GetRatio(tile.facetItem.Img)) / canvasWidth)
            origProportion = tile.origheight / canvasHeight;
        else origProportion = tile.origwidth / canvasWidth;
        if (this.selected == null) PV.Zoom(Math.round((0.75 / origProportion) * 2));

        this.currentOffsetX = (this.rowscols.TileMaxWidth * -col) + (this.width / 2) - (this.rowscols.TileMaxWidth / 2);
        this.currentOffsetY = (this.rowscols.TileHeight * -row) + (this.height / 2) - (this.rowscols.TileHeight / 2);
        this.SetVisibleTilePositions(this.rowscols, this.filter, this.currentOffsetX, this.currentOffsetY, true, true, 1000);
    },
    handleSelection: function (tile) {
        if (tile != null) tile.Selected(true);

        if(tile != null && this.selected != tile) this.CenterOnTile(tile);
        else {
            this.selected = tile = null;
            //zoom out
            this.currentOffsetX = this.offsetX;
            this.currentOffsetY = this.offsetY;
            PV.Zoom(0);
        }

        $.publish("/PivotViewer/Views/Item/Selected", [{item: tile}]);
    }
});
