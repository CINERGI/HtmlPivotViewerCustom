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

///
/// Grid view
///
PivotViewer.Views.GridView = PivotViewer.Views.TileBasedView.subClass({
    init: function (collection) {
        this.collection = collection;
        this.Scale = 1;
        this._super();
        this.dontZoom = false;
        var that = this;
        this.prevFilter = null;
        //Event Handlers

        $.subscribe("/PivotViewer/Views/Canvas/Click", function (evt) {
            if (!that.isActive) return;

            var selectedTile = null;
            for (var i = 0; i < that.tiles.length; i++) {
                var loc = that.tiles[i].Contains(evt.x, evt.y);
                if (loc >= 0) {
                    selectedTile = that.tiles[i];
                }
                else that.tiles[i].Selected(false);
            }
	        that.handleSelection (selectedTile);
	    });

        $.subscribe("/PivotViewer/Views/Canvas/Hover", function (evt) {
            if (!that.isActive || that.selected != null)
                return;

            for (var i = 0; i < that.tiles.length; i++) {
                var loc = that.tiles[i].Contains(evt.x, evt.y); 
                if ( loc >= 0 ) that.tiles[i].Selected(true);
                else that.tiles[i].Selected(false);
            }
        });

        $.subscribe("/PivotViewer/Views/Canvas/Zoom", function (evt) {
            if (!that.isActive) return;

            if (that.dontZoom) {
                that.dontZoom = false;
                return;
            }

            var oldScale = that.Scale;
            var preWidth = that.currentWidth;
            var preHeight = that.currentHeight;
            //Set the zoom time - the time it takes to zoom to the scale
            //if on a touch device where evt.scale != undefined then have no delay
            var zoomTime = evt.scale != undefined ? 0 : 1000;
                        
            if (evt.scale != undefined) {
                if (evt.scale >= 1) that.Scale += (evt.scale - 1);
                else {
                    that.Scale -= evt.scale;
                    that.Scale = that.Scale < 1 ? 1 : that.Scale;
                }
            }
            else if (evt.delta != undefined)
                that.Scale = evt.delta == 0 ? 1 : (that.Scale + evt.delta);

            if (isNaN(that.Scale)) that.Scale = 1;

            var newWidth = (that.width - that.offsetX) * that.Scale;
            var newHeight = (that.height - that.offsetY) * that.Scale;

            //if trying to zoom out too far, reset to min
            if (newWidth < that.width || that.Scale == 1) {
                that.currentOffsetX = that.offsetX;
                that.currentOffsetY = that.offsetY;
                that.currentWidth = that.width;
                that.currentHeight = that.height;
                that.Scale = 1;
                // Reset the slider to zero 
                that.dontZoom = true;
                $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 0);
            }
            else {
                //adjust position to base scale - then scale out to new scale
                var scaledPositionX = ((evt.x - that.currentOffsetX) / oldScale) * that.Scale;
                var scaledPositionY = ((evt.y - that.currentOffsetY) / oldScale) * that.Scale;

                //Move the scaled position to the mouse location
                that.currentOffsetX = evt.x - scaledPositionX;
                that.currentOffsetY = evt.y - scaledPositionY;
                that.currentWidth = newWidth;
                that.currentHeight = newHeight;
            }


            var filter = that.prevFilter == null ? that.filter : that.prevFilter;
            var rowscols = that.GetRowsAndColumns(that.currentWidth - that.offsetX, that.currentHeight - that.offsetY, that.maxRatio, filter.length);
            that.SetVisibleTilePositions(rowscols, filter, that.currentOffsetX, that.currentOffsetY, true, true, zoomTime);

            //deselect tiles if zooming back to min size
            if (that.Scale == 1 && oldScale != 1) {
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
            // Zoom using the slider event
            $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 0);
            
            var filter = this.prevFilter == null ? this.filter : this.prevFilter;
            var rowscols = this.GetRowsAndColumns(this.currentWidth - this.offsetX, this.currentHeight - this.offsetY, this.maxRatio, filter.length);
            for (var i = 0; i < this.tiles.length; i++) {
                this.tiles[i].origwidth = rowscols.TileHeight / TileController._imageController.GetRatio(this.tiles[i].facetItem.Img);
                this.tiles[i].origheight = rowscols.TileHeight;
            }
            this.SetVisibleTilePositions(rowscols, filter, this.currentOffsetX, this.currentOffsetY, true, false, 1000);
            pt1Timeout = 1000;
        }

        this.prevFilter = null;

        setTimeout(function () {
            for (var i = 0, j = 0; i < that.tiles.length; i++) {
                //setup tiles
                
                that.tiles[i]._locations[0].startx = that.tiles[i]._locations[0].x;
                that.tiles[i]._locations[0].starty = that.tiles[i]._locations[0].y;
                that.tiles[i].startwidth = that.tiles[i].width;
                that.tiles[i].startheight = that.tiles[i].height;

                if (that.tiles[i].visible) continue;
                that.tiles[i].start = PivotViewer.Utils.Now();
                that.tiles[i].end = that.tiles[i].start + 1000;
                var theta = Math.atan2(that.tiles[i]._locations[0].y - (that.currentHeight / 2), that.tiles[i]._locations[0].x - (that.currentWidth / 2))
                that.tiles[i]._locations[0].destinationx = that.currentWidth * Math.cos(theta) + (that.currentWidth / 2);
                that.tiles[i]._locations[0].destinationy = that.currentHeight * Math.sin(theta) + (that.currentHeight / 2);
            }

            // recalculate max width of images in filter
            that.maxRatio = TileController._imageController.GetRatio(that.tiles[0].facetItem.Img);
            for (var i = 0; i < that.filter.length; i++) {
                var item = that.filter[i].facetItem;
                var ratio = TileController._imageController.GetRatio(item.Img);
                if (ratio < that.maxRatio) that.maxRatio = ratio;
            }

            var pt2Timeout = that.filter.length == that.tiles.length ? 0 : 500;
            //Delay pt2 animation
            setTimeout(function () {
                var rowscols = that.GetRowsAndColumns(that.width - that.offsetX, that.height - that.offsetY, that.maxRatio, that.filter.length);
                for (var i = 0; i < that.tiles.length; i++) {
                    that.tiles[i].origwidth = rowscols.TileHeight / TileController._imageController.GetRatio(that.tiles[i].facetItem.Img);
                    that.tiles[i].origheight = rowscols.TileHeight;
                }
                that.SetVisibleTilePositions(rowscols, that.filter, that.offsetX, that.offsetY, false, false, 1000);
            }, pt2Timeout);

        }, pt1Timeout);
    },
    Filter: function (tiles, filter) {
        this.tiles = tiles;
        this.prevFilter = this.filter;
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
            if (initTiles) {
                //setup tile initial positions
                tiles[i]._locations[0].startx = tiles[i]._locations[0].x;
                tiles[i]._locations[0].starty = tiles[i]._locations[0].y;
                tiles[i].startwidth = tiles[i].width;
                tiles[i].startheight = tiles[i].height;
            }

            //set destination positions
            tiles[i].destinationwidth = rowscols.TileMaxWidth;
            tiles[i].destinationheight = rowscols.TileHeight;
            tiles[i]._locations[0].destinationx = (currentColumn * rowscols.TileMaxWidth) + offsetX;
            tiles[i]._locations[0].destinationy = (currentRow * rowscols.TileHeight) + offsetY;
            tiles[i].start = PivotViewer.Utils.Now();
            tiles[i].end = tiles[i].start + milliseconds;
            if (currentColumn == columns - 1) {
                currentColumn = 0;
                currentRow++;
            }
            else currentColumn++;
        }
    },
    GetSelectedCol: function (tile) {
        selectedCol = Math.round((tile._locations[0].x - this.currentOffsetX) / tile.width); 
        return selectedCol;
    },
    GetSelectedRow: function (tile) {
        selectedRow = Math.round((tile._locations[0].y - this.currentOffsetY) / tile.height);
        return selectedRow;
    },
    CenterOnSelectedTile: function (selectedCol, selectedRow) {
        var rowscols = this.GetRowsAndColumns(this.currentWidth - this.offsetX, this.currentHeight - this.offsetY, this.maxRatio, this.filter.length);

        this.currentOffsetX = ((rowscols.TileMaxWidth * selectedCol) * -1) + (this.width / 2) - (rowscols.TileMaxWidth / 2);
        this.currentOffsetY = ((rowscols.TileHeight * selectedRow) * -1) + (this.height / 2) - (rowscols.TileHeight / 2);
        this.SetVisibleTilePositions(rowscols, this.filter, this.currentOffsetX, this.currentOffsetY, true, true, 1000);
    },
    handleSelection: function (selectedTile) {
        var selectedCol = 0;
        var selectedRow = 0;
        var offsetX = 0, offsetY = 0;
 
        //First get the row and column of the selected tile
        if (selectedTile != null) {
            //determine row and column that tile is in in relation to the first tile
            selectedCol = Math.round((selectedTile._locations[0].x - this.currentOffsetX) / selectedTile.width);
            selectedRow = Math.round((selectedTile._locations[0].y - this.currentOffsetY) / selectedTile.height);
        }

        if (this.selected != selectedTile) {
            if (this.selected == null){
                var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
                if (value != 0) $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 0);
            }
        }

        if (selectedTile != null) {
            selectedTile.Selected(true);
            tileHeight = selectedTile.height;
            tileWidth = selectedTile.height / TileController._imageController.GetRatio(selectedTile.facetItem.Img);
            tileOrigHeight = selectedTile.origheight;
            tileOrigWidth = selectedTile.origwidth;
            canvasHeight = selectedTile.context.canvas.height
            canvasWidth = selectedTile.context.canvas.width - ($('.pv-filterpanel').width() + $('.pv-infopanel').width());
        }

        //zoom in on selected tile
        if (this.selected != selectedTile) {
            // Find which is proportionally bigger, height or width
            if (tileHeight / canvasHeight > tileWidth/canvasWidth) 
                origProportion = tileOrigHeight / canvasHeight;
            else origProportion = tileOrigWidth / canvasWidth;

            // Zoom using the slider event
            if (this.selected == null) $('.pv-toolbarpanel-zoomslider').slider('option', 'value', Math.round((0.75 / origProportion) * 2));
            this.selected = selectedTile;
            this.CenterOnSelectedTile(selectedCol, selectedRow);
        }
        else {
            this.selected = selectedTile = null;
            //zoom out
            this.currentOffsetX = this.offsetX;
            this.currentOffsetY = this.offsetY;
            // Zoom using the slider event
            $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 0);
        }

        $.publish("/PivotViewer/Views/Item/Selected", [{item: selectedTile, bkt: 0}]);
    }
});
