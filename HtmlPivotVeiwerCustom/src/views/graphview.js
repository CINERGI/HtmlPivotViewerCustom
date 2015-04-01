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
PivotViewer.Views.GraphView = PivotViewer.Views.TileBasedView.subClass({
    init: function (collection) {
        this.collection = collection;
        this.Scale = 1;
        this._super();
        this.dontZoom = false;
        this.tileHeight = 0;
        var that = this;


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
            else if (evt.delta != undefined) that.Scale = evt.delta == 0 ? 1 : (that.Scale + evt.delta - 1);

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

            that.SetVisibleTilePositions(that.filter, that.currentOffsetX, that.currentOffsetY, true, zoomTime);

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
        if (!Modernizr.canvas) return;
        this._super();
        var that = this;

        if (this.filtered) this.Filter(this.filterEvt.tiles, this.filterEvt.filter, this.filterEvt.sort, this.filterEvt.stringFacets);

        // Clear all the multiple images that are used in the graph view
        for (var l = 0; l < this.tiles.length; l++) {
            while (this.tiles[l]._locations.length > 1)
                this.tiles[l]._locations.pop();
        }
        // Ensure any selected location is zero
        for (var i = 0; i < this.tiles.length; i++) {
            this.tiles[i].selectedLoc = 0;
        }

        //TODO: Create numeric drop-down boxes.
        //TODO: Clear axes.

        var pt1Timeout = 0;
        //zoom out first
        Debug.Log("this.currentWidth: " + this.currentWidth + " this.width: " + this.width);
        var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
        if (value > 0) {
            this.selected = selectedItem = "";
            //zoom out
            this.currentOffsetX = this.offsetX;
            this.currentOffsetY = this.offsetY;
            // Zoom using the slider event
            $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 1);
            var clearFilter = []; 
            for (var i = 0; i < this.tiles.length; i++) {
                this.tiles[i].origwidth = this.TileHeight / TileController._imageController.GetRatio(this.tiles[i].facetItem.Img);
                this.tiles[i].origheight = this.TileHeight;
                clearFilter.push(this.tiles[i].facetItem.Id);
            }
            this.SetVisibleTilePositions(clearFilter, this.currentOffsetX, this.currentOffsetY, true, 1000);
            pt1Timeout = 1000;
        }

        setTimeout(function () {
            for (var i = 0, j = 0; i < that.tiles.length; i++) {
                //setup tiles
                that.tiles[i]._locations[0].startx = that.tiles[i]._locations[0].x;
                that.tiles[i]._locations[0].starty = that.tiles[i]._locations[0].y;
                that.tiles[i].startwidth = that.tiles[i].width;
                that.tiles[i].startheight = that.tiles[i].height;

                //set outer location for all tiles not in the filter
                if (!that.tiles[i].visible) {
                    that.SetOuterTileDestination(that.width, that.height, that.tiles[i]);
                    that.tiles[i].start = PivotViewer.Utils.Now();
                    that.tiles[i].end = that.tiles[i].start + 1000;
                }
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
                for (var i = 0; i < that.tiles.length; i++) {
                    that.tiles[i].origwidth = that.tileHeight / TileController._imageController.GetRatio(that.tiles[i].facetItem.Img);
                    that.tiles[i].origheight = that.TileHeight;
                }
                that.SetVisibleTilePositions(that.filter, that.offsetX, that.offsetY, false, 1000);
            }, pt2Timeout);

        }, pt1Timeout);

        //TODO: Draw axes.
    },
    Filter: function (tiles, filter, sortFacet, stringFacets) {
        this.sortFacet = sortFacet;
        this.tiles = tiles;
        this.filter = filter;
        this.filtered = false;
    },
    //TODO: Select Suitable Images
    GetButtonImage: function () {return 'images/bucketview.png';},
    GetButtonImageSelected: function () {return 'images/bucketviewselected.png';},
    GetViewName: function () {return 'Graph View';},
    /// Sets the tiles position based on the GetRowsAndColumns layout function
    SetVisibleTilePositions: function (filter, offsetX, offsetY, initTiles, milliseconds) {

        for (var i = 0; i < this.filter.length; i++) {
            if (initTiles) {
                //setup tile initial positions
                this.filter[i]._locations[0].startx = this.filter[i]._locations[0].x;
                this.filter[i]._locations[0].starty = this.filter[i]._locations[0].y;
                this.filter[i].startwidth = this.filter[i].width;
                this.filter[i].startheight = this.filter[i].height;
            }

            //set destination positions
            //TODO: Initialize the tile destination based on position in graph.

            //this.filter[i].destinationwidth = ?;
            //this.filter[i].destinationheight = this.TileHeight; //Scale of the images. TileHeight needs to be initialized elsewhere
            //this.filter[i]._locations[0].destinationx = ?;
            //this.filter[i]._locations[0].destinationy = ?;
            this.filter[i].start = PivotViewer.Utils.Now();
            this.filter[i].end = this.filter[i].start + milliseconds;
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
    CenterOnSelectedTile: function (tile) {
        //TODO: Initialize currentOffsetX and Y to the corner of a relatively small viewing box around the selected tile.
        this.SetVisibleTilePositions(this.filter, this.currentOffsetX, this.currentOffsetY, true, 1000);
    },
    handleSelection: function (selectedTile) {
        var offsetX = 0, offsetY = 0;
 
        //Reset slider to zero before zooming ( do this before sorting the tile selection
        //because zooming to zero unselects everything...)
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
            if (tileHeight / canvasHeight > tileWidth/canvasWidth) origProportion = tileOrigHeight / canvasHeight;
            else origProportion = tileOrigWidth / canvasWidth;

            // Zoom using the slider event
            if (this.selected == null) $('.pv-toolbarpanel-zoomslider').slider('option', 'value', Math.round((0.75 / origProportion) * 2));

            this.selected = selectedTile;
            this.CenterOnSelectedTile(selectedTile);
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
