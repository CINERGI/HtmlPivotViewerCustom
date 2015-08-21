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
    init: function (CSVUri, proxy) {
        this.CSVUriNoProxy = CSVUri;
        if (proxy) this.CSVUri = proxy + CSVUri;
        else this.CSVUri = CSVUri;
    },
    LoadCollection: function (collection) {
        this.collection = collection;
        this.collection.config = {};
        this._super(collection);

        collection.CollectionBaseNoProxy = this.CSVUriNoProxy;
        collection.CollectionBase = this.CSVUri;
        var filename = collection.CollectionBase;
        var project = filename.substring(filename.lastIndexOf("/") + 1, filename.lastIndexOf("."));
        collection.CollectionName = project;
        //collection.ImageBase = project + "/" + project + ".dzc";
        var cl = window.location;
        var basepath = location.pathname.substring(0, location.pathname.lastIndexOf("/") + 1);
        collection.ImageBase = cl.protocol + "//" + cl.host + basepath + 'projects/images';
        // "http://localhost:62026/projects/images";
        collection.BrandImage = "";

        var that = this;
        if (this.CSVUri.endsWith(".zip")) {
            jBinary.loadData(this.CSVUri).then(function (binary) {
                var zip = new JSZip();
                zip.load(binary);
                that.data = zip.file(/.csv/)[0].asText().csvToArray();
                that.LoadData();
            });
        }
        else {
            $.ajax({
                type: "GET",
                url: this.CSVUri,
                dataType: "text",
                success: function (csv) {
                    Debug.Log('CSV loaded');
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
                    that.LoadData();
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
    LoadData: function () {
        var categories = this.data[0];
        var name_column = -1, img_column = -1, href_column = -1, desc_column=-1;
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

            var index, type, visible = true, SearchVisible = true;
            var isMultipleItems = false, isInfoVisible = true;
            if ((index = categories[i].indexOf("#")) !== -1) {
                if (categories[i].indexOf("#description", index) !== -1) {
                    desc_column = i;
                    continue;
                } else if (categories[i].indexOf("#number", index) !== -1)
                    type = PivotViewer.Models.FacetType.Number;
                else if (categories[i].indexOf("#date", index) !== -1)
                    type = PivotViewer.Models.FacetType.DateTime;
                else if (categories[i].indexOf("#ordinal", index) !== -1)
                    type = PivotViewer.Models.FacetType.Ordinal;
                else if (categories[i].indexOf("#long", index) !== -1) {
                    type = PivotViewer.Models.FacetType.LongString;
                    SearchVisible = true;
                    visible = false;
                }
                else if (categories[i].indexOf("#info", index) !== -1) {
                    type = PivotViewer.Models.FacetType.LongString;
                    SearchVisible = true;
                    visible = false;
                } else if (categories[i].indexOf("#hide", index) !== -1) {
                    SearchVisible = false;
                    isInfoVisible = false; // hide from details panel, too
                    type = PivotViewer.Models.FacetType.String;
                    visible = false;
                }
                else if (categories[i].indexOf("#link", index) !== -1 || categories[i].indexOf("#href", index) !== -1) {
                    type = PivotViewer.Models.FacetType.Link;
                    SearchVisible = false;
                    visible = false;
                } else if (categories[i].indexOf("#multi", index) !== -1) {
                    isMultipleItems = true;
                    type = PivotViewer.Models.FacetType.String;
                } else type = PivotViewer.Models.FacetType.String;
                if (categories[i].indexOf("#hidden") !== -1) visible = false;
            }
            else {
                type = PivotViewer.Models.FacetType.String;
                index = categories[i].length;
            }
            var category = new PivotViewer.Models.FacetCategory(categories[i].substring(0, index), type, visible, isInfoVisible, SearchVisible);
            category.column = i;
            category.isMultipleItems = isMultipleItems;

            this.collection.FacetCategories.push(category);
        }

        //Items
        for (var i = 1; i < this.data.length; i++) {
            var row = this.data[i];
            var item = new PivotViewer.Models.Item(row[img_column].trim(), String(i), href_column == -1 ? "" : row[href_column], row[name_column]);
            if (desc_column !== -1) item.Description = row[desc_column];
            this.collection.Items.push(item);
        }
        $.publish("/PivotViewer/Models/Collection/Loaded", null);
    },
    LoadColumn: function (category) {
        var integer = true;
        for (var i = 0; i < this.collection.Items.length; i++) {
            var item = this.collection.Items[i], raw = this.data[i + 1][category.column];
            if (raw.trim() == "") continue;
            var f = new PivotViewer.Models.Facet(category.Name);
            if (category.Type == PivotViewer.Models.FacetType.String) {
                            //f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
                if (category.isMultipleItems == true) {
                    var split;
                    if (raw.indexOf('|') == -1 ) {
                        split = raw.split(',');
                    } else {
                        split = raw.split('|');
                    }
                    
                    for (var sp = 0 ; sp < split.length; sp++) {
                        f.AddFacetValue(new PivotViewer.Models.FacetValue(split[sp].trim()));
                        }
                        }
                        else {
                    f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
                    }

            } else if (category.Type == PivotViewer.Models.FacetType.Link) {
                // need to explicity set the value
                var fv = new PivotViewer.Models.FacetValue(raw, raw);
                    fv.Href = raw;
                    f.AddFacetValue(fv);
            }
            else if (category.Type == PivotViewer.Models.FacetType.Number || category.Type == PivotViewer.Models.FacetType.Ordinal) {
                var value = parseFloat(raw.replace(/,/g, "").match(/(?:-?\d+\.?\d*)|(?:-?\d*\.?\d+)/)[0]);
                f.AddFacetValue(new PivotViewer.Models.FacetValue(value, raw));
                if (value != Math.floor(value)) integer = false;
            }
            else if (category.Type == PivotViewer.Models.FacetType.DateTime)

                // f.AddFacetValue(new PivotViewer.Models.FacetValue(moment(raw, moment.parseFormat(raw))._d.toString(), raw));
            {
                var m = moment(raw);
                if (m.isValid()) {
                    f.AddFacetValue(new PivotViewer.Models.FacetValue(moment(raw, moment.parseFormat(raw))._d.toString(), raw));
                } else {
                    console.warn('bad date:' & raw);
                }
            } else f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
            if (category.Type == PivotViewer.Models.FacetType.Number) category.integer = integer;
            if (!category.IsFilterVisible) {
                f.Href = null;
            }
            item.Facets.push(f);
        }
    },
    GetRow: function (id) {
        var row = this.data[id], facets = [], dIndex;
        var enabledCatagories = EnabledMetadataCategories(settings.disabledCategories);
        for (var n = 0; n < enabledCatagories.length; n++) {
            var index = enabledCatagories[n], category = this.collection.FacetCategories[index], raw = row[category.column];
            if (raw.trim() == "") continue;
            var f = new PivotViewer.Models.Facet(category.Name);
            if (category.Type == PivotViewer.Models.FacetType.Number || category.Type == PivotViewer.Models.FacetType.Ordinal) 
                f.AddFacetValue(new PivotViewer.Models.FacetValue(parseFloat(raw.replace(/,/g, "").match(/(?:-?\d+\.?\d*)|(?:-?\d*\.?\d+)/)[0]), raw));
            else if (category.Type == PivotViewer.Models.FacetType.DateTime)
                f.AddFacetValue(new PivotViewer.Models.FacetValue(moment(raw, moment.parseFormat(raw))._d.toString(), raw));
            else if (category.Type == PivotViewer.Models.FacetType.Link) {
                var value = new PivotViewer.Models.FacetValue(raw);
                value.value = raw;
                value.href = raw;
                f.AddFacetValue(value);
            }
            else f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
            facets.push(f);
        }
        return facets;
    }
});
