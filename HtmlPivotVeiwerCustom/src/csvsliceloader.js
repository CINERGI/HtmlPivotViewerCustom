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

//CSV loader
PivotViewer.Models.Loaders.CSVSliceLoader = PivotViewer.Models.Loaders.CSVLoader.subClass({
    init: function (CSVUri, sliceSize) {
        this._super(CSVUri);
        this.sliceSize = sliceSize;
    },
    LoadCollection: function (collection) {
        this.collection = collection;
        collection.CollectionBaseNoProxy = this.CSVUriNoProxy;
        collection.CollectionBase = this.CSVUri;

        var filename = collection.CollectionBase;
        var project = filename.substring(filename.lastIndexOf("/") + 1, filename.lastIndexOf("."));
        collection.CollectionName = project;
        collection.ImageBase = project + "/" + project + ".dzc";
        collection.BrandImage = "";

        var that = this; this.data = []; this.slicesLoaded = []; this.currentColSlice = 0; this.currentRowSlice = -1; this.rowSlices = [];
        this.lock = false; this.loading = true;
        $.ajax({
            type: "GET",
            url: "projects/" + project + ".axis1.csv",
            dataType: "text",
            success: function (csv) {
                that.axis1 = csv.csvToArray();
                $.ajax({
                    type: "GET",
                    url: "projects/" + project + ".axis2.csv",
                    dataType: "text",
                    success: function (csv) {
                        that.axis2 = csv.csvToArray();
                        that.LoadData();
                    }
                });
            }
        });
    },
    LoadData: function () {
        var index, type;
        for (var i = 0; i < this.axis1[0].length; i++) {
            if ((index = this.axis1[0][i].indexOf("#")) !== -1) {
                if (this.axis1[0][i].indexOf("#number", index) !== -1)
                    type = PivotViewer.Models.FacetType.Number;
                else if (this.axis1[0][i].indexOf("#date", index) !== -1)
                    type = PivotViewer.Models.FacetType.DateTime;
                else if (this.axis1[0][i].indexOf("#ordinal", index) !== -1)
                    type = PivotViewer.Models.FacetType.Ordinal;
                else type = PivotViewer.Models.FacetType.String;
            }
            else {
                type = PivotViewer.Models.FacetType.String;
                index = this.axis1[0][i].length;
            }
            var category = new PivotViewer.Models.FacetCategory(this.axis1[0][i].substring(0, index), null, type, true, true, true);
            category.column = i;
            this.collection.FacetCategories.push(category);
        }

        //Items
        for (var i = 1; i < this.axis2.length; i++) {
            var row = this.axis2[i];
            var item = new PivotViewer.Models.Item(row[0], String(i), "", row[1]);
            this.collection.Items.push(item);
        }
        this.numSlices = Math.ceil(this.axis1[0].length / this.sliceSize);
        this.sliceThread = setInterval(this.LoadSlice, 200, this);
        $.publish("/PivotViewer/Models/Collection/Loaded", null);
    },
    LoadSlice: function (that) {
        if (that.lock) return;
        else if (that.mustLoad != null) {
            that.lock = true;
            LoadSem.acquire(function (release) {
                $.ajax({
                    type: "GET",
                    url: "projects/" + that.collection.CollectionName + (that.mustLoad.type == "COL" ? ".col" : ".row") + that.mustLoad.slice + ".csv",
                    dataType: "text",
                    success: function (csv) {
                        var newData = csv.csvToArray();
                        if (that.mustLoad.type == "COL") {
                            for (var i = 0, j = that.mustLoad.slice * that.sliceSize; i < newData.length && j < that.collection.FacetCategories.length; i++, j++) {
                                that.data[j] = newData[i];
                                that.slicesLoaded[j] = true;
                            }
                        }
                        else {
                            that.rowSlices = newData;
                            that.currentRowSlice = that.mustLoadSlice.slice;
                        }
                        that.mustLoad = null;
                        that.lock = false;
                        release();
                    }
                });
            });
        }
        else {
            if (that.currentColSlice == that.numSlices) {
                window.clearInterval(that.sliceThread);
                that.loading = false;
                return;
            }
            that.lock = true;
            var that = that;
            $.ajax({
                type: "GET",
                url: "projects/" + that.collection.CollectionName + ".col" + that.currentColSlice + ".csv",
                datatype: "text",
                success: function (csv) {
                    var newData = csv.csvToArray();
                    for (var i = 0, j = that.currentColSlice * that.sliceSize; i < newData.length && j < that.collection.FacetCategories.length; i++, j++) {
                        that.data[j] = newData[i];
                        that.slicesLoaded[j] = true;
                    }
                    that.currentColSlice++;
                    that.lock = false;
                }
            });
        }
    },
    RequestRow: function(row) {
        this.mustLoad = { slice: Math.floor(row / this.sliceSize), type: "ROW" };
        this.LoadSlice(this);
    },
    RequestColumn: function(col) {
        var slice = Math.floor(col / this.sliceSize);
        if (this.slicesLoaded[slice]) return;
        this.mustLoad = { slice: slice, type: "COL" };
        this.LoadSlice(this);
    },
    LoadColumn: function (category) {
        if (!this.slicesLoaded[category.column]) this.RequestColumn(category.column);
        var that = this;
        LoadSem.acquire(function (release) {
            for (var i = 0; i < that.collection.Items.length; i++) {
                var item = that.collection.Items[i], raw = that.data[category.column][i];
                if (raw.trim() == "") continue;
                var f = new PivotViewer.Models.Facet(category.Name);
                if (category.Type == PivotViewer.Models.FacetType.String)
                    f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
                else if (category.Type == PivotViewer.Models.FacetType.Number || category.Type == PivotViewer.Models.FacetType.Ordinal)
                    f.AddFacetValue(new PivotViewer.Models.FacetValue(parseFloat(raw.replace(/,/g, "").match(/(?:-?\d+\.?\d*)|(?:-?\d*\.?\d+)/)[0]), raw));
                else if (category.Type == PivotViewer.Models.FacetType.DateTime)
                    f.AddFacetValue(new PivotViewer.Models.FacetValue(moment(raw, moment.parseFormat(raw))._d.toString(), raw));
                item.Facets.push(f);
            }
            release();
        });
    },
    GetRow: function (id) {
        var row, data, facets = [];
        if (this.loading) {
            var slice = Math.floor(id / this.sliceSize);
            if (slice != this.currentRowSlice) this.RequestRow(id);
            row = id % sliceSize; data = this.rowSlices;
        }
        else { row = id; data = this.data; }
        var that = this;
        LoadSem.acquire(function (release) {
            for (var i = 0; i < that.collection.FacetCategories.length; i++) {
                var category = that.collection.FacetCategories[i], raw = data[i][row];
                if (raw.trim() == "") continue;
                var f = new PivotViewer.Models.Facet(category.Name);
                if (category.Type == PivotViewer.Models.FacetType.String)
                    f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
                else if (category.Type == PivotViewer.Models.FacetType.Number || category.Type == PivotViewer.Models.FacetType.Ordinal)
                    f.AddFacetValue(new PivotViewer.Models.FacetValue(parseFloat(raw.replace(/,/g, "").match(/(?:-?\d+\.?\d*)|(?:-?\d*\.?\d+)/)[0]), raw));
                else if (category.Type == PivotViewer.Models.FacetType.DateTime)
                    f.AddFacetValue(new PivotViewer.Models.FacetValue(moment(raw, moment.parseFormat(raw))._d.toString(), raw));
                facets.push(f);
            }
            release();
            
        });
        return facets; //
    }
});
