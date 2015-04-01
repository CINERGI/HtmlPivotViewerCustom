//
//  HTML5 PivotViewer
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
/// Graph (histogram) View
///
PivotViewer.Views.BucketView = PivotViewer.Views.TileBasedView.subClass({
    init: function (collection) {
        this._super();
        var that = this;
        this.buckets = [];
        this.Scale = 1;
        this.canvasHeightUIAdjusted = 0;
        this.titleSpace = 62;
        this.dontZoom = false;
        this.collection = collection;

        //Event Handlers
        $.subscribe("/PivotViewer/Views/Canvas/Click", function (evt) {
            if (!that.isActive) return;

            var selectedTile = null;
            var selectedLoc = null;
            for (var i = 0; i < that.tiles.length; i++) {
	            var loc = that.tiles[i].Contains(evt.x, evt.y);
                if (loc >= 0) {
                    selectedTile = that.tiles[i];
                    selectedLoc = loc;
                }
                else that.tiles[i].Selected(false);
            }
	        that.handleSelection (selectedTile, evt.x, selectedLoc);
	    });

        $.subscribe("/PivotViewer/Views/Canvas/Hover", function (evt) {
            if (!that.isActive) return;
            $('.pv-viewarea-bucketview-overlay-bucket').removeClass('bucketview-bucket-hover');
            //determine bucket and select
            var bucketNumber = Math.floor((evt.x - that.offsetX) / that.columnWidth);
            var bucketDiv = $('#pv-viewarea-bucketview-overlay-bucket-' + bucketNumber);
            bucketDiv.addClass('bucketview-bucket-hover');
            //determine tile
            for (var i = 0; i < that.tiles.length; i++) {
	            var loc = that.tiles[i].Contains(evt.x, evt.y);
                if (loc >= 0) {
                    that.tiles[i].Selected(true);
                    that.tiles[i].selectedLoc = loc;
                }
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
            var newHeight = that.height * that.Scale;

            //if trying to zoom out too far, reset to min
            if (newWidth < that.width || that.Scale == 1) {
                that.currentOffsetX = that.offsetX;
                that.currentOffsetY = that.offsetY;
                that.currentWidth = that.width;
                that.currentHeight = that.height;
                that.canvasHeightUIAdjusted = that.height - that.offsetY - that.titleSpace;
                that.columnWidth = (that.width - that.offsetX) / that.buckets.length;
                that.Scale = 1;
                $('.pv-viewarea-bucketview-overlay div').fadeIn('slow');
                // Reset the slider to zero 
                that.dontZoom = true;
                $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 0);
            }
            else {
                //adjust position to base scale - then scale out to new scale
                //Move the scaled position to the mouse location
                that.currentOffsetX = evt.x - (((evt.x - that.currentOffsetX) / oldScale) * that.Scale);

                //Work out the scaled position of evt.y and then calc the difference between the actual evt.y
                var scaledPositionY = ((evt.y - that.currentOffsetY) / oldScale) * that.Scale;
                that.currentOffsetY = evt.y - scaledPositionY;
                that.canvasHeightUIAdjusted = newHeight - (((that.offsetY + that.titleSpace)/oldScale) * that.Scale);

                that.currentWidth = newWidth;
                that.currentHeight = newHeight;
                that.columnWidth = newWidth / that.buckets.length;
                $('.pv-viewarea-bucketview-overlay div').fadeOut('slow');
            }

            
            that.rowscols = that.GetRowsAndColumns(that.columnWidth - 2, that.canvasHeightUIAdjusted, that.maxRatio, that.bigCount);
            if (that.rowscols.TileHeight < 10 ) that.rowscols.TileHeight = 10;
            that.SetVisibleTileGraphPositions(that.rowscols, that.currentOffsetX, that.currentOffsetY, true, true);

            //deselect tiles if zooming back to min size
            if (that.Scale == 1 && oldScale != 1) {
                for (var i = 0; i < that.tiles.length; i++) {
                    that.tiles[i].Selected(false);
                    that.tiles[i].selectedLoc = 0;
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
            if (dragY > 0 && (that.currentOffsetY + that.canvasHeightUIAdjusted) > that.currentHeight + that.offsetY) {
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
        this.rowscols = null;
        this.bigCount = 0;
    },
    Filter: function (tiles, filter, sortFacet) {
        this.sortFacet = sortFacet;
        this.tiles = tiles;
        this.filter = filter;
        this.buckets = this.Bucketize(tiles, filter, this.sortFacet);
        this.filtered = false;
    },
    Activate: function () {
        var that = this;
        if (!Modernizr.canvas) return;

        this._super();

        if (this.filtered) this.Filter(this.filterEvt.tiles, this.filterEvt.filter, this.filterEvt.sort);

        this.columnWidth = (this.width - this.offsetX) / this.buckets.length;
        this.canvasHeightUIAdjusted = this.height - this.offsetY - this.titleSpace;

        //Find biggest bucket to determine tile size, rows and cols
        //Also create UI elements
        var uiElements = [];
        this.bigCount = 0;
        for (var i = 0; i < this.buckets.length; i++) {
            var styleClass = i % 2 == 0 ? "bucketview-bucket-dark" : "bucketview-bucket-light", label;
            if (this.buckets[i].startRange == this.buckets[i].endRange || this.buckets[i].startLabel == this.buckets[i].endLabel) label = this.buckets[i].startLabel;
            else label = this.buckets[i].startLabel + "<br>to<br>" + this.buckets[i].endLabel;
            uiElements[i] = "<div class='pv-viewarea-bucketview-overlay-bucket " + styleClass + "' id='pv-viewarea-bucketview-overlay-bucket-" + i + "' style='width: " +
                (Math.floor(this.columnWidth) - 4) + "px; height:" + (this.height - 2) + "px; left:" + ((i * this.columnWidth) - 2) + "px;'>";
            uiElements[i] += "<div class='pv-viewarea-bucketview-overlay-buckettitle' style='top: " + (this.canvasHeightUIAdjusted + 4) + "px;'><div class='pv-bucket-countbox'>" + this.buckets[i].tiles.length + "</div>" + label + "</div></div>";
            if (this.bigCount < this.buckets[i].tiles.length) this.bigCount = this.buckets[i].tiles.length;
        }

        //remove previous elements
        var bucketviewOverlay = $('.pv-viewarea-bucketview-overlay');
        bucketviewOverlay.css('left', this.offsetX + 'px');
        $('.pv-viewarea-bucketview-overlay div').fadeOut('slow', function () { $(this).remove(); });
        bucketviewOverlay.append(uiElements.join(''));
        $('.pv-viewarea-bucketview-overlay div').fadeIn('slow');

        for (var i = 0; i < this.tiles.length; i++) {
            //setup tiles
            this.tiles[i]._locations[0].startx = this.tiles[i]._locations[0].x;
            this.tiles[i]._locations[0].starty = this.tiles[i]._locations[0].y;
            this.tiles[i].startwidth = this.tiles[i].width;
            this.tiles[i].startheight = this.tiles[i].height;

            if (this.tiles[i].visible) continue;
            this.tiles[i].start = PivotViewer.Utils.Now();
            this.tiles[i].end = this.tiles[i].start + 1000;
            var theta = Math.atan2(this.tiles[i]._locations[0].y - (this.currentHeight / 2), this.tiles[i]._locations[0].x - (this.currentWidth / 2))
            this.tiles[i]._locations[0].destinationx = this.currentWidth * Math.cos(theta) + (this.currentWidth / 2);
            this.tiles[i]._locations[0].destinationy = this.currentHeight * Math.sin(theta) + (this.currentHeight / 2);
        }

        // recalculate max width of images in filter
        this.maxRatio = TileController._imageController.GetRatio(this.tiles[0].facetItem.Img);
        for (var i = 0; i < this.filter.length; i++) {
            var item = this.filter[i].facetItem;
            var ratio = TileController._imageController.GetRatio(item.Img);
            if (ratio < this.maxRatio) this.maxRatio = ratio;
        }
        
        var pt2Timeout = this.filter.length == this.tiles.length ? 0 : 500;
        //Delay pt2 animation
        setTimeout(function () {
            // Clear selection
            var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
            if (value > 0) { 
                this.selected = selectedTile = null;
                //zoom out
                this.currentOffsetX = this.offsetX;
                this.currentOffsetY = this.offsetY;
                // Zoom using the slider event
                $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 0);
            }
            that.rowscols = that.GetRowsAndColumns(that.columnWidth - 2, that.canvasHeightUIAdjusted - that.offsetY, that.maxRatio, that.bigCount);
            if (that.rowscols.TileHeight < 10 ) that.rowscols.TileHeight = 10;
            var controller = TileController._imageController
            for (var i = 0; i < that.tiles.length; i++) {
                that.tiles[i].origwidth = that.rowscols.TileHeight / controller.GetRatio(that.tiles[i].facetItem.Img);
                that.tiles[i].origheight = that.rowscols.TileHeight;
                that.tiles[i].destinationwidth = 1;
                that.tiles[i].destinationheight = 1;
            }
            that.SetVisibleTileGraphPositions(that.rowscols, that.offsetX, that.offsetY, false, false);

        }, pt2Timeout);
    },
    Deactivate: function () {
        this._super();
        $('.pv-viewarea-bucketview-overlay div').fadeOut();
    },
    GetUI: function() {
        if (Modernizr.canvas) return "<div class='pv-viewarea-bucketview-overlay'></div>";
        else return this._super();
    },
    GetButtonImage: function () {return 'images/bucketview.png';},
    GetButtonImageSelected: function () {return 'images/bucketviewSelected.png';},
    GetViewName: function () {return 'Bucket View';},
    /// Sets the tiles position based on the GetRowsAndColumns layout function
    SetVisibleTileGraphPositions: function (rowscols, offsetX, offsetY, initTiles, keepColsRows) {
        var columns = (keepColsRows && this.rowscols)  ? this.rowscols.Columns : rowscols.Columns;
        if (!keepColsRows) this.rowscols = rowscols;

        var startx = [];
        var starty = [];

        // Clear all tile locations greater than 1
        for (var l = 0; l < this.tiles.length; l++) {
            this.tiles[l].firstFilterItemDone = false;
            this.tiles[l]._locations = [this.tiles[l]._locations[0]];   
        }

        for (var b = 0; b < this.buckets.length; b++) {
            var bucket = this.buckets[b], currentColumn = 0, currentRow = 0;
        
            for (var i = 0; i < bucket.tiles.length; i++) {

                var tile = bucket.tiles[i];

                if (!tile.firstFilterItemDone) {
                    if (initTiles) {
                        tile._locations[0].startx = tile._locations[0].x;
                        tile._locations[0].starty = tile._locations[0].y;
                        tile.startwidth = tile.width;
                        tile.startheight = tile.height;
                    }
                   
                    tile.destinationwidth = rowscols.TileMaxWidth;
                    tile.destinationheight = rowscols.TileHeight;
                    tile._locations[0].destinationx = (b * this.columnWidth) + (currentColumn * rowscols.TileMaxWidth) + offsetX;
                    tile._locations[0].destinationy = this.canvasHeightUIAdjusted - rowscols.TileHeight - (currentRow * rowscols.TileHeight) + offsetY;
                    tile.start = PivotViewer.Utils.Now();
                    tile.end = tile.start + 1000;
                    tile.firstFilterItemDone = true;
                }
                else {
                    tileLocation = new PivotViewer.Views.TileLocation();
                    tileLocation.startx = tile._locations[0].startx;
                    tileLocation.starty = tile._locations[0].starty;
                    tileLocation.x = tile._locations[0].x;
                    tileLocation.y = tile._locations[0].y;
                    tileLocation.destinationx = (b * this.columnWidth) + (currentColumn * rowscols.TileMaxWidth) + offsetX;
                    tileLocation.destinationy = this.canvasHeightUIAdjusted - rowscols.TileHeight - (currentRow * rowscols.TileHeight) + offsetY;
                    tile._locations.push(tileLocation);
                }
                if (currentColumn == columns - 1) {
                    currentColumn = 0;
                    currentRow++;
                }
                else currentColumn++;
            }
        }
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
                        var date = new Date(value).Value;
                        return GetMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + GetStandardHour(date) + " " + GetMeridian(date);
                    });
            else if (max.getMinutes() > min.getMinutes())
                return GetBuckets(filterList, orderBy, function (value) { return new Date(value.Value).getMinutes(); },
                    function (value) {
                        var date = new Date(value.Value);
                        return GetMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + GetStandardHour(date) + ":" + GetStandardMinutes(date) + " " + GetMeridian(date);
                    });
            else return GetBuckets(filterList, orderBy, function (value) { return new Date(value.Value).getSeconds(); },
                function (value) {
                    var date = new Date(value.Value);
                    return GetMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + GetStandardHour(date) + ":" + GetStandardMinutes(date) + "::" + GetStandardSeconds(date) + " " + GetMeridian(date);
                });
        }
        else if (category.Type == PivotViewer.Models.FacetType.Number) {
            var bkts = [];
            //Total range is proportional to the next highest power of ten.
            var delta = max - min, bucketSize;
            if (delta == 0) bucketSize = 1;
            else {
                bucketSize = Math.pow(10, Math.ceil(Math.log(delta) / Math.log(10)) - 1);
                if (delta <= (bucketSize * 5)) bucketSize = bucketSize / 2;
            }
            var base = Math.floor(min / bucketSize) * bucketSize, numBuckets = Math.floor((max - base) / bucketSize) + 1;

            for (var i = 0; i < numBuckets; i++) {
                var start = i * bucketSize + base;
                var end = start + bucketSize;
                bkts[i] = { startRange: start, endRange: start, tiles: [], values: [], startLabel: start.toString(), endLabel: end.toString() };
            }   
            var i = 0;
            for (; i < filterList.length; i++) {
                var facet = filterList[i].facetItem.FacetByName[orderBy];
                if (facet == undefined) break;
                filterList[i].buckets = [];
                for (var j = 0; j < facet.FacetValues.length; j++) {
                    var value = facet.FacetValues[j].Value;
                    var bkt = bkts[Math.floor((value - base) / bucketSize)];
                    bkt.tiles.push(filterList[i]);
                    if (bkt.values[bkt.values.length - 1] != value) {
                        bkt.endRange = value;
                        bkt.values.push(value);
                    }
                }
            }
            if (i != filterList.length) {
                bkts.push({ startRange: "(no info)", endRange: "(no info)", tiles: [], values: ["(no info)"], startLabel: "(no info)", endLabel: "(no info)" });
                for (; i < filterList.length; i++) {
                    var bkt = bkts[bkts.length - 1];
                    bkt.tiles.push(filterList[i]);
                    filterList[i].buckets = [bkts.length - 1];
                }
            }
            return bkts;
        }
        else return GetBuckets(filterList, orderBy);
        //Got rid of multiple values for now
    },
    GetSelectedCol: function (tile) {
        var selectedLoc = tile.selectedLoc;
        //Need to account for padding in each column...
        var padding = this.rowscols.PaddingX;
        var colsInBar = this.rowscols.Columns;
        var tileMaxWidth = this.rowscols.TileMaxWidth;
        var selectedBar = Math.floor((tile._locations[selectedLoc].x - this.currentOffsetX) / ((tileMaxWidth * colsInBar) + padding));
        var selectedColInBar = Math.round(((tile._locations[selectedLoc].x - this.currentOffsetX) - (selectedBar * (colsInBar * tileMaxWidth + padding))) / tileMaxWidth);
        return (selectedBar * colsInBar) + selectedColInBar;
    },
    GetSelectedRow: function (tile) {
        var selectedLoc = tile.selectedLoc;
        return Math.round((this.canvasHeightUIAdjusted - (tile._locations[selectedLoc].y - this.currentOffsetY)) / tile.height);
    },
    CenterOnSelectedTile: function (selectedCol, selectedRow) {
        this.rowscols = this.GetRowsAndColumns(this.columnWidth - 2, this.canvasHeightUIAdjusted, this.maxRatio, this.bigCount);
        if (this.rowscols.TileHeight < 10 ) this.rowscols.TileHeight = 10;
        var bucket = Math.floor(selectedCol/ this.rowscols.Columns);
        var padding = this.rowscols.PaddingX * bucket;
        this.currentOffsetX = ((this.rowscols.TileMaxWidth * selectedCol) * -1) + (this.width / 2) - (this.rowscols.TileMaxWidth / 2) - padding;
        this.currentOffsetY = - this.rowscols.TileHeight * ((this.rowscols.Rows / 2) - (selectedRow + 1)) - ( this.canvasHeightUIAdjusted / 2 ) - (this.rowscols.TileHeight / 2);
        this.SetVisibleTileGraphPositions(this.rowscols, this.currentOffsetX, this.currentOffsetY, true, true);
    },
    handleSelection: function (selectedTile, clickX, selectedLoc) {
        var selectedCol = 0;
        var selectedRow = 0;
        var selectedBar = 0;
        var found = false;
        var dontFilter = false;
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
            selectedTile.selectedLoc = selectedLoc;
            found = true;
        }

        // If an item is selected then zoom out but don't set the filter
        // based on clicking in a bar in the graph.
        if (this.selected != null && !found) dontFilter = true;

        //zoom in on selected tile
        if (selectedTile != null && this.selected != selectedTile) {
            //Used for scaling and centering 
            //Need to account for padding in each column...
            var padding = this.rowscols.PaddingX;
            var colsInBar = this.rowscols.Columns;
            var tileMaxWidth = this.rowscols.TileMaxWidth;
            selectedBar = Math.floor((selectedTile._locations[selectedLoc].x - this.currentOffsetX) / ((selectedTile.width * colsInBar) + padding));
            var selectedColInBar = Math.round(((selectedTile._locations[selectedLoc].x - this.currentOffsetX) - (selectedBar * (colsInBar * tileMaxWidth + padding))) / tileMaxWidth);
            selectedCol = (selectedBar * colsInBar) + selectedColInBar;
            selectedRow = Math.round((this.canvasHeightUIAdjusted - (selectedTile._locations[selectedLoc].y - this.currentOffsetY)) / selectedTile.height);
            var tileHeight = selectedTile.height;
            var tileWidth = selectedTile.height / TileController._imageController.GetRatio(selectedTile.facetItem.Img);
            var tileOrigHeight = selectedTile.origheight;
            var tileOrigWidth = selectedTile.origwidth;
            var canvasHeight = selectedTile.context.canvas.height
            var canvasWidth = selectedTile.context.canvas.width - ($('.pv-filterpanel').width() + $('.pv-infopanel').width());

            // Find which is proportionally bigger, height or width
            var origProportion;
            if (tileHeight / canvasHeight > tileWidth / canvasWidth) origProportion = tileOrigHeight / canvasHeight;
            else origProportion = tileOrigWidth / canvasWidth;

            // Zoom using the slider event
            if (this.selected == null) $('.pv-toolbarpanel-zoomslider').slider('option', 'value', Math.round((0.75 / origProportion) * 2));
            this.selected = selectedTile;
            this.CenterOnSelectedTile(selectedCol, selectedRow);

            $('.pv-viewarea-bucketview-overlay div').fadeOut('slow');
        }
        else {
            this.selected = selectedTile = null;
            //zoom out
            this.currentOffsetX = this.offsetX;
            this.currentOffsetY = this.offsetY;
            $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 0);
            $('.pv-viewarea-bucketview-overlay div').fadeIn('slow');
        }
        $.publish("/PivotViewer/Views/Item/Selected", [{item: selectedTile, bkt: selectedBar}]);

        if (!found && !dontFilter) {
            var bucketNumber = Math.floor((clickX - this.offsetX) / this.columnWidth);
            $.publish("/PivotViewer/Views/Item/Filtered", [{ Facet: this.sortFacet, Item: this.buckets[bucketNumber].startRange, MaxRange: this.buckets[bucketNumber].endRange, Values: this.buckets[bucketNumber].values, ClearFacetFilters:true}]);
        }
    }
});
