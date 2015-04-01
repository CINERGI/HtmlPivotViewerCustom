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

PivotViewer.Models.Loaders.LocalCSVLoader = PivotViewer.Models.Loaders.CSVLoader.subClass({
    init: function (CSVFile) {
        this.CSVFile = CSVFile;
        this.project = "";
        this.data = [];
    },
    LoadCollection: function (collection) {
        //this._super(collection);

        var that = this;

        var reader = new FileReader();
        reader.onload = function () {
            that.data = reader.result.csvToArray();
            if (that.data.length <= 1) {
                //Make sure throbber is removed else everyone thinks the app is still running
                $('.pv-loading').remove();

                //Display a message so the user knows something is wrong
                var msg = '';
                msg = msg + 'There are no items in the CSV Collection<br><br>';
                $('.pv-wrapper').append("<div id=\"pv-empty-collection-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
                var t = setTimeout(function () { window.open("#pv-empty-collection-error", "_self");}, 1000);
                return;
            }

            $.subscribe("/PivotViewer/Authoring/Completed", function () {
                collection.CollectionName = that.project;
                collection.CollectionBase = "projects/";
                collection.ImageBase = that.project + "/" + that.project + ".dzc";
                collection.BrandImage = "";

                that._load(collection, that.data);

                window.open("#pv-modal-dialog-close", "_self");
                $.publish("/PivotViewer/Models/Collection/Loaded", null);
            });
            authoring_cards(that);
        };
        reader.readAsText(this.CSVFile);
    }
});
