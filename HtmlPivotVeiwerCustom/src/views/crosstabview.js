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

LoadScript("src/views/bucketview.min.js");

PivotViewer.Views.CrosstabView = PivotViewer.Views.BucketView.subClass({
    init: function () {
        this._super();
        var that = this;
        $("#pv-primsortcontrols").before("<div id='pv-altsortcontrols' class='pv-toolbarpanel-sortcontrols'></div>");
        $("#pv-altsortcontrols").hide();
        $("#pv-primsort").clone(true).attr("id", "pv-altsort").appendTo($("#pv-altsortcontrols"));
        $("#pv-altsort").on("change", function (e) {
            if (that.buckets2 == undefined) return; //initialzing
            that.sortFacet2 = $("#pv-altsort option:selected").html();
            var category = PivotCollection.GetFacetCategoryByName(that.sortFacet2);
            if (!category.uiInit) PV.InitUIFacet(category);
            var filter = that.filter.slice(0).sort(tile_sort_by(that.sortFacet2));
            if (settings.showMissing) that.filter2 = filter;
            else {
                that.filter2 = [];
                for (var i = 0; i < filter.length; i++) {
                    var tile = filter[i];
                    if (tile.facetItem.FacetByName[that.sortFacet2] != undefined) that.filter2.push(tile);
                }
            }
            that.buckets2 = that.Bucketize(that.filter2, that.sortFacet2);
            that.SubBucketize();
            that.Activate();     
        });

    },
    GetBucket: function (x) { return Math.floor((x - this.offsetX - this.columnWidth) / this.columnWidth); },
    GetBucket2: function (y) { return this.buckets2.length - Math.floor(y / this.rowHeight) - 1},
    RecalibrateUISettings: function () {
        this.rowscols = this.GetTileDimensions((this.origColumnWidth - 4) * this.scale, (this.rowHeight - 4) * this.scale,
            this.maxRatio, this.bigCount, this.rowscols);
    },
    ResetUISettings: function () {
        this.rowscols = this.GetRowsAndColumns((this.origColumnWidth - 4) * this.scale, (this.rowHeight - 4) * this.scale,
            this.maxRatio, this.bigCount);
    },
    SubBucketize: function () {
        for (var i = 0; i < this.buckets.length; i++) {
            var bucket = this.buckets[i];
            bucket.subBuckets = [];
            bucket.colCount = 0;
            for (var j = 0; j < this.buckets2.length; j++) {
                var bucket2 = this.buckets2[j];
                bucket.subBuckets.push({ startRange: bucket2.startRange, endRange: bucket2.endRange, tiles:[], ids:[], startLabel: bucket2.startLabel, endLabel: bucket2.endLabel })
            }
        }

        for (var i = 0; i < this.filter.length; i++) {
            var tile = this.filter[i], id = tile.facetItem.Id;
            var j = this.buckets.ids[id], k = this.buckets2.ids[id];
            if (j == undefined || k == undefined) continue;
            var bkt = this.buckets[j].subBuckets[k];
            bkt.tiles.push(tile);
            bkt.ids[id] = true;
            this.buckets[j].colCount++;
        }
    },
    Filter: function (tiles, filter, sort) {
        this._super(tiles, filter, sort);
        if (this.buckets2 == undefined) {
            this.sortFacet2 = $("#pv-primsort option:selected").html();
            $("#pv-altsort").val($("#pv-primsort").val());
            this.buckets2 = this.buckets;
            this.filter2 = this.filter;
        }
        else { //efficient resort
            var newFilter2 = [];
            if (filter.length < this.filter2.length) {              
                for (var i = 0; i < this.filter2.length; i++) {
                    var tile = this.filter2[i];
                    if (this.buckets.ids[tile.facetItem.Id] != undefined) newFilter2.push(tile);
                }              
            }
            else {
                var addFilter2 = [], category = PivotCollection.GetFacetCategoryByName(this.sortFacet2);
                for (var i = 0; i < filter.length; i++) {
                    var tile = this.filter[i];
                    if (this.buckets2.ids[tile.facetItem.Id] == undefined &&
                        (settings.showMissing || tile.facetItem.FacetByName[this.sortFacet2] != undefined)) addFilter2.push(tile);
                }
                addFilter2.sort(tile_sort_by(this.sortFacet2));

                var i = 0, j = 0;
                while (i < this.filter2.length && j < addFilter2.length) {
                    var tile1 = this.filter2[i], tile2 = addFilter2[j], value1, value2;
                    var facet1 = tile1.facetItem.FacetByName[this.sortFacet2], facet2 = tile2.facetItem.FacetByName[this.sortFacet2];
                    if (facet1 == undefined) { newFilter2.push(tile2); j++; continue; }
                    else if (facet2 == undefined) { newFilter2.push(tile1); i++; continue; }
                    if (category.type == PivotViewer.Models.FacetType.DateTime) {
                        value1 = new Date(facet1.FacetValues[0].Value);
                        value2 = new Date(facet2.FacetValues[0].Value);
                    }
                    else {
                        value1 = facet1.FacetValues[0].Value;
                        value2 = facet2.FacetValues[0].Value;
                    }
                    if (value1 < value2) {newFilter2.push(tile1); i++;}
                    else {newFilter2.push(tile2); j++;}
                }

                while (i < this.filter2.length) newFilter2.push(this.filter2[i++]);
                while (j < addFilter2.length) newFilter2.push(addFilter2[j++]);
            }
            this.filter2 = newFilter2;
            this.buckets2 = this.Bucketize(this.filter2, this.sortFacet2);
        }
        this.SubBucketize();
    },
    CreateUI: function () {

        $("#pv-altsortcontrols").show();

        if (this.filtered) this.Filter(this.filterEvt.tiles, this.filterEvt.filter, this.filterEvt.sort);

        this.columnWidth = this.origColumnWidth = (this.width - this.offsetX) / (this.buckets.length + 1);
        this.canvasHeightUIAdjusted = this.height - this.offsetY - this.titleSpace;
        this.rowHeight = this.canvasHeightUIAdjusted / this.buckets[0].subBuckets.length;

        //Find biggest bucket to determine tile size, rows and cols
        var uiElements = "<div class='pv-bucketview-overlay-bucket' style='width: " + (this.columnWidth - 4) + "px; height:" +
            this.height + "px;''>";
        this.bigCount = 0;
        var chi2 = 0, bkt;
        for (var i = 0; i < this.buckets.length; i++) {
            bkt = this.buckets[i];
            if (bkt.tiles.length == 0) continue;
            for (var j = 0; j < this.buckets2.length; j++) {
                var bkt2 = this.buckets2[j];
                if (bkt2.tiles.length == 0) continue;
                var e = (bkt.tiles.length * bkt2.tiles.length / this.filter.length), n = e - bkt.subBuckets[j].tiles.length;
                chi2 += n * n / e;
            }
        }
        chi2 = Math.floor(chi2 * 100) / 100;
        var prob = pochisq(chi2, this.buckets.length, bkt.subBuckets.length), star = "";
        if (prob < 0.001) star = "***";
        else if (prob < 0.01) star = "**";
        else if (prob < 0.05) star = "*";

        for (var i = 0; i < this.buckets2.length; i++) {
            var bkt = this.buckets2[i];
            var label = bkt.startRange == bkt.endRange || bkt.startLabel == bkt.endLabel ? label = bkt.startLabel : bkt.startLabel + " to " + bkt.endLabel;
            uiElements += "<div class='pv-bucketview-overlay-buckettitle-left' style='top: " + ((this.buckets2.length - 1 - i) * this.rowHeight) +
                "px; height: " + (this.rowHeight - 4) + "px; width: " + (this.columnWidth - 4) + "px'><div class='pv-bucket-countbox'>" +
                this.buckets2[i].tiles.length + "<br>" + Math.round(this.buckets2[i].tiles.length / this.filter2.length * 100) + "%</div><div class='pv-bucket-label'>" + label + "</div></div>";
        }
        uiElements += "<div style='position:absolute; width: " + (this.columnWidth - 4) + "px; height: 50px; top: " +
                (i * this.rowHeight) + "px;'><div style='text-align:center'>" + this.sortFacet2 +
                "</div><div class='pv-bucket-countbox'>X<sup>2</sup><br>" + chi2 + star + "</div><div style='position:absolute; right:2px;'>" + this.sortFacet + "</div></div></div>";
        for (var i = 0; i < this.buckets.length; i++) {
            var bkt = this.buckets[i];
            uiElements += "<div class='pv-bucketview-overlay-bucket' style='width: " + (this.columnWidth - 4) + "px; left:" + ((i + 1) *
                this.columnWidth) + "px; height:" + this.height + "px;'>";
            for (var j = 0; j < bkt.subBuckets.length; j++) {
                var sub = bkt.subBuckets[j];
                var styleClass = i % 2 == j % 2 ? "bucketview-bucket-dark" : "bucketview-bucket-light";
                uiElements += "<div style='height:" + this.rowHeight + "px; top:" + (j * this.rowHeight) +
                "px;'><div class='" + styleClass + "' style='height:" + (this.rowHeight - 4) + "px; top: " + (j * this.rowHeight) + "px;'></div></div>";
                if (this.bigCount < sub.tiles.length) this.bigCount = sub.tiles.length;
            }
            var label = bkt.startRange == bkt.endRange || bkt.startLabel == bkt.endLabel ? label = "<div class='pv-bucket-label'>" + bkt.startLabel +
                "</div>" : bkt.startLabel + "<br>to<br>" + bkt.endLabel;
            
            uiElements += "<div class='pv-bucketview-overlay-buckettitle' style='top: " + (this.canvasHeightUIAdjusted + 4) + "';'><div class='pv-bucket-countbox'>" +
                this.buckets[i].colCount + "<br>" + Math.round(this.buckets[i].colCount / this.filter2.length * 100) + "%</div>" + label + "</div></div></div>";

        }

        //remove previous elements
        var bucketviewOverlay = $('.pv-bucketview-overlay');
        bucketviewOverlay.css('left', this.offsetX + 'px');
        $('.pv-bucketview-overlay div').fadeOut('slow', function () { $(this).remove(); });
        bucketviewOverlay.append(uiElements);
        $('.pv-bucketview-overlay div').fadeIn('slow');

        for (var i = 0; i < this.tiles.length; i++) {
            //setup tiles
            var tile = this.tiles[i], location = tile._locations[0];
            location.startx = location.x;
            location.starty = location.y;
            tile.startwidth = tile.width;
            tile.startheight = tile.height;

            if (tile.filtered && (settings.showMissing || !tile.missing)) continue;
            tile.start = PivotViewer.Utils.Now();
            tile.end = tile.start + 1000;
            var theta = Math.atan2(location.y - (this.currentHeight / 2), location.x - (this.currentWidth / 2))
            location.destinationx = this.currentWidth * Math.cos(theta) + (this.currentWidth / 2);
            location.destinationy = this.currentHeight * Math.sin(theta) + (this.currentHeight / 2);
        }

        // recalculate max width of images in filter
        this.maxRatio = TileController._imageController.GetRatio(this.tiles[0].facetItem.Img);
        for (var i = 0; i < this.filter.length; i++) {
            var ratio = TileController._imageController.GetRatio(this.filter[i].facetItem.Img);
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
                PV.Zoom(0);
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
        $("#pv-altsortcontrols").hide();
    },
    GetViewName: function () {return 'Crosstab View';},
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
        var rowHeight = this.rowHeight * this.scale;
        for (var i = 0; i < this.buckets.length; i++) {
            var bucket = this.buckets[i];
        
            for (var j = 0; j < bucket.subBuckets.length; j++) {
                var sub = bucket.subBuckets[j], currentColumn = 0, currentRow = 0;

                for (var k = 0; k < sub.tiles.length; k++) {
                    var tile = sub.tiles[k];

                    if (!tile.firstFilterItemDone) {
                        var location = tile._locations[0];
                        if (initTiles) {
                            location.startx = location.x;
                            location.starty = location.y;
                            tile.startwidth = tile.width;
                            tile.startheight = tile.height;
                        }

                        tile.destinationwidth = rowscols.TileMaxWidth;
                        tile.destinationheight = rowscols.TileHeight;
                        location.destinationx = ((i + 1) * this.columnWidth) + (currentColumn * rowscols.TileMaxWidth) + offsetX;
                        location.destinationy = this.canvasHeightUIAdjusted - (j * rowHeight) - rowscols.TileHeight -
                            (currentRow * rowscols.TileHeight) + offsetY - 10;
                        tile.start = PivotViewer.Utils.Now();
                        tile.end = tile.start + 1000;
                        tile.firstFilterItemDone = true;
                    }
                    else {
                        var location = new PivotViewer.Views.TileLocation();
                        location.startx = tile._locations[0].startx;
                        location.starty = tile._locations[0].starty;
                        location.x = tile._locations[0].x;
                        location.y = tile._locations[0].y;
                        location.destinationx = ((i + 1) * this.columnWidth) + (currentColumn * rowscols.TileMaxWidth) + offsetX;
                        location.destinationy = this.canvasHeightUIAdjusted - (j * rowHeight) - rowscols.TileHeight -
                            (currentRow * rowscols.TileHeight) + offsetY - 10;
                        tile._locations.push(location);
                    }
                    if (currentColumn == columns - 1) {
                        currentColumn = 0;
                        currentRow++;
                    }
                    else currentColumn++;
                }
            }
        }
    },
    CenterOnTile: function (tile) {
        var location = tile._locations[tile.selectedLoc], item = tile.facetItem;;
        var cellCols = this.rowscols.Columns, cellRows = this.rowscols.Rows;
        var tileMaxWidth = this.rowscols.TileMaxWidth, tileHeight = this.rowscols.TileHeight;
        var cellX = this.buckets.ids[item.Id], cellY = this.buckets2.ids[item.Id];
        var cellCol = Math.round((location.x - this.currentOffsetX - (cellX + 1) * this.columnWidth) / tileMaxWidth);

        //Tricky numerical precision
        var cellRow = cellRows - Math.floor((location.y - this.currentOffsetY - (this.buckets2.length - cellY - 1) * this.rowHeight * this.scale - this.rowscols.PaddingY) / tileHeight);
        var bkt = this.buckets[cellX].subBuckets[cellY], index = cellRow * cellCols + cellCol;
        while ((index > bkt.tiles.length || bkt.tiles[index] != tile) && index >= 0) { cellRow--; index -= cellCols;}

        var canvasHeight = tile.context.canvas.height;
        var canvasWidth = tile.context.canvas.width - ($('.pv-filterpanel').width() + $('.pv-infopanel').width());

        // Find which is proportionally bigger, height or width
        var origProportion;
        if (tile.height / canvasHeight > (tile.height / TileController._imageController.GetRatio(item.Img)) / canvasWidth)
            origProportion = tile.origheight / canvasHeight;
        else origProportion = tile.origwidth / canvasWidth;
        if (this.selected == null) PV.Zoom(Math.round((0.75 / origProportion) * 2));
        this.currentOffsetX = (this.width / 2) - (this.rowscols.TileMaxWidth / 2) - (cellX + 1) * this.columnWidth - cellCol * this.rowscols.TileMaxWidth;
        this.currentOffsetY = (this.height / 2) - this.canvasHeightUIAdjusted + (this.rowscols.TileHeight / 2) + cellY * this.rowHeight * this.scale +
            cellRow * this.rowscols.TileHeight + 10

        this.SetVisibleTileGraphPositions(this.rowscols, this.currentOffsetX, this.currentOffsetY, true, true);
    },
    handleSelection: function (tile, clickX, clickY, selectedLoc) {
        var found = false;
        var dontFilter = false;

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
        else if(this.selected != null) {
            //zoom out
            this.selected = tile = null;
            PV.Zoom(0);
            $('.pv-bucketview-overlay div').fadeIn('slow');
        }
        $.publish("/PivotViewer/Views/Item/Selected", [{item: tile}]);

        if (!found && !dontFilter) {
            var b1 = this.GetBucket(clickX), b2 = this.GetBucket2(clickY);
            if (b1 >= 0) {
                var bkt1 = this.buckets[b1];
                if (b2 >= 0) {
                    var bkt2 = this.buckets2[b2];
                    
                    $.publish("/PivotViewer/Views/Item/Filtered", [[
                        { Facet: this.sortFacet, Item: bkt1.startRange, MaxRange: bkt1.endRange, Values: bkt1.values },
                        { Facet: this.sortFacet2, Item: bkt2.startRange, MaxRange: bkt2.endRange, Values: bkt2.values }
                    ]]);
                }
                else $.publish("/PivotViewer/Views/Item/Filtered", [{
                    Facet: this.sortFacet, Item: bkt1.startRange, MaxRange: bkt1.endRange, Values: bkt1.values
                }]);
            }
            else if (b2 >= 0) {
                var bkt2 = this.buckets2[b2];
                $.publish("/PivotViewer/Views/Item/Filtered", [{
                    Facet: this.sortFacet2, Item: bkt2.startRange, MaxRange: bkt2.endRange, Values: bkt2.values
                }]);
            }
        }
    }
});
