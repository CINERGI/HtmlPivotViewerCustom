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
PivotViewer.Models.Loaders.CSVLoaderSimpleImage = PivotViewer.Models.Loaders.CSVLoader.subClass({
    init: function (CSVUri, proxy, baseUrl) {
        this.CSVUriNoProxy = CSVUri;
        if (proxy) this.CSVUri = proxy + CSVUri;
        else this.CSVUri = CSVUri;
        if (baseUrl) this.baseUrl = baseUrl;
    },
    loadCollection: function (collection) {
        this.collection = collection;
        //this._super(collection);


        var cl = window.location;
        if (this.baseUrl) {
            collection.imageBase = this.baseUrl;
        } else
           {
        var basepath = location.pathname.substring(0, location.pathname.lastIndexOf("/") + 1);
        collection.imageBase = cl.protocol + "//" + cl.host + basepath + 'projects/images';
        }
    
        // "http://localhost:62026/projects/images";
        collection.brandImage = "";

        var that = this;
        if (this.CSVUri.endsWith(".zip")) {
            jBinary.loadData(this.CSVUri).then(function (binary) {
                var zip = new JSZip();
                zip.load(binary);
                that.data = zip.file(/.csv/)[0].asText().csvToArray();
                that.loadData();
            });
        }
        else {
            $.ajax({
                type: "GET",
                url: this.CSVUri,
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
                    setTimeout(function() { window.open("#pv-loading-error", "_self") }, 1000);
                }
            });
        }
    },
    //loadData: function () {
    //    var categories = this.data[0];
    //    var name_column = -1, img_column = -1, index, type, href_column = -1;
    //    for (var i = 0; i < categories.length; i++) {
    //        var SearchVisible = true, isDataVisible = true; isMultipleItems = false;
    //        if (categories[i].charAt(0) == "#") {
    //            if (categories[i] == "#name") name_column = i;
    //            else if (categories[i] == "#img") img_column = i;
    //            else if (categories[i] == "#href") href_column = i;
    //            continue;
    //        }
    //        else if ((index = categories[i].indexOf("#")) !== -1) {
    //            if (categories[i].indexOf("#number", index) !== -1)
    //                type = PivotViewer.Models.FacetType.Number;
    //            else if (categories[i].indexOf("#date", index) !== -1)
    //                type = PivotViewer.Models.FacetType.DateTime;
    //            else if (categories[i].indexOf("#ordinal", index) !== -1)
    //                type = PivotViewer.Models.FacetType.Ordinal;
    //            else if (categories[i].indexOf("#info", index) !== -1) {
    //                type = PivotViewer.Models.FacetType.String;
    //                SearchVisible = false;
    //            } else if (categories[i].indexOf("#hide", index) !== -1) {
    //                SearchVisible = false;
    //                isDataVisible = false;
    //                type = PivotViewer.Models.FacetType.String;
    //            }
    //            else if (categories[i].indexOf("#link", index) !== -1 || categories[i].indexOf("#href", index) !== -1) {
    //                type = PivotViewer.Models.FacetType.Link;
    //                SearchVisible = false;
    //            } else if (categories[i].indexOf("#multi", index) !== -1) {
    //                isMultipleItems = true;
    //                type = PivotViewer.Models.FacetType.String;
    //            } else type = PivotViewer.Models.FacetType.String;
    //        }
    //        else {
    //            type = PivotViewer.Models.FacetType.String;
    //            index = categories[i].length;
    //        }
    //        //  var category = new PivotViewer.Models.FacetCategory(categories[i].substring(0, index), null, type, true, true, true);
    //        var category = new PivotViewer.Models.FacetCategory(categories[i].substring(0, index), null, type, SearchVisible, isDataVisible, false);

    //        //if (infoOnly) {
    //        //    category = new PivotViewer.Models.FacetCategory(categories[i].substring(0, index), null, type, false, isDataVisible, false);
    //        //} else {
    //        //    category = new PivotViewer.Models.FacetCategory(categories[i].substring(0, index), null, type, true, true, true);
    //        //}
    //        category.column = i;
    //        category.isMultipleItems = isMultipleItems;
    //        this.collection.FacetCategories.push(category);
    //    }

    //    //Items
    //    for (var i = 1; i < this.data.length; i++) {
    //        var row = this.data[i];
    //        var item = new PivotViewer.Models.Item(row[img_column].trim(), String(i), row[href_column], row[name_column]);
    //        this.collection.Items.push(item);
    //    }
    //    $.publish("/PivotViewer/Models/Collection/Loaded", null);
    //},
    //LoadColumn: function (category) {
    //    for (var i = 0; i < this.collection.Items.length; i++) {
    //        var item = this.collection.Items[i], raw = this.data[i + 1][category.column];
    //        if (raw.trim() == "") continue;
    //        var f = new PivotViewer.Models.Facet(category.Name);
    //        if (category.Type == PivotViewer.Models.FacetType.String) {
    //            //f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
    //            if (category.isMultipleItems == true) {
    //                var split = raw.split(',');
    //                for (var sp = 0 ; sp < split.length; sp++) {
    //                    f.AddFacetValue(new PivotViewer.Models.FacetValue(split[sp].trim()));
    //                }
    //            }
    //            else {
    //                f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
    //            }

    //        } else if (category.Type == PivotViewer.Models.FacetType.Link) {
    //            // need to explicity set the value
    //            var fv = new PivotViewer.Models.FacetValue(raw, raw);
    //            fv.Href = raw;
    //            f.AddFacetValue(fv);
    //        }
    //        else if (category.Type == PivotViewer.Models.FacetType.Number || category.Type == PivotViewer.Models.FacetType.Ordinal)
    //            f.AddFacetValue(new PivotViewer.Models.FacetValue(parseFloat(raw.replace(/,/g, "").match(/(?:-?\d+\.?\d*)|(?:-?\d*\.?\d+)/)[0]), raw));
    //        else if (category.Type == PivotViewer.Models.FacetType.DateTime ) {
    //            var m = moment(raw);
    //            if ( m.isValid() ) {
    //                f.AddFacetValue(new PivotViewer.Models.FacetValue(moment(raw, moment.parseFormat(raw))._d.toString(), raw));
    //            } else {
    //                console.warn( 'bad date:' & raw);
    //            }
    //        }
    //         if (!category.IsFilterVisible) {
    //            f.Href = null;
    //        }
    //        item.Facets.push(f);
    //    }
    //},
    //GetRow: function (id) {
    //    var row = this.data[id], facets = [];
    //    for (var i = 0; i < this.collection.FacetCategories.length; i++) {
    //        var category = this.collection.FacetCategories[i];
    //        raw = row[category.column];
    //        if (raw.trim() == "") continue;
    //        var f = new PivotViewer.Models.Facet(category.Name);
    //        if (category.Type == PivotViewer.Models.FacetType.String) {
    //            //f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
    //            if (category.isMultipleItems == true) {
    //                var split = raw.split(',');
    //                for (var sp = 0 ; sp < split.length; sp++) {
    //                    f.AddFacetValue(new PivotViewer.Models.FacetValue(split[sp].trim()));
    //                }
    //            }
    //            else {
    //                f.AddFacetValue(new PivotViewer.Models.FacetValue(raw));
    //            }

    //        } else if (category.Type == PivotViewer.Models.FacetType.Link) {
    //            // need to explicity set the value
    //            var fv = new PivotViewer.Models.FacetValue(raw, raw);
    //            fv.Href = raw;
    //            f.AddFacetValue(fv);
    //        }
    //        else if (category.Type == PivotViewer.Models.FacetType.Number || category.Type == PivotViewer.Models.FacetType.Ordinal)
    //            f.AddFacetValue(new PivotViewer.Models.FacetValue(parseFloat(raw.replace(/,/g, "").match(/(?:-?\d+\.?\d*)|(?:-?\d*\.?\d+)/)[0]), raw));
    //        else if (category.Type == PivotViewer.Models.FacetType.DateTime)
    //            {
    //                var m = moment(raw);
    //                if (m.isValid()) {
    //                    f.AddFacetValue(new PivotViewer.Models.FacetValue(moment(raw, moment.parseFormat(raw))._d.toString(), raw));
    //                } else {
    //                    console.warn('bad date:' & raw);
    //                }
    //        }
    //        if (!category.IsFilterVisible) {
    //            f.Href = null;
    //        }
    //        facets.push(f);
    //    }
    //    return facets;
    //}
});
