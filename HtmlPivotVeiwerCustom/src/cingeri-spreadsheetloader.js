//
//  HTML5 PivotViewer
//
//  This software is licensed under the terms of the
//  GNU General Public License v2 (see COPYING)i
//


//JSON loader
PivotViewer.Models.Loaders.SpreadsheetLoader = PivotViewer.Models.Loaders.ICollectionLoader.subClass({
    init: function (SheetUri, proxy, SheetName) {
        this.SheetUriNoProxy = SheetUri;

        if (proxy)
            this.SheetUri = proxy + SheetUri;
        else 
            this.SheetUri = SheetUri;

        if (SheetName) {
            this.SheetName = SheetName;
        } else {
            this.SheetName = 'Basic Metadata Template';
        }
    },
    LoadCollection: function (collection) {
        var collection = collection;
        this._super(collection);

        //collection.CollectionBaseNoProxy = this.SheetUriNoProxy;
        //collection.CollectionBase = this.SheetUri;
        collection.CollectionBaseNoProxy = this.SheetUriNoProxy;
        collection.CollectionBase = 'projects/images/';
        collection.ImageBase = '';

        Tabletop.init({
            key: this.SheetUri,
            callback: showInfo,
            wanted: [this.SheetName],
            debug: true 
        });

        // var jqXHR = $.getJSON(this.SheetUri)
        //  .done(function(data) {
        function showInfo(data, tabletop) {
            Debug.Log('Sheet loaded');


            // if (data.FacetCategories == undefined || data.Items == undefined) {
            // use first Wanteed. can't use this.SheetName. This is a function callback
            if (tabletop.sheets(this.wanted[0]) == undefined) {

                //Make sure throbber is removed else everyone thinks the app is still running
                $('.pv-loading').remove();

                //Display message so the user knows something is wrong
                var msg = '';
                msg = msg + 'Error locating or psrsing Spreadsheet Collection<br>';
                msg = msg + '<br>Pivot Viewer cannot continue until this problem is resolved<br>';
                $('.pv-wrapper').append("<div id=\"pv-parse-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
                var t = setTimeout(function () {
                    window.open("#pv-parse-error", "_self")
                }, 1000)
                throw "Error locating or psrsing Spreadsheet Collection";
            }

            //if (data.CollectionName != undefined)
            //    collection.CollectionName = data.CollectionName;
            //
            //if (data.BrandImage != undefined)
            //    collection.BrandImage = data.BrandImage;

            //FacetCategories
            //for (var i = 0; i < data.FacetCategories.FacetCategory.length; i++) {
            //
            //   var facetCategory = new PivotViewer.Models.FacetCategory(
            //        data.FacetCategories.FacetCategory[i].Name,
            //        data.FacetCategories.FacetCategory[i].Format,
            //        data.FacetCategories.FacetCategory[i].Type,
            //        data.FacetCategories.FacetCategory[i].IsFilterVisible != undefined ? (data.FacetCategories.FacetCategory[i].IsFilterVisible.toLowerCase() == "true" ? true : false) : true,
            //        data.FacetCategories.FacetCategory[i].IsMetadataVisible != undefined ? (data.FacetCategories.FacetCategory[i].IsMetadataVisible.toLowerCase() == "true" ? true : false) : true,
            //        data.FacetCategories.FacetCategory[i].IsWordWheelVisible != undefined ? (data.FacetCategories.FacetCategory[i].IsWordWheelVisible.toLowerCase() == "true" ? true : false) : true
            //        );
            //
            //      if (data.FacetCategories.FacetCategory[i].SortOrder != undefined) {
            //            var customSort = new PivotViewer.Models.FacetCategorySort(data.FacetCategories.FacetCategory[i].SortOrder.Name);
            //            for (j = 0; j < data.FacetCategories.FacetCategory[i].SortValues.Value.length; J++)
            //                customSort.Values.push(data.FacetCategories.FacetCategory[i].SortValues.Value[j]);
            //            facetCategory.CustomSort = customSort;
            //        }
            //
            //    collection.FacetCategories.push(facetCategory);
            //}
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Resource description", "", "String", false, false, true));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("CINERGI Resource Type", "", "String", true, true, false));
           // collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Link function", "", "String", true, true, false));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Classification (Theme)", "", "String", true, true, false));
            //collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("InterchangeFormats", "", "String", true, true, false));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("keywords_geographic", "", "String", true, true, false));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Resource steward organization", "", "String", true, true, false));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Resource steward person", "", "String", false, false, false));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Resource POC e-mail", "", "String", false, false, false));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Resource URL", "", "String", true, true, false));


            $.each(tabletop.sheets(this.wanted[0]).all(), function (i, cat) {
                // var cat_li = $('<li><h4>' + cat['Component or subsystem'] + '</h4></li>')
                // cat_li.append(cat.System);
                // cat_li.appendTo("#cats");
                // PivotViewer.Models.Item = Object.subClass({
                // init: function (Img, Id, Href, Name)
                var iimg = "globe.jpg";
                var iid = i;
                var hhref = "#";
                var nname = cat['Resource name'];
                var u = new PivotViewer.Models.Item(iimg, iid, hhref, nname);
                u.LobsterId = i;
                u.Description = cat['Resource description'];
                // Name, System, FunctionalDescription,
                // Component Type, Function, Maturity/status, Steward-Organization,
                //References-Links, References-Text, Interfaces,
                // InterchangeFormats , InformationModels, Implementation
               // u.Facets.push(new PivotViewer.Models.Facet("Id", [ new PivotViewer.Models.FacetValue(iid) ] ));

                u.Facets.push(new PivotViewer.Models.Facet("CINERGI Resource Type", [new PivotViewer.Models.FacetValue(cat['CINERGI Resource Type'])]));

               // u.Facets.push(new PivotViewer.Models.Facet("Link function", [new PivotViewer.Models.FacetValue(cat['Link function'])]));

                u.Facets.push(new PivotViewer.Models.Facet("Classification (Theme)", [new PivotViewer.Models.FacetValue(cat['Classification (Theme)'])]));

                u.Facets.push(new PivotViewer.Models.Facet("keywords_geographic",
                    [new PivotViewer.Models.FacetValue(cat['keywords_geographic'])]));

                u.Facets.push(new PivotViewer.Models.Facet("Resource steward organization",
                    [new PivotViewer.Models.FacetValue(cat['Resource steward organization'])]));

                u.Facets.push(new PivotViewer.Models.Facet("Resource steward person",
    [new PivotViewer.Models.FacetValue(cat['Resource steward person'])]));

                u.Facets.push(new PivotViewer.Models.Facet("Resource POC e-mail",
    [new PivotViewer.Models.FacetValue(cat['Resource POC e-mail'])]));

                //u.Facets.push(new PivotViewer.Models.Facet("InterchangeFormats",
                //    [new PivotViewer.Models.FacetValue(cat['InterchangeFormats'])]));


                u.Facets.push(new PivotViewer.Models.Facet("Resource URL",
                    [new PivotViewer.Models.FacetValue(cat['Resource URL'])]));

                u.Facets.push(new PivotViewer.Models.Facet("Resource description",
                    [new PivotViewer.Models.FacetValue(cat['Resource description'])]));

                collection.Items.push(u);

            });
            $.publish("/PivotViewer/Models/Collection/Loaded", null);
        }
    },
  //  LoadColumn: function (category) { },
  //  GetRow: function (id) { return PivotCollection.getItemById(id).Facets; }

}
);
// items

