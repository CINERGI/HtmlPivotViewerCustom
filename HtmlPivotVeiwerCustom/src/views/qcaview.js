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
        $.subscribe("/PivotViewer/Views/IVFiltered", function (evt) {
            that.filter();
            that.activate();
        });
    },
    bucketize: function (filterList, sort, bkt2) {
        var iv = IV.getIV();
        if (iv == null) return null;

        var category = PivotCollection.getCategoryByName(sort);

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
                if (bkt2 == this.buckets2[this.buckets2.ids[tile.item.id]]) {
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

                this.buckets2.ids[tile.item.id] = 0;
            }
            var ids = this.buckets2.ids;
            this.buckets2 = [bkt2];
            this.buckets2.ids = ids;
        }
        else {
            var buckets = this.__proto__.__proto__.__proto__.bucketize(filterList, sort);

            var contribd = [], contribn = [], combos = [];

            for (i = 0; i < buckets.length; i++) {
                buckets[i].order = i;
                combos[i] = [];
                contribn[i] = [];
                for (j = 0; j < (1 << iv.categories.length) ; j++) combos[i][j] = 0;
            }

            var definedList = [];
            for (i = 0; i < filterList.length; i++) {
                var tile = filterList[i], bits = 0;
                var dvalues = tile.item.getFacetByName(category.name);
                if (dvalues == undefined) continue;

                for (var j = 0; j < iv.categories.length; j++) {
                    var ivcat = iv.categories[j];
                    var ivalues = tile.item.getFacetByName(ivcat.name);
                    if (ivalues == undefined) break;
                    ivalue = ivalues.values[0].value;
                    if (ivcat.type == PivotViewer.Models.FacetType.String) {
                        if (iv.values[j][ivalue]) bits |= (1 << j);
                    }
                    else if (ivcat.type == PivotViewer.Models.FacetType.DateTime) { }
                    else {
                        var s = iv.values[j];
                        if (s.slider("values", 0) <= ivalue && s.slider("values", 1) >= ivalue) bits |= (1 << j);
                    }
                }
                if (j < iv.categories.length) continue;
                tile.bits = bits;

                var bkt = buckets.ids[tile.item.id];

                var dvalue = dvalues.values[0].value;
                combos[bkt][bits]++;
                
                for (j = 0; j < iv.categories.length; j++) {
                    var k = "";
                    if (j < iv.categories.length - 1) k += (tile.bits >> (j + 1));
                    k += "a";
                    if(j > 0) k += (tile.bits % (1 << j));
                    if (contribn[bkt][k] == undefined) {
                        contribn[bkt][k] = 0;
                        if (contribd[k] == undefined) contribd[k] = 0;
                    }
                    contribn[bkt][k]++;
                    contribd[k]++;
                }
                definedList.push(tile);
            }
            this.filterList2 = this.filterList = definedList;

            this.buckets2 = []; this.buckets2.ids = [];
            var equations = [], tpcount = [];
            for (i = 0; i < (1 << iv.categories.length) ; i++) tpcount[i] = 0;
            for (i = 0; i < buckets.length; i++) {
                if (combos[i] == undefined) continue;
                var bkt = buckets[i];
                for (j = 0; j < (1 << iv.categories.length) ; j++) {
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

                this.buckets2.push(newBkt);
                equations2[i] = newBkt;
            }


            for (i = 0; i < newBkts.length; i++) {
                var bkt = newBkts[i];
                for (var j = 0; j < this.buckets2.length; j++) {
                    var bkt2 = this.buckets2[j];
                    bkt.subBuckets[j] = new PivotViewer.Models.Bucket(bkt2.startRange, bkt2.startLabel);
                }
            }

            for (i = 0; i < definedList.length; i++) {
                var tile = definedList[i], bkt2 = equations2[tile.bits], bkt, j;

                bkt2.addTile(tile);
                this.buckets2.ids[tile.item.id] = bkt2.order;
                if (bkt2.oldBkt.ids[tile.item.id]) j = 0;
                else j = 1;

                bkt = newBkts[j];
                newBkts.ids[tile.item.id] = j;
                bkt.addTile(tile);
                bkt.colCount++;

                bkt.subBuckets[bkt2.order].addTile(tile);
                bkt.subBuckets.ids[tile.item.id] = bkt2.order;
            }

            for (i = 0; i < this.buckets2.length; i++) {
                var bkt2 = this.buckets2[i];
                var label = "";
                for (j = 0; j < iv.categories.length; j++) {
                    var k = "";
                    if (j < iv.categories.length - 1) k += (tile.bits >> (j + 1));
                    k += "a";
                    if (j > 0) k += (tile.bits % (1 << j));
                    var contrib = newBkts[0].subBuckets[i].tiles.length / bkt2.tiles.length;
                    if (iv.categories.length > 1) contrib -= contribn[bkt2.oldBkt.order][k] / contribd[k];
                    else contrib -= bkt2.oldBkt.tiles.length / definedList.length;
                    contrib = Math.floor(contrib * 100);
                    label += ((bkt2.eq >> j) & 1 ? "(" : "~(") + iv.categories[j].name + ") [" + (contrib > 0 ? "+" : "") + contrib + "%]" + (j < iv.categories.length - 1 ? " ^ " : "");
                }
                label += "<br>&#8594; " + this.sortFacet + ": (" + bkt2.oldBkt.getLabel() + ")";
                bkt2.startLabel = bkt2.endLabel = label;
            }
        }

        return newBkts;
    },
    activate: function() {
        IV.on();
        this._super();
        $("#pv-altsortcontrols").hide();
    },
    deactivate: function() {
        IV.off();
        this.singleEq = false;
        this._super();
        this.filtered = true;
    },
    filter: function (tiles, filterList, sortFacet, bkt2) {
        if(sortFacet) this.sortFacet = sortFacet;
        if(tiles) this.tiles = tiles;
        if(filterList) this.filterList2 = this.filterList = filterList;
        if(!bkt2) this.singleEq = false;
        this.buckets = this.bucketize(this.filterList, this.sortFacet, bkt2);
        this.filtered = false;
    },
    getViewName: function () { return "QCA View"; },
    getStatsBox: function() {
        return "<div style='position:absolute; width: " + (this.columnWidth - 4) + "px; height: 50px; top: " +
            (i * this.rowHeight) + "px;'><div style='text-align:center'>Equations</div><div style='position:absolute; right:2px;'>" +
            "Result</div></div></div>";
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
            if(this.singleEq) {
                this.singleEq = false;
                this.filter();
            }
            else {
                var b2 = this.getBucket2(clickY);
                if (b2 >= 0) {
                    this.singleEq = true;
                    this.filter(this.tiles, this.filterList, this.sortFacet, this.buckets2[b2]);
                }
            }
            this.activate();
        }
    }
});
