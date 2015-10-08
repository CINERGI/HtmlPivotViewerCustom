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

PivotViewer.Utils.loadScript("src/views/bucketview.min.js");

PivotViewer.Views.CrosstabView = PivotViewer.Views.BucketView.subClass({
    init: function () {
        this._super();
        var that = this;
        if ($("#pv-altsortcontrols").length == 0) {
            $("#pv-primsortcontrols").before("<div id='pv-altsortcontrols' class='pv-toolbarpanel-sortcontrols'></div>");
            $("#pv-altsortcontrols").hide();
            $("#pv-primsort").clone(true).attr("id", "pv-altsort").appendTo($("#pv-altsortcontrols"));
            $("#pv-altsort").on("change", function (e) {
                if (that.buckets2 == undefined) return; //initialzing
                that.sortFacet2 = $("#pv-altsort option:selected").html();
                var category = PivotCollection.getCategoryByName(that.sortFacet2);
                if (!category.uiInit) PV.initUIFacet(category);
                var filterList = that.filterList.slice(0).sort(tileSortBy(that.sortFacet2));
                if (Settings.showMissing) that.filterList2 = filterList;
                else {
                    that.filterList2 = [];
                    for (var i = 0; i < filterList.length; i++) {
                        var tile = filterList[i];
                        if (tile.item.getFacetByName(that.sortFacet2) != undefined) that.filterList2.push(tile);
                    }
                }
                that.buckets2 = that.bucketize(that.filterList2, that.sortFacet2);
                that.subbucketize();
                that.activate();
            });
        }
    },
    getBucket: function (x) { return Math.floor((x - this.offsetX - this.columnWidth) / this.columnWidth); },
    getBucket2: function (y) { return this.buckets2.length - Math.floor(y / this.rowHeight) - 1},
    recalibrateUISettings: function () {
        this.rowscols = this.getTileDimensions((this.origColumnWidth - 4) * this.scale, (this.rowHeight - 4) * this.scale,
            this.maxRatio, this.bigCount, this.rowscols);
    },
    resetUISettings: function () {
        this.rowscols = this.calculateDimensions((this.origColumnWidth - 4) * this.scale, (this.rowHeight - 4) * this.scale,
            this.maxRatio, this.bigCount);
    },
    subbucketize: function () {
        for (var i = 0; i < this.buckets.length; i++) {
            var bkt = this.buckets[i];
            bkt.subBuckets = [];
            bkt.colCount = 0;
            for (var j = 0; j < this.buckets2.length; j++) {
                var bkt2 = this.buckets2[j];
                bkt.subBuckets.push(new PivotViewer.Models.Bucket(bkt2.startRange, bkt2.startLabel, bkt2.endRange, bkt2.endLabel));
            }
        }

        for (var i = 0; i < this.filterList.length; i++) {
            var tile = this.filterList[i], id = tile.item.id;
            var j = this.buckets.ids[id], k = this.buckets2.ids[id];
            if (j == undefined || k == undefined) continue;
            this.buckets[j].subBuckets[k].addTile(tile);
            this.buckets[j].colCount++;
        }
    },
    filter: function (tiles, filterList, sort) {
        this._super(tiles, filterList, sort);
        if (this.buckets2 == undefined) {
            this.sortFacet2 = $("#pv-primsort option:selected").html();
            $("#pv-altsort").val($("#pv-primsort").val());
            this.buckets2 = this.buckets;
            this.filterList2 = this.filterList;
        }
        else { //efficient resort
            var newFilterList2 = [];
            if (filterList.length < this.filterList2.length) {              
                for (var i = 0; i < this.filterList2.length; i++) {
                    var tile = this.filterList2[i];
                    if (this.buckets.ids[tile.item.id] != undefined) newFilterList2.push(tile);
                }              
            }
            else {
                var addFilterList2 = [], category = PivotCollection.getCategoryByName(this.sortFacet2);
                for (var i = 0; i < filterList.length; i++) {
                    var tile = this.filterList[i];
                    if (this.buckets2.ids[tile.item.id] == undefined &&
                        (Settings.showMissing || tile.item.getFacetByName(this.sortFacet2) != undefined)) addFilterList2.push(tile);
                }
                addFilterList2.sort(tileSortBy(this.sortFacet2));

                var i = 0, j = 0;
                while (i < this.filterList2.length && j < addFilterList2.length) {
                    var tile1 = this.filterList2[i], tile2 = addFilterList2[j], value1, value2;
                    var facet1 = tile1.item.getFacetByName(this.sortFacet2), facet2 = tile2.item.getFacetByName(this.sortFacet2);
                    if (facet1 == undefined) { newFilterList2.push(tile2); j++; continue; }
                    else if (facet2 == undefined) { newFilterList2.push(tile1); i++; continue; }
                    if (category.type == PivotViewer.Models.FacetType.DateTime) {
                        value1 = new Date(facet1.values[0].value);
                        value2 = new Date(facet2.values[0].value);
                    }
                    else {
                        value1 = facet1.values[0].value;
                        value2 = facet2.values[0].value;
                    }
                    if (value1 < value2) {newFilterList2.push(tile1); i++;}
                    else {newFilterList2.push(tile2); j++;}
                }

                while (i < this.filterList2.length) newFilterList2.push(this.filterList2[i++]);
                while (j < addFilterList2.length) newFilterList2.push(addFilterList2[j++]);
            }
            this.filterList2 = newFilterList2;
            this.buckets2 = this.bucketize(this.filterList2, this.sortFacet2);
        }
        this.subbucketize();
    },
    createUI: function () {

        $("#pv-altsortcontrols").show();

        if (this.filtered) this.filter(this.filterEvt.tiles, this.filterEvt.filterList, this.filterEvt.sort);

        this.columnWidth = this.origColumnWidth = (this.width - this.offsetX) / (this.buckets.length + 1);
        this.canvasHeightUIAdjusted = this.height - this.offsetY - this.titleSpace;
        this.rowHeight = this.canvasHeightUIAdjusted / this.buckets[0].subBuckets.length;

        //Find biggest bucket to determine tile size, rows and cols
        var uiElements = "<div class='pv-bucketview-overlay-bucket' style='width: " + (this.columnWidth - 4) + "px; height:" +
            this.height + "px;''>";
        this.bigCount = 0;

        for (var i = 0; i < this.buckets2.length; i++) {
            var bkt = this.buckets2[i];
            var label = bkt.startRange == bkt.endRange || bkt.startLabel == bkt.endLabel ? label = bkt.startLabel : bkt.startLabel + " to " + bkt.endLabel;
            uiElements += "<div class='pv-bucketview-overlay-buckettitle-left' style='top: " + ((this.buckets2.length - 1 - i) * this.rowHeight) +
                "px; height: " + (this.rowHeight - 4) + "px; width: " + (this.columnWidth - 4) + "px'><div class='pv-bucket-countbox'>" +
                this.buckets2[i].tiles.length + "<br>" + Math.round(this.buckets2[i].tiles.length / this.filterList2.length * 100) + "%</div><div class='pv-bucket-label'>" + label + "</div></div>";
        }
        uiElements += this.getStatsBox();
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
                this.buckets[i].colCount + "<br>" + Math.round(this.buckets[i].colCount / this.filterList2.length * 100) + "%</div>" + label + "</div></div></div>";

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

            if (tile.filtered && (Settings.showMissing || !tile.missing)) continue;
            tile.start = PivotViewer.Utils.now();
            tile.end = tile.start + 1000;
            var theta = Math.atan2(location.y - (this.currentHeight / 2), location.x - (this.currentWidth / 2))
            location.destinationx = this.currentWidth * Math.cos(theta) + (this.currentWidth / 2);
            location.destinationy = this.currentHeight * Math.sin(theta) + (this.currentHeight / 2);
        }

        // recalculate max width of images in filterList
        this.maxRatio = TileController._imageController.getRatio(this.tiles[0].item.img);
        for (var i = 0; i < this.filterList.length; i++) {
            var ratio = TileController._imageController.getRatio(this.filterList[i].item.img);
            if (ratio < this.maxRatio) this.maxRatio = ratio;
        }
        
        var pt2Timeout = this.filterList.length == this.tiles.length ? 0 : 500, that = this;
        setTimeout(function () {
            // Clear selection
            var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
            if (value > 0) { 
                that.selected = selectedTile = null;
                //zoom out
                that.currentOffsetX = that.offsetX;
                that.currentOffsetY = that.offsetY;

                that.resetUISettings();
                PV.zoom(0);
            }
            that.resetUISettings();
            var controller = TileController._imageController
            for (var i = 0; i < that.tiles.length; i++) {
                that.tiles[i].origwidth = that.rowscols.TileHeight / controller.getRatio(that.tiles[i].item.img);
                that.tiles[i].origheight = that.rowscols.TileHeight;
                that.tiles[i].destinationwidth = 1;
                that.tiles[i].destinationheight = 1;
            }
            that.setTilePositions(that.rowscols, that.offsetX, that.offsetY, false, false);

        }, pt2Timeout);
    },
    deactivate: function () {
        this._super();
        $("#pv-altsortcontrols").hide();
    },
    getViewName: function () {return "Crosstab View";},
    setTilePositions: function (rowscols, offsetX, offsetY, initTiles, keepColsRows) {
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
                        tile.start = PivotViewer.Utils.now();
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
    centerOnTile: function (tile) {
        var location = tile._locations[tile.selectedLoc], item = tile.item;;
        var cellCols = this.rowscols.Columns, cellRows = this.rowscols.Rows;
        var tileMaxWidth = this.rowscols.TileMaxWidth, tileHeight = this.rowscols.TileHeight;
        var cellX = this.buckets.ids[item.id], cellY = this.buckets2.ids[item.id];
        var cellCol = Math.round((location.x - this.currentOffsetX - (cellX + 1) * this.columnWidth) / tileMaxWidth);

        //Tricky numerical precision
        var cellRow = cellRows - Math.floor((location.y - this.currentOffsetY - (this.buckets2.length - cellY - 1) * this.rowHeight * this.scale - this.rowscols.PaddingY) / tileHeight);
        var bkt = this.buckets[cellX].subBuckets[cellY], index = cellRow * cellCols + cellCol;
        while ((index > bkt.tiles.length || bkt.tiles[index] != tile) && index >= 0) { cellRow--; index -= cellCols;}

        var canvasHeight = tile.context.canvas.height;
        var canvasWidth = tile.context.canvas.width - ($('.pv-filterpanel').width() + $('.pv-infopanel').width());

        // Find which is proportionally bigger, height or width
        var origProportion;
        if (tile.height / canvasHeight > (tile.height / TileController._imageController.getRatio(item.img)) / canvasWidth)
            origProportion = tile.origheight / canvasHeight;
        else origProportion = tile.origwidth / canvasWidth;
        if (this.selected == null) PV.zoom(Math.round((0.75 / origProportion) * 2));
        this.currentOffsetX = (this.width / 2) - (this.rowscols.TileMaxWidth / 2) - (cellX + 1) * this.columnWidth - cellCol * this.rowscols.TileMaxWidth;
        this.currentOffsetY = (this.height / 2) - this.canvasHeightUIAdjusted + (this.rowscols.TileHeight / 2) + cellY * this.rowHeight * this.scale +
            cellRow * this.rowscols.TileHeight + 10

        this.setTilePositions(this.rowscols, this.currentOffsetX, this.currentOffsetY, true, true);
    },
    getStatsBox: function () {
        var chi2 = 0, bkt;
        for (var i = 0; i < this.buckets.length; i++) {
            bkt = this.buckets[i];
            if (bkt.tiles.length == 0) continue;
            for (var j = 0; j < this.buckets2.length; j++) {
                var bkt2 = this.buckets2[j];
                if (bkt2.tiles.length == 0) continue;
                var e = (bkt.tiles.length * bkt2.tiles.length / this.filterList.length), n = e - bkt.subBuckets[j].tiles.length;
                chi2 += n * n / e;
            }
        }
        chi2 = Math.floor(chi2 * 100) / 100;
        var prob = pochisq(chi2, this.buckets.length, bkt.subBuckets.length), star = "";
        if (prob < 0.001) star = "***";
        else if (prob < 0.01) star = "**";
        else if (prob < 0.05) star = "*";
        return "<div style='position:absolute; width: " + (this.columnWidth - 4) + "px; height: 50px; top: " +
                (i * this.rowHeight) + "px;'><div style='text-align:center'>" + this.sortFacet2 +
                "</div><div class='pv-bucket-countbox'>X<sup>2</sup><br>" + chi2 + star + "</div><div style='position:absolute; right:2px;'>" + this.sortFacet + "</div></div></div>";
    },
    handleSelection: function (tile, clickX, clickY, selectedLoc) {
        var found = false;
        var dontFilter = false;

        if (tile != null) {
            tile.Selected(true);
            tile.selectedLoc = selectedLoc;
            found = true;
        }

        // If an item is selected then zoom out but don't set the filterList
        // based on clicking in a bar in the graph.
        if (this.selected != null && tile == null) dontFilter = true;

        //zoom in on selected tile
        if (tile != null && this.selected != tile) {
            this.centerOnTile(tile);
            $('.pv-bucketview-overlay div').fadeOut('slow');
        }
        else if(this.selected != null) {
            //zoom out
            this.selected = tile = null;
            PV.zoom(0);
            $('.pv-bucketview-overlay div').fadeIn('slow');
        }
        $.publish("/PivotViewer/Views/Item/Selected", [{item: tile}]);

        if (!found && !dontFilter) {
            var b1 = this.getBucket(clickX), b2 = this.getBucket2(clickY);
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
