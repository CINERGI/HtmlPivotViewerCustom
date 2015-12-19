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

///  Collection loader interface - used so that different types of data sources can be used
PivotViewer.Models.Loaders.ICollectionLoader = Object.subClass({
    init: function () { },
    loadCollection: function (collection) {
        if (!collection instanceof PivotViewer.Models.Collection) {
            throw "collection not an instance of PivotViewer.Models.Collection.";
        }
    }
});

//CXML loader
PivotViewer.Models.Loaders.CXMLLoader = PivotViewer.Models.Loaders.ICollectionLoader.subClass({
    init: function (cxmlUri, proxy) {
        this.cxmlUriNoProxy = cxmlUri;
        if (proxy) this.cxmlUri = proxy + cxmlUri;
        else this.cxmlUri = cxmlUri;
    },
    loadCollection: function (collection) {
        var collection = collection;
        this._super(collection);

        collection.baseNoProxy = this.cxmlUriNoProxy;
        collection.base = this.cxmlUri;

        var that = this;
        if (this.cxmlUri.endsWith(".zip")) {
            jBinary.loadData(this.cxmlUri).then(function (binary) {
                var zip = new JSZip();
                zip.load(binary);
                var xmlDoc = zip.file(/.cxml/)[0].asText();
                that.loadXML(collection, $.parseXML(xmlDoc.substring(xmlDoc.indexOf(">") + 1)));
            });
        }
        else {
            $.ajax({
                type: "GET",
                url: this.cxmlUri,
                dataType: "xml",
                success: (function(collection) {return function (xml) {that.loadXML(collection, xml);}})(collection),
                error: function (jqXHR, textStatus, errorThrown) {
                    //Make sure throbber is removed else everyone thinks the app is still running
                    $('.pv-loading').remove();

                    //Display a message so the user knows something is wrong
                    var msg = 'Error loading CXML Collection<br><br>';
                    msg += 'URL        : ' + this.url + '<br>';
                    msg += 'Status : ' + jqXHR.status + ' ' + errorThrown + '<br>';
                    msg += 'Details    : ' + jqXHR.responseText + '<br>';
                    msg += '<br>Pivot Viewer cannot continue until this problem is resolved<br>';
                    $('.pv-wrapper').append("<div id=\"pv-loading-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
                    var t = setTimeout(function () { window.open("#pv-loading-error", "_self") }, 1000)
                }
            });
        }
    },
   loadXML: function (collection, xml) {
        var collectionRoot = $(xml).find("Collection")[0];
        var maxRelatedLinksLength = 0;
        //get namespace local name
        var namespacePrefix = "P";

        if (collectionRoot == undefined) {
            //Make sure throbber is removed else everyone thinks the app is still running
            $('.pv-loading').remove();

            //Display message so the user knows something is wrong
            var msg = 'Error parsing CXML Collection<br>';
            msg += '<br>Pivot Viewer cannot continue until this problem is resolved<br>';
            $('.pv-wrapper').append("<div id=\"pv-parse-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
            setTimeout(function () { window.open("#pv-parse-error", "_self") }, 1000)
            throw "Error parsing CXML Collection";
        }

        for (var i = 0; i < collectionRoot.attributes.length; i++) {
            if (collectionRoot.attributes[i].value == "http://schemas.microsoft.com/livelabs/pivot/collection/2009") {
                namespacePrefix = collectionRoot.attributes[i].localName != undefined ? collectionRoot.attributes[i].localName : collectionRoot.attributes[i].baseName;
                break;
            }
        }
        collection.name = $(collectionRoot).attr("Name");
        collection.brandImage = $(collectionRoot).attr(namespacePrefix + ":BrandImage") != undefined ? $(collectionRoot).attr(namespacePrefix + ":BrandImage") : "";

        //FacetCategory
        var facetCategories = $(xml).find("FacetCategory");
        savedNamespacePrefix = namespacePrefix;
        for (var i = 0; i < facetCategories.length; i++) {
            var facetElement = $(facetCategories[i]);

            // Handle locally defined namespaces
            for (var j = 0; j < facetElement[0].attributes.length; j++) {
                if (facetElement[0].attributes[j].value == "http://schemas.microsoft.com/livelabs/pivot/collection/2009") {
                    namespacePrefix = facetElement[0].attributes[j].localName != undefined ? facetElement[0].attributes[j].localName : facetElement[0].attributes[j].baseName;
                    break;
                }
            }

            var facetCategory = new PivotViewer.Models.Category(facetElement.attr("Name"), facetElement.attr("Type"),
                facetElement.attr(namespacePrefix + ":IsFilterVisible") != undefined ? (facetElement.attr(namespacePrefix + ":IsFilterVisible").toLowerCase() == "true" ? true : false) : true);

            //Add custom sort order
            var sortOrder = facetElement.find(namespacePrefix + "\\:SortOrder");
            var sortValues = sortOrder.find(namespacePrefix + "\\:SortValue");

            if (sortOrder.length == 0) {
                //webkit doesn't seem to like the P namespace
                sortOrder = facetElement.find("SortOrder");
                sortValues = sortOrder.find("SortValue");
            }

            if (sortOrder.length == 1) {
                var customSort = new PivotViewer.Models.CategorySort(sortOrder.attr("Name"));
                for (var j = 0; j < sortValues.length; j++) {
                    customSort.sortValues.push($(sortValues[j]).attr("Value"));
                }
                facetCategory.customSort = customSort;
            }
            collection.categories.push(facetCategory);
            namespacePrefix = savedNamespacePrefix;
        }
        //Items
        var items = $(xml).find("Items");
        if (items.length == 1) {
            var cxmlItem = $(items[0]).find("Item");
            collection.imageBase = $(items[0]).attr("ImgBase");
            if (cxmlItem.length == 0) {
                //Make sure throbber is removed else everyone thinks the app is still running
                $('.pv-loading').remove();

                //Display a message so the user knows something is wrong
                var msg = 'There are no items in the CXML Collection<br><br>';
                $('.pv-wrapper').append("<div id=\"pv-empty-collection-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
                setTimeout(function () { window.open("#pv-empty-collection-error", "_self") }, 1000)
            }
            else {
                for (var i = 0; i < cxmlItem.length; i++) {
                    var item = new PivotViewer.Models.Item(
                        $(cxmlItem[i]).attr("Img").replace("#", ""),
                        $(cxmlItem[i]).attr("Id"),
                        $(cxmlItem[i]).attr("Href"),
                        $(cxmlItem[i]).attr("Name")
                    );
                    var description = $(cxmlItem[i]).find("Description");
                    if (description.length == 1 && description[0].childNodes.length)
                        item.description = PivotViewer.Utils.htmlSpecialChars(description[0].childNodes[0].nodeValue);
                    var facets = $(cxmlItem[i]).find("Facet");
                    for (var j = 0; j < facets.length; j++) {
                        var f = new PivotViewer.Models.Facet($(facets[j]).attr("Name"));

                        var facetChildren = $(facets[j]).children();
                        for (var k = 0; k < facetChildren.length; k++) {
                            if (facetChildren[k].nodeType == 1) {
                                var v = $.trim($(facetChildren[k]).attr("Value"));
                                if (v == null || v == "") {
                                    if (facetChildren[k].nodeName == "Link") {
                                        if ($(facetChildren[k]).attr("Href") == "" || $(facetChildren[k]).attr("Href") == null) {
                                            var fValue = new PivotViewer.Models.FacetValue(PivotViewer.Utils.htmlSpecialChars("(empty Link)"));
                                            f.addValue(fValue);

                                        }
                                        else if ($(facetChildren[k]).attr("Name") == "" || $(facetChildren[k]).attr("Name") == null) {
                                            var fValue = new PivotViewer.Models.FacetValue("(unnamed Link)");
                                            fValue.href = $(facetChildren[k]).attr("Href");
                                            f.addValue(fValue);
                                        }
                                        else {
                                            var fValue = new PivotViewer.Models.FacetValue($(facetChildren[k]).attr("Name"));
                                            fValue.href = $(facetChildren[k]).attr("Href");
                                            f.addValue(fValue);
                                        }
                                    }
                                    else {
                                        var fValue = new PivotViewer.Models.FacetValue(PivotViewer.Utils.htmlSpecialChars("(empty " + facetChildren[k].nodeName + ")"));
                                        f.addValue(fValue);
                                    }
                                }
                                else if (facetChildren[k].nodeName == "Number") f.addValue(new PivotViewer.Models.FacetValue(parseFloat(v)));
                                else f.addValue(new PivotViewer.Models.FacetValue(PivotViewer.Utils.htmlSpecialChars(v)));

                            }
                        }
                        item.facets.push(f);
                    }
                    var itemExtension = $(cxmlItem[i]).find("Extension");
                    if (itemExtension.length == 1) {
                        var savedNamespacePrefix = namespacePrefix;

                        // Handle locally defined namespaces
                        for (var j = 0; j < itemExtension[0].childNodes.length; j++) {
                            namespacePrefix = itemExtension[0].childNodes[j].lookupPrefix("http://schemas.microsoft.com/livelabs/pivot/collection/2009");
                            if (namespacePrefix) break;
                        }

                        var itemRelated = $(itemExtension[0]).find(namespacePrefix + '\\:Related, Related');
                        if (itemRelated.length == 1) {
                            var links = $(itemRelated[0]).find(namespacePrefix + '\\:Link, Link');
                            for (var l = 0; l < links.length; l++) {
                                var linkName = $(links[l]).attr("Name");
                                var linkHref = $(links[l]).attr("Href");
                                if (linkHref.indexOf(".cxml") == -1 && linkHref.indexOf("pivot.vsp") >= 0) {
                                    var url = $.url(this.url);
                                    linkHref = url.attr('protocol') + "://" + url.attr('authority') + url.attr('directory') + linkHref;
                                }
                                else if (linkHref.indexOf(".cxml") == -1 && linkHref.indexOf("sparql") >= 0) {
                                    var url = $.url(this.url);
                                    linkHref = location.origin + location.pathname + "?url=" + linkHref;
                                }
                                var link = new PivotViewer.Models.ItemLink(linkName, linkHref);
                                item.links.push(link);
                            }
                            if (links.length > maxRelatedLinksLength) maxRelatedLinksLength = links.length;
                        }
                        namespacePrefix = savedNamespacePrefix;
                    }
                    collection.items.push(item);
                }
            }
        }
        collection.maxRelatedLinks = maxRelatedLinksLength;
        //Extensions
        var extension = $(xml).find("Extension");
        if (extension.length > 1) {
            for (x = 0; x < extension.length; x++) {
                var savedNamespacePrefix = namespacePrefix;

                // Handle locally defined namespaces
                for (var j = 0; j < extension[x].childNodes.length; j++) {
                    namespacePrefix = extension[0].childNodes[j].lookupPrefix("http://schemas.microsoft.com/livelabs/pivot/collection/2009");
                    if (namespacePrefix) break;
                }

                //var collectionCopyright = $(extension[x]).find('d1p1\\:Copyright, Copyright');
                var collectionCopyright = $(extension[x]).find(namespacePrefix + '\\:Copyright, Copyright');
                if (collectionCopyright.length > 0) {
                    collection.copyrightName = $(collectionCopyright[0]).attr("Name");
                    collection.copyrightHref = $(collectionCopyright[0]).attr("Href");
                    break;
                }
                namespacePrefix = savedNamespacePrefix;
            }
        }

        if (cxmlItem.length > 0) $.publish("/PivotViewer/Models/Collection/Loaded", null);
    },
    loadColumn: function (category) { },
    getRow: function (id) {return PivotCollection.getItemById(id).facets;}
});
