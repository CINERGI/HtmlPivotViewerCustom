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
                PV.zoom(0);
                that.recalibrateUISettings();
            }
            else {
                //Move the scaled position to the mouse location
                that.currentOffsetX = evt.x - ((evt.x - that.currentOffsetX) / oldScale) * that.scale;
                that.currentOffsetY = evt.y - ((evt.y - that.currentOffsetY) / oldScale) * that.scale;
                that.currentWidth = newWidth;
                that.currentHeight = (that.height - that.offsetY) * that.scale;
                that.recalibrateUISettings();
            }

            that.setTilePositions(that.rowscols, that.filterList, that.currentOffsetX, that.currentOffsetY, true, true, zoomTime);

            //deselect tiles if zooming back to min size
            if (that.scale == 1 && oldScale != 1) {
                for (var i = 0; i < that.tiles.length; i++) {
                    that.tiles[i].setSelected(false);
                }
                that.selected = null;
                $.publish("/PivotViewer/Views/Item/Selected", [{item: that.selected, bkt: 0}]);
            }
        });
    },
    resetUISettings: function () { this.rowscols = this.calculateDimensions(this.currentWidth - this.offsetX, this.currentHeight - this.offsetY, this.maxRatio, this.filterList.length - this.numMissing); },
    recalibrateUISettings: function () { this.rowscols = this.getTileDimensions(this.currentWidth - this.offsetX, this.currentHeight - this.offsetY, this.maxRatio, this.filterList.length - this.numMissing, this.rowscols); },
    setup: function (width, height, offsetX, offsetY, tileMaxRatio) {
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
    activate: function () {
        var that = this;
        if (!Modernizr.canvas) return;

        this._super();

        // Clear all the multiple images that are used in the grid view
        for (var l = 0; l < this.tiles.length; l++) this.tiles[l]._locations = [this.tiles[l]._locations[0]];
        // Ensure any selected location is zero
        for (var i = 0; i < this.tiles.length; i++) this.tiles[i].selectedLoc = 0;

        var pt1Timeout = 0;
        //zoom out first
        var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
        if (value > 0) {
            this.selected = null;
            //zoom out
            this.currentOffsetX = this.offsetX;
            this.currentOffsetY = this.offsetY;
            PV.zoom(0);

            this.resetUISettings();
            for (var i = 0; i < this.filterList.length; i++) {
                var tile = this.filterList[i];
                tile.origwidth = this.rowscols.TileHeight / TileController._imageController.getRatio(tile.item.img);
                tile.origheight = this.rowscols.TileHeight;
            }
            this.setTilePositions(this.rowscols, this.tiles, this.currentOffsetX, this.currentOffsetY, true, false, 1000);
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

                if (tile.filtered && (Settings.showMissing || !tile.missing)) continue;
                tile.start = PivotViewer.Utils.now();
                tile.end = tile.start + 1000;
                var theta = Math.atan2(tile._locations[0].y - (that.currentHeight / 2), tile._locations[0].x - (that.currentWidth / 2))
                tile._locations[0].destinationx = that.currentWidth * Math.cos(theta) + (that.currentWidth / 2);
                tile._locations[0].destinationy = that.currentHeight * Math.sin(theta) + (that.currentHeight / 2);
                tile.destinationwidth = 1;
                tile.destinationheight = 1;
            }

            // recalculate max width of images in filterList
            that.maxRatio = TileController._imageController.getRatio(that.tiles[0].item.img);
            for (var i = 0; i < that.filterList.length; i++) {
                var ratio = TileController._imageController.getRatio(that.filterList[i].item.img);
                if (ratio < that.maxRatio) that.maxRatio = ratio;
            }

            var pt2Timeout = that.filterList.length == that.tiles.length ? 0 : 500;
            setTimeout(function () {
                that.numMissing = 0;
                if(!Settings.showMissing) {
                    for (var i = 0; i < that.filterList.length; i++) {
                        if(that.filterList[i].missing) that.numMissing++;
                    }
                }
                that.resetUISettings();
                for (var i = 0; i < that.tiles.length; i++) {
                    var tile = that.tiles[i];
                    tile.origwidth = that.rowscols.TileHeight / TileController._imageController.getRatio(tile.item.img);
                    tile.origheight = that.rowscols.TileHeight;
                }
                that.setTilePositions(that.rowscols, that.filterList, that.offsetX, that.offsetY, false, false, 1000);
            }, pt2Timeout);

        }, pt1Timeout);
    },
    getButtonImage: function () {return 'images/GridView.png';},
    getButtonImageSelected: function () {return 'images/GridViewSelected.png';},
    getViewName: function () { return 'Grid View'; },

    /// Sets the tiles position based on the calculateDimensions layout function
    setTilePositions: function (rowscols, tiles, offsetX, offsetY, initTiles, keepColsRows, milliseconds) {
        //re-use previous columns
        var columns = (keepColsRows && this.rowscols)  ? this.rowscols.Columns : rowscols.Columns;
        if (!keepColsRows) this.rowscols = rowscols;

        var currentColumn = 0;
        var currentRow = 0;
        for (var i = 0; i < tiles.length; i++) {
            var tile = tiles[i];
            if (!Settings.showMissing && tile.missing) continue;
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
    centerOnTile: function (tile) {
        var col = Math.round((tile._locations[0].x - this.currentOffsetX) / tile.width);
        var row = Math.round((tile._locations[0].y - this.currentOffsetY) / tile.height);

        var canvasHeight = tile.context.canvas.height
        var canvasWidth = tile.context.canvas.width - ($('.pv-filterpanel').width() + $('.pv-infopanel').width());

        // Find which is proportionally bigger, height or width
        if (tile.height / canvasHeight > (tile.height / TileController._imageController.getRatio(tile.item.img)) / canvasWidth)
            origProportion = tile.origheight / canvasHeight;
        else origProportion = tile.origwidth / canvasWidth;
        if (this.selected == null) PV.zoom(Math.round((0.75 / origProportion) * 2));

        this.currentOffsetX = (this.rowscols.TileMaxWidth * -col) + (this.width / 2) - (this.rowscols.TileMaxWidth / 2);
        this.currentOffsetY = (this.rowscols.TileHeight * -row) + (this.height / 2) - (this.rowscols.TileHeight / 2);
        this.setTilePositions(this.rowscols, this.filterList, this.currentOffsetX, this.currentOffsetY, true, true, 1000);
    },
    handleClick: function (evt) {
        var tile = this._super(evt);
        if (tile != null) tile.setSelected(true);

        if(tile != null && this.selected != tile) this.centerOnTile(tile);
        else {
            this.selected = tile = null;
            //zoom out
            this.currentOffsetX = this.offsetX;
            this.currentOffsetY = this.offsetY;
            PV.zoom(0);
        }

        $.publish("/PivotViewer/Views/Item/Selected", [{item: tile}]);
    }
});
