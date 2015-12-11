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

PivotViewer.Utils.loadScript("src/views/crosstabview.min.js");
PivotViewer.Utils.loadScript("src/views/iv.min.js");

PivotViewer.Views.QcaView = PivotViewer.Views.CrosstabView.subClass({
    init: function () {
        this._super();
        this.singleEq = false;
        var that = this;
        $.subscribe("/PivotViewer/Views/IVFiltered", function (evt) { that.filtered = true; that.activate();});
    },
    filterY: function () { this.subbucketize(); },
    bucketize: function (filterList, sortCategory, bkt2) {
        var iv = IV.getIV();
        if (iv == null) return null;

        var category = PivotCollection.getCategoryByName(sortCategory);

        var newBkts = []; newBkts.ids = [];
        newBkts[0] = new PivotViewer.Models.Bucket("", "True Positive");
        newBkts[1] = new PivotViewer.Models.Bucket("", "False Positive");
        if (this.singleEq) {
            newBkts[2] = new PivotViewer.Models.Bucket("", "True Negative");
            newBkts[3] = new PivotViewer.Models.Bucket("", "False Negative");
        }
        for (var i = 0; i < newBkts.length; i++) {
            newBkts[i].colCount = 0;
            newBkts[i].subBuckets = [];
            newBkts[i].subBuckets.ids = [];
        }

        if (this.singleEq && bkt2) {
            for (i = 0; i < newBkts.length; i++) {
                newBkts[i].subBuckets[0] = new PivotViewer.Models.Bucket(bkt2.startRange, bkt2.startLabel);
            }

            bkt2.tiles = []; bkt2.ids = [];
            for (i = 0; i < this.filterList.length; i++) {
                var tile = this.filterList[i], bkt, j;

                bkt2.addTile(tile);
                if (bkt2 == this.bucketsY[this.bucketsY.ids[tile.item.id]]) {
                    if (bkt2.oldBkt.ids[tile.item.id]) j = 0;
                    else j = 1;
                }
                else if (bkt2.oldBkt.ids[tile.item.id]) j = 3;
                else j = 2

                bkt = newBkts[j];
                bkt.addTile(tile);
                bkt.colCount++;
                newBkts.ids[tile.item.id] = j;

                bkt.subBuckets[0].addTile(tile);
                bkt.subBuckets.ids[tile.item.id] = 0;

                this.bucketsY.ids[tile.item.id] = 0;
            }
            var ids = this.bucketsY.ids;
            this.bucketsY = [bkt2];
            this.bucketsY.ids = ids;
        }
        else {
            var buckets = this._super(filterList, sortCategory), combos = [];

            this.contribd = [], this.contribn = [];

            for (i = 0; i < buckets.length; i++) {
                buckets[i].order = i;
                combos[i] = [];
                this.contribn[i] = [];
                if (iv.categories.length == 0) combos[i][1] = 0;
                else for (j = 0; j < (1 << iv.categories.length) ; j++) combos[i][j] = 0;
            }

            var definedList = [];
            for (i = 0; i < filterList.length; i++) {
                var tile = filterList[i], dvalues = tile.item.getFacetByName(category.name);
                if (dvalues == undefined) continue;

                if (iv.categories.length == 0) tile.bits = 1;
                else {
                    var bits = 0;
                    for (var j = 0; j < iv.categories.length; j++) {
                        var ivcat = iv.categories[j];
                        var ivalues = tile.item.getFacetByName(ivcat.name);
                        if (ivalues == undefined) break;
                        ivalue = ivalues.values[0].value;
                        if (ivcat.isString()) {
                            if (iv.values[j][ivalue]) bits |= (1 << j);
                        }
                        else if (iv.values[j][0] <= ivalue && iv.values[j][1] >= ivalue) bits |= (1 << j);
                    }
                    if (j < iv.categories.length) continue;
                    tile.bits = bits;
                }

                var bkt = buckets.ids[tile.item.id];

                var dvalue = dvalues.values[0].value;
                combos[bkt][tile.bits]++;
                
                if (iv.categories.length == 0) { this.contribn[bkt]["a"]++; this.contribd["a"]++;}
                else for (j = 0; j < iv.categories.length; j++) {
                    var k = "";
                    if (j < iv.categories.length - 1) k += (tile.bits >> (j + 1));
                    k += "a";
                    if(j > 0) k += (tile.bits % (1 << j));
                    if (this.contribn[bkt][k] == undefined) {
                        this.contribn[bkt][k] = 0;
                        if (this.contribd[k] == undefined) this.contribd[k] = 0;
                    }
                    this.contribn[bkt][k]++;
                    this.contribd[k]++;
                }
                definedList.push(tile);
            }
            this.filterList2 = this.filterList = definedList;

            this.bucketsY = []; this.bucketsY.ids = [];
            var equations = [], tpcount = [];

            if (iv.categories.length == 0) tpcount[1] = 0;
            else for (i = 0; i < (1 << iv.categories.length) ; i++) tpcount[i] = 0;
            for (i = 0; i < buckets.length; i++) {
                if (combos[i] == undefined) continue;
                var bkt = buckets[i];
                if (iv.categories.length == 0) {
                    if (combos[i][1] > tpcount[1]) {
                        tpcount[1] = combos[i][1];
                        equations[1] = bkt;
                    }
                }
                else for (j = 0; j < (1 << iv.categories.length) ; j++) {
                    var count = combos[i][j];
                    if (count > tpcount[j]) {
                        tpcount[j] = count;
                        equations[j] = bkt;
                    }
                }
            }

            var equations2 = []
            for (i = 0, order = 0; i < equations.length; i++) {
                if (equations[i] == undefined) continue;
                var newBkt = new PivotViewer.Models.Bucket(null, null);
                newBkt.oldBkt = equations[i];
                newBkt.order = order++;
                newBkt.eq = i;

                this.bucketsY.push(newBkt);
                equations2[i] = newBkt;
            }


            for (i = 0; i < newBkts.length; i++) {
                var bkt = newBkts[i];
                for (var j = 0; j < this.bucketsY.length; j++) {
                    var bkt2 = this.bucketsY[j];
                    bkt.subBuckets[j] = new PivotViewer.Models.Bucket(bkt2.startRange, bkt2.startLabel);
                }
            }

            for (i = 0; i < definedList.length; i++) {
                var tile = definedList[i], bkt2 = equations2[tile.bits], bkt, j;

                bkt2.addTile(tile);
                this.bucketsY.ids[tile.item.id] = bkt2.order;
                if (bkt2.oldBkt.ids[tile.item.id]) j = 0;
                else j = 1;

                bkt = newBkts[j];
                newBkts.ids[tile.item.id] = j;
                bkt.addTile(tile);
                bkt.colCount++;

                bkt.subBuckets[bkt2.order].addTile(tile);
                bkt.subBuckets.ids[tile.item.id] = bkt2.order;
            }

            for (i = 0; i < this.bucketsY.length; i++) {
                var bkt2 = this.bucketsY[i];
                var label = "";
                if (iv.categories.length == 0) label += '\u2205'
                else for (j = 0; j < iv.categories.length; j++) {
                    label += ((bkt2.eq >> j) & 1 ? "" : "~") + iv.categories[j].ivCode + (j < iv.categories.length - 1 ? " ^ " : "");
                }
                label += "<br>&#8594; " + this.sortCategory + ": (" + bkt2.oldBkt.getLabel() + ")";
                bkt2.startLabel = bkt2.endLabel = label;
            }
        }

        return newBkts;
    },
    activate: function() {
        IV.on();
        if (this.filtered) this.singleEq = false;
        this._super();
        $("#pv-altsortcontrols").hide();
    },
    deactivate: function() {
        IV.off();
        this.singleEq = false;
        this._super();
        this.filtered = true;
    },
    getViewName: function () { return "QCA View"; },
    getStatsBox: function() {
        return "<div style='position:absolute; width: " + (this.columnWidth - 4) + "px; height: 50px; top: " +
            (i * this.rowHeight) + "px;'><div style='text-align:center'>Equations</div><div style='position:absolute; right:2px;'>" +
            "Result</div></div>";
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

        var box, bkt, tooltip;
        if (bktNumX < -1 || bktNumY < -1) return;
        else if (bktNumX == -1) {
            if (bktNumY == -1) return;
            box = $(".pv-bucketview-overlay-buckettitle-left").eq(bktNumY);
            bkt = this.bucketsY[bktNumY];
            tooltip = "Dependent Variable: " + this.sortCategory + "<br>Predicted Values: ";
            if (bkt.oldBkt.values.length > 0) {
                tooltip += bkt.oldBkt.values[0];
                for (var i = 1; i < bkt.oldBkt.values.length; i++) tooltip += ", " + bkt.oldBkt.values[i];
            }
            else tooltip += "from " + bkt.oldBkt.startLabel + " (inclusive) to " + bkt.oldBkt.endLabel + " (exclusive)";

            tooltip += "<br><br>Independent Variables:<br>"

            var iv = IV.getIV();
            for (i = 0; i < iv.categories.length; i++) {
                var j = "";
                if (i < iv.categories.length - 1) j += (bkt.eq >> (i + 1));
                j += "a";
                if (i > 0) j += (bkt.eq % (1 << i));
                var contrib = this.buckets[0].subBuckets[bktNumY].tiles.length / bkt.tiles.length;
                if (iv.categories.length > 1) contrib -= this.contribn[bkt.oldBkt.order][j] / this.contribd[j];
                else contrib -= bkt.oldBkt.tiles.length / this.filterList.length;
                contrib = Math.floor(contrib * 100);

                var category = iv.categories[i], values = iv.values[i];
                tooltip += category.ivCode;
                if (category.ivCode != '\u2205') {
                    tooltip += ". " + category.name + ((bkt.eq >> i) & 1 ? " (true)" : " (false)")  + "<br>Defined True Values: ";
                    if (category.isNumber() || category.isOrdinal()) tooltip += "from " + values[0] + " (inclusive) to " + values[1] + " (exclusive)";
                    else {
                        tooltip += values[0];
                        for (var k = 1; k < values.length; k++) tooltip += ", " + values[k];
                    }
                    tooltip += "<br>Adjusts Prediction Accuracy by: " + contrib + "%";
                }
                else tooltip += " (No Independent Variables Selected)";
                if (i < iv.categories.length - 1) tooltip += "<br><br>";
            }
        }
        else if (bktNumY == -1) {
            box = $(".pv-bucketview-overlay-buckettitle").eq(bktNumX);
            if (bktNumX == 0) tooltip = "Items that match the characteristics described by the independent variables<br>and for which the dependent variable has been correctly predicted.";
            else if (bktNumX == 1) tooltip = "Items that match the characteristics described by the independent variables<br>but for which the dependent variable has been incorrectly predicted.";
            else if (bktNumX == 2) tooltip = "Items that do not match the characteristics<br>described by the independent variables<br>and for which the value of the dependent variable<br>correctly does not match the given value.";
            else if (bktNumX == 3) tooltip = "Items that do not match the characteristics<br>described by the independent variables<br>but for which the value of the dependent variables<br>incorrectly does match the given value.";
        }
        else return;

        var offset = box.offset();
        tooltip = "<div class='pv-tooltip'>" + tooltip + "</div>";
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
            if(this.singleEq) {
                this.singleEq = false;
                this.buckets = this.bucketize(this.filterList, this.sortCategory);
            }
            else {
                var b2 = this.getBucketY(evt.y);
                if (b2 >= 0) {
                    this.singleEq = true;
                    this.buckets = this.bucketize(this.filterList, this.sortCategory, this.bucketsY[b2]);
                }
            }
            this.activate();
        }
        $.publish("/PivotViewer/Views/Item/Selected", [{ item: tile }]);
    }
});
