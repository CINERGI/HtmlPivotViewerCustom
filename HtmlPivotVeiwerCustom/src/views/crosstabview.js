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
                if (that.bucketsY == undefined) return; //initialzing
                that.sortCategory2 = $("#pv-altsort option:selected").html();
                var category = PivotCollection.getCategoryByName(that.sortCategory2);
                if (!category.uiInit) PV.initUICategory(category);
                var filterList = that.filterList.slice(0).sort(tileSortBy(that.sortCategory2));
                if (Settings.showMissing) that.filterList2 = filterList;
                else {
                    that.filterList2 = [];
                    for (var i = 0; i < filterList.length; i++) {
                        var tile = filterList[i];
                        if (tile.item.getFacetByName(that.sortCategory2) != undefined) that.filterList2.push(tile);
                    }
                }
                that.bucketsY = that.bucketize(that.filterList2, that.sortCategory2);
                that.subbucketize();
                that.activate();
            });
        }
    },
    getBucket: function (x) { return Math.floor((x - this.offsetX - this.columnWidth) / this.columnWidth); },
    getBucketY: function (y) { return this.bucketsY.length - Math.floor(y / this.rowHeight) - 1},
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
            for (var j = 0; j < this.bucketsY.length; j++) {
                var bkt2 = this.bucketsY[j];
                bkt.subBuckets.push(new PivotViewer.Models.Bucket(bkt2.startRange, bkt2.startLabel, bkt2.endRange, bkt2.endLabel));
            }
        }

        for (var i = 0; i < this.filterList.length; i++) {
            var tile = this.filterList[i], id = tile.item.id;
            var j = this.buckets.ids[id], k = this.bucketsY.ids[id];
            if (j == undefined || k == undefined) continue;
            this.buckets[j].subBuckets[k].addTile(tile);
            this.buckets[j].colCount++;
        }
    },
    filterY: function () {
        if (this.bucketsY == undefined) {
            this.sortCategory2 = $("#pv-primsort option:selected").html();
            $("#pv-altsort").val($("#pv-primsort").val());
            this.bucketsY = this.buckets;
            this.filterList2 = this.filterList;
        }
        else { //efficient resort
            var newFilterList2 = [];
            if (this.filterList.length < this.filterList2.length) {              
                for (var i = 0; i < this.filterList2.length; i++) {
                    var tile = this.filterList2[i];
                    if (this.buckets.ids[tile.item.id] != undefined) newFilterList2.push(tile);
                }              
            }
            else {
                var addFilterList2 = [], category = PivotCollection.getCategoryByName(this.sortCategory2);
                for (var i = 0; i < this.filterList.length; i++) {
                    var tile = this.filterList[i];
                    if (this.bucketsY.ids[tile.item.id] == undefined &&
                        (Settings.showMissing || tile.item.getFacetByName(this.sortCategory2) != undefined)) addFilterList2.push(tile);
                }
                addFilterList2.sort(tileSortBy(this.sortCategory2));

                var i = 0, j = 0;
                while (i < this.filterList2.length && j < addFilterList2.length) {
                    var tile1 = this.filterList2[i], tile2 = addFilterList2[j], value1, value2;
                    var facet1 = tile1.item.getFacetByName(this.sortCategory2), facet2 = tile2.item.getFacetByName(this.sortCategory2);
                    if (facet1 == undefined) { newFilterList2.push(tile2); j++; continue; }
                    else if (facet2 == undefined) { newFilterList2.push(tile1); i++; continue; }
                    if (category.isDateTime()) {
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

            if ($(".pv-facet[facet='" + PV.cleanName(this.sortCategory2).toLowerCase() + "']").attr("mode") == "db") {
                this.bucketsY = DB.getBuckets(this.sortCategory2);
                PivotViewer.Utils.fillBuckets(this.bucketsY, this.filterList2, this.sortCategory2);
            }
            else this.bucketsY = this.bucketize(this.filterList2, this.sortCategory2);
        }
        this.subbucketize();
    },
    filter: function() {
        this.buckets = this.bucketize(this.filterList, this.sortCategory);
        this.filterY();
    },
    createUI: function () {
        $("#pv-altsortcontrols").show();

        this.columnWidth = this.origColumnWidth = (this.width - this.offsetX) / (this.buckets.length + 1);
        this.canvasHeightUIAdjusted = this.height - this.offsetY - this.titleSpace;
        this.rowHeight = this.canvasHeightUIAdjusted / this.buckets[0].subBuckets.length;

        //Find biggest bucket to determine tile size, rows and cols
        var uiElements = "<div class='pv-bucketview-overlay-bucket' style='width: " + (this.columnWidth - 4) + "px; height:" +
            this.height + "px;''>";
        this.bigCount = 0;

        for (var i = 0; i < this.bucketsY.length; i++) {
            var bkt = this.bucketsY[i];
            var label = bkt.startRange == bkt.endRange || bkt.startLabel == bkt.endLabel ? label = bkt.startLabel : bkt.startLabel + " to " + bkt.endLabel;
            uiElements += "<div class='pv-bucketview-overlay-buckettitle-left' style='top: " + ((this.bucketsY.length - 1 - i) * this.rowHeight) +
                "px; height: " + (this.rowHeight - 4) + "px; width: " + (this.columnWidth - 4) + "px'><div class='pv-bucket-countbox'>" +
                this.bucketsY[i].tiles.length + "<br>" + Math.round(this.bucketsY[i].tiles.length / this.filterList2.length * 100) + "%</div><div class='pv-bucket-label'>" + label + "</div></div>";
        }
        uiElements += this.getStatsBox() + "</div>";
        for (var i = 0; i < this.buckets.length; i++) {
            var bkt = this.buckets[i];
            uiElements += "<div class='pv-bucketview-overlay-bucket' style='width: " + (this.columnWidth - 4) + "px; left:" + ((i + 1) *
                this.columnWidth) + "px; height:" + this.height + "px;'>";
            for (var j = bkt.subBuckets.length - 1; j >= 0; j--) {
                var sub = bkt.subBuckets[j];
                var styleClass = i % 2 == j % 2 ? "bucketview-bucket-dark" : "bucketview-bucket-light";
                if (sub.equals(PV.subsets[0]) || sub.equals(PV.subsets[1])) styleClass += " pv-bucketview-subset";
                uiElements += "<div style='height:" + this.rowHeight + "px; top:" + (j * this.rowHeight) +
                "px;'><div class='pv-crosstabview-overlay-bucket " + styleClass + "' style='height:" + (this.rowHeight - 4) +
                "px; top: " + (j * this.rowHeight) + "px;'></div></div>";
                if (this.bigCount < sub.tiles.length) this.bigCount = sub.tiles.length;
            }
            var label = bkt.startRange == bkt.endRange || bkt.startLabel == bkt.endLabel ? label = "<div class='pv-bucket-label'>" + bkt.startLabel +
                "</div>" : bkt.startLabel + "<br>to<br>" + bkt.endLabel;
            
            uiElements += "<div class='pv-bucketview-overlay-buckettitle' style='top: " + (this.canvasHeightUIAdjusted + 4) + "';'><div class='pv-bucket-countbox'>" +
                this.buckets[i].colCount + "<br>" + Math.round(this.buckets[i].colCount / this.filterList2.length * 100) + "%</div>" + label + "</div></div></div>";

        }

        $(".pv-viewpanel-view").append("<div class='pv-bucketview-overlay'></div>");
        $('.pv-bucketview-overlay').css('left', this.offsetX + 'px').append(uiElements);
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
    getButtonImage: function () {return 'images/CrossTabView.png';},
    getButtonImageSelected: function () {return 'images/CrossTabViewSelected.png';},
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
        var location = tile._locations[0], item = tile.item;;
        var cellCols = this.rowscols.Columns, cellRows = this.rowscols.Rows;
        var tileMaxWidth = this.rowscols.TileMaxWidth, tileHeight = this.rowscols.TileHeight;
        var cellX = this.buckets.ids[item.id], cellY = this.bucketsY.ids[item.id];
        var cellCol = Math.round((location.x - this.currentOffsetX - (cellX + 1) * this.columnWidth) / tileMaxWidth);

        //Tricky numerical precision
        var cellRow = cellRows - Math.floor((location.y - this.currentOffsetY - (this.bucketsY.length - cellY - 1) * this.rowHeight * this.scale - this.rowscols.PaddingY) / tileHeight);
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
            for (var j = 0; j < this.bucketsY.length; j++) {
                var bkt2 = this.bucketsY[j];
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
        return "<div class='pv-crosstabview-overlay-statsbox' style='position:absolute; width: " + (this.columnWidth - 4) + "px; height: 50px; top: " +
                (this.bucketsY.length * this.rowHeight) + "px;'><div style='text-align:center'>" + this.sortCategory2 +
                "</div><div class='pv-bucket-countbox' title='chi-squared'>X<sup>2</sup><br>" + chi2 + star +
                "</div><div style='position:absolute; right:2px;'>" + this.sortCategory + "</div></div>";
    },
    handleHover: function (evt) {
        this.super_handleHover(evt);
        $(".pv-crosstabview-overlay-bucket").removeClass("bucketview-bucket-hover");
        $(".pv-tooltip").remove();

        if (this.scale > 1) return;

        var bktNumX = this.getBucket(evt.x), bktNumY = this.getBucketY(evt.y);
        if (bktNumX >= 0 && bktNumY >= 0) {
            $(".pv-crosstabview-overlay-bucket").eq(bktNumX * this.bucketsY.length + (this.bucketsY.length - bktNumY - 1)).addClass("bucketview-bucket-hover");
            return;
        }

        var box, bkt, bktNum, category, offset;
        if (bktNumX < -1 || bktNumY < -1) return;
        else if (bktNumX == -1) {
            if (bktNumY == -1) {
                $(".pv-bucketview-overlay").append("<div class='pv-tooltip'>chi-squared</div>");
                $(".pv-tooltip").offset($(".pv-crosstabview-overlay-statsbox").offset());
                return;
            }
            bktNum = bktNumY;
            box = $(".pv-bucketview-overlay-buckettitle-left").eq(bktNum);
            bkt = this.bucketsY[bktNum];
            category = this.sortCategory2;
        }
        else if (bktNumY == -1) {
            bktNum = bktNumX;
            box = $(".pv-bucketview-overlay-buckettitle").eq(bktNum);
            bkt = this.buckets[bktNum];
            category = this.sortCategory;
        }
        else return;

        var string = PivotCollection.getCategoryByName(category).isString();
        var tooltip = "<div class='pv-tooltip'>" + category + " Bucket " + (bktNum + 1) + ":<br>" + (bkt.startLabel == bkt.endLabel ? " Value: " +
            (string ? "\"" : "") + bkt.startLabel + (string ? "\"" : "") +
            "<br>" : "Values: from " + (string ? "\"" : "") + bkt.startLabel + (string ? "\"" : "") + "  to " + (string ? "\"" : "") + bkt.endLabel +
            (string ? "\"" : "") + "<br>") + bkt.tiles.length + " of " + this.filterList2.length +
            " items (" + Math.round(bkt.tiles.length / this.filterList2.length * 100) + "%)" + (Settings.showMissing ? "</div>" :
            "<br><i>(Some items may be missing values for this variable.)</i></div>");
        $(".pv-bucketview-overlay").append(tooltip);
        $(".pv-tooltip").offset(box.offset());
    },
    handleClick: function (evt) {
        if (this.hasSubsets() && !PV.subsets.finalized) { PV.subsets.finalized = true; PV.filterViews(); return; }
        var tile = this.super_handleClick(evt);
        if (this.selected != null) this.selected.setSelected(false);
        if (tile != null) {
            if (this.selected != tile) {
                tile.setSelected(true);
                this.centerOnTile(tile);
                this.setSelected(tile);
                $('.pv-bucketview-overlay div').fadeOut('slow');
            }
            else {
                tile = null;
                this.setSelected(null);
                PV.zoom(0);
                $('.pv-bucketview-overlay div').fadeIn('slow');
            }
        }
        else {
            this.setSelected(null);
            PV.zoom(0);
            $('.pv-bucketview-overlay div').fadeIn('slow');
            var b1 = this.getBucket(evt.x), b2 = this.getBucketY(evt.y);
            if (b1 >= 0) {
                var bkt1 = this.buckets[b1];
                if (b2 >= 0) {
                    var bkt2 = this.bucketsY[b2];
                    $.publish("/PivotViewer/Views/Item/Filtered", [[
                        { category: this.sortCategory, min: bkt1.startRange, max: bkt1.endRange, values: bkt1.values },
                        { category: this.sortCategory2, min: bkt2.startRange, max: bkt2.endRange, values: bkt2.values }
                    ]]);
                }
                else $.publish("/PivotViewer/Views/Item/Filtered", [{category: this.sortCategory, min: bkt1.startRange, max: bkt1.endRange, values: bkt1.values}]);
            }
            else if (b2 >= 0) {
                var bkt2 = this.bucketsY[b2];
                $.publish("/PivotViewer/Views/Item/Filtered", [{category: this.sortCategory2, min: bkt2.startRange, max: bkt2.endRange, values: bkt2.values}]);
            }
        }
        $.publish("/PivotViewer/Views/Item/Selected", [{ item: tile }]);
    },
    handleContextMenu: function (evt) {
        var bktNumX = this.getBucket(evt.x), bktNumY = this.getBucketY(evt.y);
        var bkt = $(".pv-crosstabview-overlay-bucket").eq(bktNumX * this.bucketsY.length + (this.bucketsY.length - bktNumY - 1));
        if (this.addSubset(this.buckets[bktNumX].subBuckets[bktNumY])) bkt.addClass("pv-bucketview-subset");
        else bkt.removeClass("pv-bucketview-subset");
    },
});
