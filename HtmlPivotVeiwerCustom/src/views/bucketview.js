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
/// Bucket View
///
PivotViewer.Views.BucketView = PivotViewer.Views.TileBasedView.subClass({
    init: function () {
        this._super();
        var that = this;
        this.buckets = [];
        this.scale = 1;
        this.canvasHeightUIAdjusted = 0;
        this.titleSpace = 62;
        this.dontZoom = false;

        $.subscribe("/PivotViewer/Views/Canvas/Click", function (evt) {
            if (!that.isActive) return;

            var tile = null;
            var selectedLoc = null;
            for (var i = 0; i < that.filter.length; i++) {
	            var loc = that.filter[i].Contains(evt.x, evt.y);
                if (loc >= 0) {
                    tile = that.filter[i];
                    selectedLoc = loc;
                }
                else that.filter[i].Selected(false);
            }
	        that.handleSelection(tile, evt.x, evt.y, selectedLoc);
	    });

        $.subscribe("/PivotViewer/Views/Canvas/Hover", function (evt) {
            if (!that.isActive) return;
            $('.pv-bucketview-overlay-bucket').removeClass('bucketview-bucket-hover');
            //determine bucket and select
            var bucketNumber = that.GetBucket(evt.x), bucket = that.buckets[bucketNumber];
            if (bucketNumber < 0) return;
            var bucketDiv = $('#pv-bucketview-overlay-bucket-' + bucketNumber);
            bucketDiv.addClass('bucketview-bucket-hover');
            //determine tile
            for (var i = 0; i < bucket.tiles.length; i++) {
	            var loc = bucket.tiles[i].Contains(evt.x, evt.y);
                if (loc >= 0) {
                    bucket.tiles[i].Selected(true);
                    bucket.tiles[i].selectedLoc = loc;
                }
                else bucket.tiles[i].Selected(false);
            }
        });

        $.subscribe("/PivotViewer/Views/Canvas/Zoom", function (evt) {
            if (!that.isActive) return;

            if (that.dontZoom) {
                that.dontZoom = false;
                return;
            }
            var oldScale = that.scale;
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
            if (newWidth < that.width || that.scale <= 1) {
                that.currentOffsetX = that.offsetX;
                that.currentOffsetY = that.offsetY;
                that.currentWidth = that.width;
                that.currentHeight = that.height;
                that.canvasHeightUIAdjusted = that.height - that.offsetY - that.titleSpace;
                that.columnWidth = that.origColumnWidth;
                that.scale = 1;
                $('.pv-bucketview-overlay div').fadeIn('slow');
                // Reset the slider to zero 
                that.dontZoom = true;
                $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 0);
                that.RecalibrateUISettings();
            }
            else {
                var newHeight = that.height * that.scale;
                that.currentOffsetX = evt.x - (evt.x - that.currentOffsetX) / oldScale * that.scale;
                that.currentOffsetY = evt.y - (evt.y - that.currentOffsetY) / oldScale * that.scale;
                that.canvasHeightUIAdjusted = newHeight - ((that.offsetY + that.titleSpace) / oldScale * that.scale);

                that.currentWidth = newWidth;
                that.currentHeight = newHeight;
                that.columnWidth = that.origColumnWidth * that.scale;
                //that.columnWidth = newWidth / that.buckets.length
                $('.pv-bucketview-overlay div').fadeOut('slow');
                //that.RecalibrateUISettings();
                that.ResetUISettings();
            }

            that.SetVisibleTileGraphPositions(that.rowscols, that.currentOffsetX, that.currentOffsetY, true, true);

            //deselect tiles if zooming back to min size
            if (that.scale == 1 && oldScale != 1) {
                for (var i = 0; i < that.tiles.length; i++) {
                    that.tiles[i].Selected(false);
                    that.tiles[i].selectedLoc = 0;
                }
                that.selected = null;
                $.publish("/PivotViewer/Views/Item/Selected", [{item: that.selected}]);
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
    GetBucket: function(x) {return Math.floor((x - this.offsetX) / this.columnWidth)},
    RecalibrateUISettings: function () { this.rowscols = this.GetTileDimensions(this.columnWidth - 2, this.canvasHeightUIAdjusted - this.offsetY, this.maxRatio, this.bigCount, this.rowscols); },
    ResetUISettings: function () { this.rowscols = this.GetRowsAndColumns(this.columnWidth - 2, this.canvasHeightUIAdjusted - this.offsetY, this.maxRatio, this.bigCount); },
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
        this.buckets = this.Bucketize(filter, this.sortFacet);
        this.filtered = false;
    },
    Activate: function () {
        var that = this;
        if (!Modernizr.canvas) return;
        this._super();
        if (this.filtered) this.Filter(this.filterEvt.tiles, this.filterEvt.filter, this.filterEvt.sort);
        this.CreateUI();

    },
    CreateUI: function () {
        this.columnWidth = this.origColumnWidth = (this.width - this.offsetX) / this.buckets.length;
        this.canvasHeightUIAdjusted = this.height - this.offsetY - this.titleSpace;

        //Find biggest bucket to determine tile size, rows and cols
        //Also create UI elements
        var uiElements = [];
        this.bigCount = 0;
        for (var i = 0; i < this.buckets.length; i++) {
            var bkt = this.buckets[i];
            var styleClass = i % 2 == 0 ? "bucketview-bucket-dark" : "bucketview-bucket-light", label;
            var label = bkt.startRange == bkt.endRange || bkt.startLabel == bkt.endLabel ? bkt.startLabel : bkt.startLabel + "<br>to<br>" + bkt.endLabel;
            uiElements[i] = "<div class='pv-bucketview-overlay-bucket " + styleClass + "' id='pv-bucketview-overlay-bucket-" + i + "' style='width: " +
                (Math.floor(this.columnWidth) - 4) + "px; height:" + (this.height - 2) + "px; left:" + ((i * this.columnWidth) - 2) + "px;'>";
            uiElements[i] += "<div class='pv-bucketview-overlay-buckettitle' style='top: " + (this.canvasHeightUIAdjusted + 4) + "px;'><div class='pv-bucket-countbox'>" +
                this.buckets[i].tiles.length + "<br>" + Math.round(this.buckets[i].tiles.length / this.filter.length * 100) + "%</div>" + label + "</div></div>";
            if (this.bigCount < bkt.tiles.length) this.bigCount = bkt.tiles.length;
        }

        //remove previous elements
        var bucketviewOverlay = $('.pv-bucketview-overlay');
        bucketviewOverlay.css('left', this.offsetX + 'px');
        $('.pv-bucketview-overlay div').fadeOut('slow', function () { $(this).remove(); });
        bucketviewOverlay.append(uiElements.join(''));
        $('.pv-bucketview-overlay div').fadeIn('slow');

        for (var i = 0; i < this.tiles.length; i++) {
            //setup tiles
            var tile = this.tiles[i];
            tile._locations[0].startx = tile._locations[0].x;
            tile._locations[0].starty = tile._locations[0].y;
            tile.startwidth = tile.width;
            tile.startheight = tile.height;

            if (tile.filtered && !tile.missing) continue;
            tile.start = PivotViewer.Utils.Now();
            tile.end = tile.start + 1000;
            var theta = Math.atan2(tile._locations[0].y - (this.currentHeight / 2), tile._locations[0].x - (this.currentWidth / 2))
            tile._locations[0].destinationx = this.currentWidth * Math.cos(theta) + (this.currentWidth / 2);
            tile._locations[0].destinationy = this.currentHeight * Math.sin(theta) + (this.currentHeight / 2);
        }

        // recalculate max width of images in filter
        this.maxRatio = TileController._imageController.GetRatio(this.tiles[0].facetItem.Img);
        for (var i = 0; i < this.filter.length; i++) {
            var item = this.filter[i].facetItem;
            var ratio = TileController._imageController.GetRatio(item.Img);
            if (ratio < this.maxRatio) this.maxRatio = ratio;
        }
        
        var pt2Timeout = this.filter.length == this.tiles.length ? 0 : 500, that = this;
        setTimeout(function () {
            // Clear selection
            var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
            if (value > 0) { 
                that.selected = selectedTile = null;
                //zoom out
                that.currentOffsetX = that.offsetX;
                that.currentOffsetY = that.offsetY;
                that.ResetUISettings();
                // Zoom using the slider event
                $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 0);
            }
            that.ResetUISettings();
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
        $('.pv-bucketview-overlay div').fadeOut();
    },
    GetUI: function() {
        if (Modernizr.canvas) return "<div class='pv-bucketview-overlay'></div>";
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
    Bucketize: function (filterList, orderBy) {
        var category = PivotCollection.GetFacetCategoryByName(orderBy);
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
            bkts.ids = [];
            //Total range is proportional to the next highest power of ten.
            var delta = max - min, bucketSize;
            if (delta == 0) bucketSize = 1;
            else {
                bucketSize = Math.pow(10, Math.ceil(Math.log(delta) / Math.log(10)) - 1);
                if (category.integer && bucketSize <= 1) bucketSize = 1;
                else if (delta <= (bucketSize * 5)) bucketSize /= 2;
            }
            var base = Math.floor(min / bucketSize) * bucketSize, numBuckets = Math.floor((max - base) / bucketSize) + 1;

            for (var i = 0; i < numBuckets; i++) {
                var start = i * bucketSize + base;
                var end = start + bucketSize;
                bkts[i] = { startRange: start, endRange: start, tiles: [], ids: [], startLabel: start.toString(), endLabel: end.toString() };
            }   
            var i = 0;
            for (; i < filterList.length; i++) {
                var item = filterList[i].facetItem;
                var facet = item.FacetByName[orderBy];
                if (facet == undefined) break;
                for (var j = 0; j < facet.FacetValues.length; j++) {
                    var value = facet.FacetValues[j].Value, bktNum = Math.floor((value - base) / bucketSize);
                    var bkt = bkts[bktNum];
                    bkt.tiles.push(filterList[i]);
                    bkt.ids[item.Id] = true;
                    bkts.ids[item.Id] = bktNum;
                    if (bkt.endRange < value) bkt.endRange = value;
                }
            }
            var empty = 0;
            for (var b = 0; b < bkts.length; b++) {
                if (bkts[b].tiles.length == 0) empty++;
            }
            if (empty >= Math.floor(bkts.length / 2)) {
                var newBkts = []; newBkts.ids = [];
                for (var b = 0; b < bkts.length >> 1; b++) {
                    var bkt1 = bkts[2 * b], bkt2 = bkts[2 * b + 1];
                    newBkts.push(bkt1);
                    Array.prototype.push.apply(bkt1.tiles, bkt2.tiles);
                    for (var key in bkt1.ids) newBkts.ids[key] = b;
                    for (var key in bkt2.ids) {
                        bkt1.ids[key] = true;
                        newBkts.ids[key] = b;
                    }
                    bkt1.endRange = bkt2.endRange; bkt1.endLabel = bkt2.endLabel;
                }
                var c = 2 * b;
                if (c < bkts.length) {
                    var bkt = bkts[c];
                    newBkts.push(bkt);
                    for (var key in bkt.ids) newBkts.ids[key] = b;
                }
                bkts = newBkts;
            }
            if (i != filterList.length) {
                bkts.push({ startRange: "(no info)", endRange: "(no info)", tiles: [], ids: [], values: ["(no info)"], startLabel: "(no info)", endLabel: "(no info)" });
                var bktNum = bkts.length - 1, bkt = bkts[bktNum];
                for (; i < filterList.length; i++) {
                    var item = filterList[i].facetItem;
                    bkt.tiles.push(filterList[i]);
                    bkt.ids[item.Id] = true;
                    bkts.ids[item.Id] = bktNum;
                }
            }
            return bkts;
        }
        else return GetBuckets(filterList, orderBy);
        //Got rid of multiple values for now
    },
    CenterOnTile: function (tile) {
        var item = tile.facetItem, location = tile._locations[tile.selectedLoc];
        var tileMaxWidth = this.rowscols.TileMaxWidth, padding = this.rowscols.PaddingX;
        var bucket = this.buckets.ids[tile.facetItem.Id], bucketCols = this.rowscols.Columns;
        var bucketCol = Math.round(((location.x - this.currentOffsetX) - (bucket * (bucketCols * tileMaxWidth + padding))) / tileMaxWidth);
        var col = (bucket * bucketCols) + bucketCol;
        var row = Math.round((this.canvasHeightUIAdjusted - (location.y - this.currentOffsetY)) / tile.height) - 1;

        var canvasHeight = tile.context.canvas.height;
        var canvasWidth = tile.context.canvas.width - ($('.pv-filterpanel').width() + $('.pv-infopanel').width());

        // Find which is proportionally bigger, height or width
        var origProportion;
        if (tile.height / canvasHeight > (tile.height / TileController._imageController.GetRatio(tile.facetItem.Img)) / canvasWidth)
            origProportion = tile.origheight / canvasHeight;
        else origProportion = tile.origwidth / canvasWidth;
        if (this.selected == null) $('.pv-toolbarpanel-zoomslider').slider('option', 'value', Math.round((0.75 / origProportion) * 2));

        var padding = this.rowscols.PaddingX * bucket;
        this.currentOffsetX = (this.width / 2) - (this.rowscols.TileMaxWidth * col) - (this.rowscols.TileMaxWidth / 2) - padding;
        //this.currentOffsetY = - this.rowscols.TileHeight * (((this.rowscols.Rows + 1) / 2) - (row + 2)) - ( this.canvasHeightUIAdjusted / 2 ) - (this.rowscols.TileHeight / 2) ;
        this.currentOffsetY = this.height / 2 - this.canvasHeightUIAdjusted + this.rowscols.TileHeight / 2 + row * this.rowscols.TileHeight;
        this.SetVisibleTileGraphPositions(this.rowscols, this.currentOffsetX, this.currentOffsetY, true, true);
    },
    handleSelection: function (tile, clickX, clickY, selectedLoc) {
        var found = false;
        var dontFilter = false;

        //Reset slider to zero before zooming ( do this before sorting the tile selection
        //because zooming to zero unselects everything...)
        if (this.selected != tile) {
            if (this.selected == null){
                var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
                if (value != 0) $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 0);
            }
        }

        if (tile != null) {
            tile.Selected(true);
            tile.selectedLoc = selectedLoc;
            found = true;
        }

        // If an item is selected then zoom out but don't set the filter
        // based on clicking in a bar in the graph.
        if (this.selected != null && tile == null) dontFilter = true;

        //zoom in on selected tile
        if (tile != null && this.selected != tile) {
            this.CenterOnTile(tile);
            $('.pv-bucketview-overlay div').fadeOut('slow');
        }
        else if (this.selected != null) {
            //zoom out
            this.selected = tile = null;
            $('.pv-toolbarpanel-zoomslider').slider('option', 'value', 0);
            $('.pv-bucketview-overlay div').fadeIn('slow');
        }
        $.publish("/PivotViewer/Views/Item/Selected", [{item: tile}]);

        if (!found && !dontFilter) {
            var bucket = this.buckets[this.GetBucket(clickX)];
            $.publish("/PivotViewer/Views/Item/Filtered", [{ Facet: this.sortFacet, Item: bucket.startRange, MaxRange: bucket.endRange, Values: bucket.values, ClearFacetFilters:true}]);
        }
    }
});
