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

PivotViewer.Models.Loaders.CSVLoader = PivotViewer.Models.Loaders.ICollectionLoader.subClass({
    init: function (csvUri, proxy) {
        this.csvUriNoProxy = csvUri;
        if (proxy) this.csvUri = proxy + csvUri;
        else this.csvUri = csvUri;
    },
    loadCollection: function (collection) {
        this.collection = collection;
        this.collection.config = {};
        this._super(collection);

        collection.baseNoProxy = this.csvUriNoProxy;
        collection.base = this.csvUri;
        var filename = collection.base;
        var project = filename.substring(filename.lastIndexOf("/") + 1, filename.lastIndexOf("."));
        collection.name = project;
        collection.imageBase = project + "/" + project + ".dzc";
        collection.brandImage = "";

        var that = this;
        if (this.csvUri.endsWith(".zip")) {
            jBinary.loadData(this.csvUri).then(function (binary) {
                var zip = new JSZip();
                zip.load(binary);
                that.data = zip.file(/.csv/)[0].asText().csvToArray();
                that.loadData();
            });
        }
        else {
            $.ajax({
                type: "GET",
                url: this.csvUri,
                dataType: "text",
                success: function (csv) {
                    Debug.log('CSV loaded');
                    that.data = csv.csvToArray();
                    if (that.data.length <= 1) {
                        //Make sure throbber is removed else everyone thinks the app is still running
                        $('.pv-loading').remove();

                        //Display a message so the user knows something is wrong
                        var msg = 'There are no items in the CSV Collection<br><br>';
                        $('.pv-wrapper').append("<div id=\"pv-empty-collection-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
                        setTimeout(function () { window.open("#pv-empty-collection-error", "_self") }, 1000)
                        return;
                    }
                    that.loadData();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    //Make sure throbber is removed else everyone thinks the app is still running
                    $('.pv-loading').remove();

                    //Display a message so the user knows something is wrong
                    var msg = 'Error loading CSV Collection<br><br>';
                    msg += 'URL        : ' + this.url + '<br>';
                    msg += 'Status : ' + jqXHR.status + ' ' + errorThrown + '<br>';
                    msg += 'Details    : ' + jqXHR.responseText + '<br>';
                    msg += '<br>Pivot Viewer cannot continue until this problem is resolved<br>';
                    $('.pv-wrapper').append("<div id=\"pv-loading-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
                    setTimeout(function () { window.open("#pv-loading-error", "_self") }, 1000)
                }
            });
        }
    },
    loadData: function () {
        var categories = this.data[0];
        var name_column = -1, img_column = -1, href_column = -1, desc_column = -1;

        for (var i = 0; i < categories.length; i++) {
            if (categories[i].charAt(0) == "#") {
                if (categories[i] == "#name") name_column = i;
                else if (categories[i] == "#img") img_column = i;
                else if (categories[i] == "#href") href_column = i;
                else if (categories[i] == "#views") {
                    var j = 1;
                    this.collection.config.views = [];
                    while (this.data[j][i] != null && this.data[j][i] != "") this.collection.config.views.push(this.data[j++][i]);
                }
                continue;
            }
            var searchVisible = true; // does it show up in the filter (left panel)
            var isDataVisible = true; // does it show up in the top menu
            var isMetaDataVisible = true; // can you see it at all
            var isMultipleItems = false;
            var index, type, visible = true;
            if ((index = categories[i].indexOf("#")) !== -1) {
                if (categories[i].indexOf("#description", index) !== -1) {
                    desc_column = i;
                    continue;
                } else if (categories[i].indexOf("#name", index) !== -1) {
                    name_column = i;
                    continue;
                } else if (categories[i].indexOf("#href", index) !== -1) {
                    href_column = i;
                    continue;
                } else if (categories[i].indexOf("#number", index) !== -1)
                    type = PivotViewer.Models.FacetType.Number;
                else if (categories[i].indexOf("#date", index) !== -1)
                    type = PivotViewer.Models.FacetType.DateTime;
                else if (categories[i].indexOf("#ordinal", index) !== -1)
                    type = PivotViewer.Models.FacetType.Ordinal;
                else if (categories[i].indexOf("#long", index) !== -1)
                    type = PivotViewer.Models.FacetType.LongString;
                //else if (categories[i].indexOf("#link", index) !== -1) {
                //    type = PivotViewer.Models.FacetType.Link;
                //    visible = false;
                //}
                else if (categories[i].indexOf("#info", index) !== -1) {
                    type = PivotViewer.Models.FacetType.String;
                    searchVisible = false;
                } else if (categories[i].indexOf("#hide", index) !== -1) {
                    searchVisible = false;
                    isMetaDataVisible = false;
                    type = PivotViewer.Models.FacetType.String;
                    visible = false;
                } else if (categories[i].indexOf("#link", index) !== -1 || categories[i].indexOf("#href", index) !== -1) {
                    type = PivotViewer.Models.FacetType.Link;
                    searchVisible = false;
                } else if (categories[i].indexOf("#multi", index) !== -1) {
                    isMultipleItems = true;
                    type = PivotViewer.Models.FacetType.String;
                } else if (categories[i].indexOf("#hidden") !== -1) {
                    searchVisible = false;
                    isMetaDataVisible = false;
                    type = PivotViewer.Models.FacetType.String;
                } // else type = PivotViewer.Models.FacetType.String;

                else {
                    type = PivotViewer.Models.FacetType.String;
                    index = categories[i].length;
                }
            } else {
                type = PivotViewer.Models.FacetType.String; // no #type in name
                index = categories[i].length;
            }
            var category = new PivotViewer.Models.Category(categories[i].substring(0, index), type, searchVisible, isMetaDataVisible, isDataVisible);
            category.column = i;
            category.isMultipleItems = isMultipleItems;
            this.collection.categories.push(category);
        }

        //Items
        for (var i = 1; i < this.data.length; i++) {
            var row = this.data[i];
            var item = new PivotViewer.Models.Item(row[img_column], String(i), href_column == -1 ? "" : row[href_column], row[name_column]);
            if (desc_column !== -1) item.description = row[desc_column];
            this.collection.items.push(item);
        }
        $.publish("/PivotViewer/Models/Collection/Loaded", null);
    },
    loadColumn: function (category) {
        var integer = true;
        for (var i = 0; i < this.collection.items.length; i++) {
            // var item = this.collection.items[i], raw = this.data[i + 1][category.column];
            var item = this.collection.items[i], raw = this.data[i + 1][category.column]; // +1 the header row is skipped
            if (raw.trim() == "") continue;
            var f = new PivotViewer.Models.Facet(category.name);
            if (category.isNumber() || category.isOrdinal()) {
                var value = parseFloat(raw.replace(/,/g, "").match(/(?:-?\d+\.?\d*)|(?:-?\d*\.?\d+)/)[0]);
                f.addValue(new PivotViewer.Models.FacetValue(value, raw));
                if (value != Math.floor(value)) integer = false;
                if (category.isOrdinal()) category.labels[value] = raw;
            }
            else if (category.isDateTime()) {
                //f.addValue(new PivotViewer.Models.FacetValue(moment(raw, moment.parseFormat(raw))._d.toString(), raw));
                var m = moment(raw);
                if (m.isValid()) {
                    f.addValue(new PivotViewer.Models.FacetValue(moment(raw, moment.parseFormat(raw))._d.toString(), raw));
                } else {
                    Debug.log('bad date:' & raw);
                }
            }
            else if (category.isString()) {
                //f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
                if (category.isMultipleItems == true) {
                    var split = raw.split('|');
                    if (split.length < 2) split = raw.split(',');
                    for (var sp = 0 ; sp < split.length; sp++) {
                        f.addValue(new PivotViewer.Models.FacetValue(split[sp].trim()));
                    }
                }
                else {
                    f.addValue(new PivotViewer.Models.FacetValue(raw));
                }

            } else if (category.isLink()) {
                // need to explicity set the value
                var fv = new PivotViewer.Models.FacetValue(raw, raw);
                fv.Href = raw;
                f.addValue(fv);
            } else f.addValue(new PivotViewer.Models.FacetValue(raw));
            if (!category.isFilterVisible) {
                f.href = null;
            }
            item.facets.push(f);
        }

        if (category.isNumber() || category.isOrdinal()) category.integer = integer;
    },
    getRow: function (id) {
        var row = this.data[id], facets = [], dIndex;
        for (var i = 0; i < Settings.visibleCategories.length; i++) {
            var index = Settings.visibleCategories[i], category = this.collection.categories[index], raw = row[category.column];
            if (raw.trim() == "") continue;
            var f = new PivotViewer.Models.Facet(category.name);
            if (category.isString()) {
                //f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
                if (category.isMultipleItems == true) {
                    var split = raw.split('|');
                    if (split.length < 2) split = raw.split(',');
                    for (var sp = 0 ; sp < split.length; sp++) {
                        f.addValue(new PivotViewer.Models.FacetValue(split[sp].trim()));
                    }
                }
                else {
                    f.addValue(new PivotViewer.Models.FacetValue(raw));
                }

            } else if (category.isNumber() || category.isOrdinal())
                f.addValue(new PivotViewer.Models.FacetValue(parseFloat(raw.replace(/,/g, "").match(/(?:-?\d+\.?\d*)|(?:-?\d*\.?\d+)/)[0]), raw));
            else if (category.isDateTime())
                f.addValue(new PivotViewer.Models.FacetValue(moment(raw, moment.parseFormat(raw))._d.toString(), raw));
            else if (category.isLink()) {
                var value = new PivotViewer.Models.FacetValue(raw);
                value.value = raw;
                value.href = raw;
                f.addValue(value);
            }
            else f.addValue(new PivotViewer.Models.FacetValue(raw));
            if (!category.isFilterVisible) {
                f.href = null;
            }
            facets.push(f);
        }
        return facets;
    }
});
