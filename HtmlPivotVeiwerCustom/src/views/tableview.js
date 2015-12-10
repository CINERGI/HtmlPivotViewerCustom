//
//  HTML5 PivotViewer
//
//  Collection loader interface - used so that different types of data sources can be used
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

///
/// Table view
///
PivotViewer.Views.TableView = PivotViewer.Views.IPivotViewerView.subClass({
    init: function () {
        this._super();
        this.filter = null;
        this.selectedFacet = null;
        this.sortKey = 'pv-key';
        this.sortReverse = false;
        this.sortReverseEntity = false;
        this.sortReverseAttribute = false;
        this.sortReverseValue = false;
    },
    Setup: function (width, height, offsetX, offsetY, tileMaxRatio) {
        this.width = width;
        this.height = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.currentWidth = this.width;
        this.currentHeight = this.height;
        this.currentOffsetX = this.offsetX;
        this.currentOffsetY = this.offsetY;

        $('.pv-viewpanel').append("<div class='pv-tableview-table' id='pv-table'></div>");
        $('.pv-viewpanel').append("<div style='visibility:hidden;position:relative;' id='pv-table-loader'><img src='images/loading.gif'></img></div>");
        $('#pv-table-loader').css('top', (this.height / 2) - 33 +'px');
        $('#pv-table-loader').css('left', (this.width / 2) - 43 +'px');
    },
    Filter: function (tiles, filter) {
        this.tiles = tiles;
        this.filter = filter;

        this.sortReverse = false;
        this.sortReverseEntity = false;
        this.sortReverseAttribute = false;
        this.sortReverseValue = false;

        this.CreateTable(filter, this.selectedFacet, this.sortKey, this.sortReverse);

        this.filtered = false;
    },
    Activate: function () {
        if (!Modernizr.canvas) return;

        this._super();

        Debug.Log('Table View Filtered: ' + this.filterEvt.filter.length);

        $('.pv-toolbarpanel-sort').fadeIn();
        $('.pv-toolbarpanel-zoomcontrols').css('border-width', '0');
        $('#MAIN_BODY').css('overflow', 'auto');
        $('.pv-tableview-table').fadeIn();

        if (this.filtered) this.Filter(this.filterEvt.tiles, this.filterEvt.filter);
    },
    Deactivate: function() {
        this._super();
        $('.pv-tableview-table').fadeOut();
        $('.pv-toolbarpanel-sort').fadeOut();
    },
    GetButtonImage: function () {return 'images/TableView.png';},
    GetButtonImageSelected: function () {return 'images/TableViewSelected.png';},
    GetViewName: function () {return 'Table View';},
    CellClick: function (columnId, cells) {
        Debug.Log('CellClick');
        if (columnId == 'pv-key') {
            var itemId = cells[0].attributes.getNamedItem("itemid").value;
            if (this.selected == null || itemId != this.selected.facetItem.Id) {
                var tile = TileController.GetTileById(itemId);
                $.publish("/PivotViewer/Views/Item/Selected", [{ item: tile, bkt: 0 }]);
            }
            else if (itemId == this.selected.facetItem.Id)
                $.publish("/PivotViewer/Views/Item/Selected", [{ item: null, bkt: 0 }]);
        }
        else if (columnId == 'pv-facet') {
            var filter;

            if (this.selected == null) filter = this.filter;
            else filter = [this.selected];

            if (this.selectedFacet == "" || this.selectedFacet == null) {
                this. selectedFacet = cells[1].textContent.trim();
                this.CreateTable(filter, this.selectedFacet, this.sortKey);
            }
            else {
                this.selectedFacet = "";
                this.CreateTable(filter, "" );
            }
            $.publish("/PivotViewer/Views/Item/Updated", null);
        }
        else if (columnId == 'pv-value') {
            var value = cells[2].attributes.getNamedItem("value").value;
            $.publish("/PivotViewer/Views/Item/Filtered", [{ Facet: cells[1].textContent.trim(), Item: value, MaxRange: value, Values: null}]);
        }
    },
    CreateTable: function (filter, selectedFacet, sortKey, sortReverse) {
        var that = this;
        var table = $('#pv-table');
        var showAllFacets = false; 
        var tableRows = new Array();
        var sortIndex = 0;
        table.empty();
        var sortImage;
        var offset;

        if (selectedFacet == null || selectedFacet == "" || selectedFacet == undefined) showAllFacets = true;  
        $('.pv-tableview-table').css('height', this.height - 12 + 'px');
        $('.pv-tableview-table').css('width', this.width - 415 + 'px');

        if (sortReverse) sortImage = "images/sort-up.png";
        else sortImage = "images/sort-down.png";

        var oddOrEven = 'odd-row';
        var tableContent = "<table id='pv-table-data' style='color:#484848;'><tr class='pv-tableview-heading'><th id='pv-key' title='Sort on subject name'>Subject";
        if (sortKey == 'pv-key')
            tableContent += " <img style='position:relative;top:" + offset + "' src='" + sortImage + "'></img>";
        tableContent += "</th><th id='pv-facet' title='Sort on predicate name'>Predicate";
        if (sortKey == 'pv-facet')
            tableContent += " <img style='position:relative;top:" + offset + "' src='" + sortImage + "'></img>";
        tableContent += "</th><th id='pv-value' title='Sort on object'>Object";
        if (sortKey == 'pv-value')
            tableContent += " <img style='position:relative;top:" + offset + "' src='" + sortImage + "'></img>";
        tableContent += "</th></tr>";

        for (var i = 0; i < filter.length; i++) {
            var entity = filter[i].facetItem.Name, id = filter[i].facetItem.Id;
            if (showAllFacets || selectedFacet == 'Description') {
                var sortKeyValue;
                if (sortKey == 'pv-key') sortKeyValue = entity;
                else if (sortKey == 'pv-facet') sortKeyValue = 'Description';
                else if (sortKey == 'pv-value') sortKeyValue = filter[i].facetItem.Description;

                // Only add a row for the Description if there is one
                if (filter[i].facetItem.Description) {
                    // Link out image if item has href
                    if (filter[i].facetItem.Href) 
                        tableRows.push({key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven +"'><td id='pv-key' itemid='" + id + "' title='Toggle item selection' style='color:#009933;cursor:pointer'>" + entity + " <a href=" + filter[i].facetItem.Href.replace(/'/g, "%27") + " target=\"_blank\"><img style='cursor:default;' id='pv-linkout' title='Follow the link' title='Follow the link' src='images/goout.gif'></img></a></a></td><td id='pv-facet' title='Show only this predicate' style='color:#009933;cursor:pointer'>Description</td><td id='pv-value'>" + filter[i].facetItem.Description + "</td></tr>"});
                    else tableRows.push({key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven +"'><td id='pv-key' itemid='" + id + "' class='tooltip' title='Toggle item selection'>" + entity + "</td><td id='pv-facet' title='Show only this predicate' style='color:#009933;cursor:pointer'>Description</td><td id='pv-value'>" + filter[i].facetItem.Description + "</td></tr>"});         
                    oddOrEven = 'even-row';
                }

                if (oddOrEven == 'odd-row') oddOrEven = 'even-row';
                else oddOrEven = 'odd-row';

                if (showAllFacets) {
                    for (var k = 0; k < filter[i].facetItem.Facets.length; k++){
                        var facet = filter[i].facetItem.Facets[k], attribute = facet.Name;
                        for (var l = 0; l < facet.FacetValues.length; l++) {
                            var value = facet.FacetValues[l].Value;
                            var label = facet.FacetValues[l].Label;
                            
                            var sortKeyValue;
                            if (sortKey == 'pv-key') sortKeyValue = entity;
                            else if (sortKey == 'pv-facet') sortKeyValue = attribute;
                            else if (sortKey == 'pv-value') sortKeyValue = value;

                            // Colour blue if in the filter
                            if (PivotCollection.getCategoryByName(attribute).IsFilterVisible) {
                                // Link out image if item has href
                                if (filter[i].facetItem.Href) {
                                    // Value is uri
                                    if (this.IsUri(value))
                                        tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection' style='color:#009933;cursor:pointer'>" + entity + " <a href=" + filter[i].facetItem.Href.replace(/'/g, "%27") + " target=\"_blank\"><img style='cursor:default;' id='pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td><td id='pv-facet'  title='Show only this predicate' style='color:#009933;cursor:pointer'>" + attribute + "</td><td id='pv-value' value='" + value + "' title='Filter on this value' style='color:#009933;cursor:pointer'>" + label + " " + "<a href=" + value + " target=\"_blank\"><img style='cursor:default;' id=pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td></tr>" });
                                    else tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection' style='color:#009933;cursor:pointer'>" + entity + " <a href=" + filter[i].facetItem.Href.replace(/'/g, "%27") + " target=\"_blank\"><img style='cursor:default;' id='pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td><td id='pv-facet'  title='Show only this predicate' style='color:#009933;cursor:pointer'>" + attribute + "</td><td id='pv-value' value='" + value + "' title='Filter on this value' style='color:#009933;cursor:pointer'>" + label + "</td></tr>" });
                                } 
                                else {
                                    // Value is uri
                                    if (this.IsUri(value))
                                        tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection'>" + entity + "</td><td id='pv-facet'  title='Show only this predicate' style='color:#009933;cursor:pointer'>" + attribute + "</td><td id='pv-value' value='" + value + "' title='Filter on this value' style='color:#009933;cursor:pointer'>" + label + " " + "<a href='" + value + "' target=\"_blank\"><img style='cursor:default;' id=pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td></tr>" });
                                    else tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection'>" + entity + "</td><td id='pv-facet'  title='Show only this predicate' style='color:#009933;cursor:pointer'>" + attribute + "</td><td id='pv-value' value='" + value + "' title='Filter on this value' style='color:#009933;cursor:pointer'>" + label + "</td></tr>" });
                                }
                            } 
                            else {
                                // Link out image if item has href
                                if (filter[i].facetItem.Href) { 
                                    // Value is uri
                                    if (this.IsUri(value))
                                        tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection' style='color:#009933;cursor:pointer'>" + entity + " <a href=" + filter[i].facetItem.Href.replace(/'/g, "%27") + " target=\"_blank\"><img style='cursor:default;' id='pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td><td id='pv-facet' title='Show only this predicate' style='color:#009933;cursor:pointer'>" + attribute + "</td><td id='pv-value' value='" + value + "'><a href='" + value + "' target='_blank'>" + label + "</a></td></tr>" });
                                    else tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection' style='color:#009933;cursor:pointer'>" + entity + " <a href=" + filter[i].facetItem.Href.replace(/'/g, "%27") + " target=\"_blank\"><img style='cursor:default;' id='pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td><td id='pv-facet' title='Show only this predicate' style='color:#009933;cursor:pointer'>" + attribute + "</td><td id='pv-value' value='" + value + "'>" + label + "</td></tr>" });
                                } 
                                else {
                                    // Value is uri
                                    if (this.IsUri(value))
                                        tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Select this value'>" + entity + "</td><td id='pv-facet' title='Show only this predicate' style='color:#009933;cursor:pointer'>" + attribute + "</td><td id='pv-value' value='" + value + "'><a href='" + value + "' target='_blank'>" + label + "</a></td></tr>" });
                                    else tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Select this value'>" + entity + "</td><td id='pv-facet' title='Show only this predicate' style='color:#009933;cursor:pointer'>" + attribute + "</td><td id='pv-value' value='" + value + "'>" + label + "</td></tr>" });
                                }
                            } 
                            if (oddOrEven == 'odd-row') oddOrEven = 'even-row';
                            else oddOrEven = 'odd-row';
                        }
                    }
                }
            }
            else {
                facet = filter[i].facetItem.FacetByName[selectedFacet];
                    
                for (l = 0; l < facet.FacetValues.length; l++) {
                    var value = facet.FacetValues[l].Value, label = facet.FacetValues[l].Label;
                    var sortKeyValue;
                    if (sortKey == 'pv-key') sortKeyValue = entity;
                    else if (sortKey == 'pv-facet') sortKeyValue = selectedFacet;
                    else if (sortKey == 'pv-value') sortKeyValue = value;

                    // Colour blue if in the filter
                    if (PivotCollection.getCategoryByName(selectedFacet).IsFilterVisible) {
                        // Link out image if item has href
                        if (filter[i].facetItem.Href) {
                            // Value is uri
                            if (this.IsUri(value))
                                tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection' style='color:#009933;cursor:pointer'>" + entity + " <a href=" + filter[i].facetItem.Href.replace(/'/g, "%27") + " target=\"_blank\"><img style='cursor:default;' id='pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td><td id='pv-facet' title='Clear predicate selection' style='color:#009933;cursor:pointer'>" + selectedFacet + "</td><td id='pv-value' value='" + value + "' title='Filter on this value' style='color:#009933;cursor:pointer'>" + value + " <a href='" + value + "' target=\"_blank\"><img style='cursor:default;' id=pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td></tr>" });
                            else tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection' style='color:#009933;cursor:pointer'>" + entity + " <a href=" + filter[i].facetItem.Href.replace(/'/g, "%27") + " target=\"_blank\"><img style='cursor:default;' id='pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td><td id='pv-facet' title='Clear predicate selection' style='color:#009933;cursor:pointer'>" + selectedFacet + "</td><td id='pv-value' value='" + value + "' title='Filter on this value' style='color:#009933;cursor:pointer'>" + label + "</td></tr>" });
                        } 
                        else {
                            // Value is uri
                            if (this.IsUri(value))
                                tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection'>" + entity + "</td><td id='pv-facet' class-'tooltipcustom' title='Clear predicate selection' style='color:#009933;cursor:pointer'>" + selectedFacet + "</td><td id='pv-value' value='" + value + "' title='Filter on this value' style='color:#009933;cursor:pointer'>" + label + " " + "<a href='" + value + "' target='_blank'><img style='cursor:default;' id=pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td></tr>" });
                            else tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection'>" + entity + "</td><td id='pv-facet' class-'tooltipcustom' title='Clear predicate selection' style='color:#009933;cursor:pointer'>" + selectedFacet + "</td><td id='pv-value' value='" + value + "' title='Filter on this value' style='color:#009933;cursor:pointer'>" + label + "</td></tr>" });
                        }
                    } 
                    else {
                        // Link out image if item has href
                        if (filter[i].facetItem.Href) { 
                            // Value is uri
                            if (this.IsUri(value))
                                tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Click the cell to select this item' style='color:#009933;cursor:pointer'>" + entity + " <a href=" + filter[i].facetItem.Href.replace(/'/g, "%27") + " target=\"_blank\"><img style='cursor:default;' id='pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td><td id='pv-facet' title='Clear predicate selection' style='color:#009933;cursor:pointer'>" + selectedFacet + "</td><td id='pv-value' value='" + value + "'><a href='" + value + "' target='_blank'>" + label + "</a></td></tr>" });
                            else tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Click the cell to select this item' style='color:#009933;cursor:pointer'>" + entity + " <a href=" + filter[i].facetItem.Href.replace(/'/g, "%27") + " target=\"_blank\"><img style='cursor:default;' id='pv-linkout' title='Follow the link' src='images/goout.gif'></img></a></td><td id='pv-facet' title='Clear predicate selection' style='color:#009933;cursor:pointer'>" + selectedFacet + "</td><td id='pv-value' value='" + value + "'>" + label + "</td></tr>" });
                        } 
                        else {
                            // Value is uri
                            if (this.IsUri(value))
                                tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection'>" + entity + "</td><td id='pv-facet' class-'tooltipcustom' title='Clear predicate selection' style='color:#009933;cursor:pointer'>" + selectedFacet + "</td><td id='pv-value' value='" + value + "'><a href='" + value + "' target='_blank'>" + label + "</a></td></tr>" });
                            else tableRows.push({ key: sortKeyValue, value: "<tr class='pv-tableview-" + oddOrEven + "'><td id='pv-key' itemid='" + id + "'title='Toggle item selection'>" + entity + "</td><td id='pv-facet' class-'tooltipcustom' title='Clear predicate selection' style='color:#009933;cursor:pointer'>" + selectedFacet + "</td><td id='pv-value' value='" + value + "'>" + label + "</td></tr>" });
                        }
                    } 
                    if (oddOrEven == 'odd-row') oddOrEven = 'even-row';
                    else oddOrEven = 'odd-row';
                }
            }
        }

        if (tableRows.length == 0) {
            if (showAllFacets == true) {
                var msg = 'There is no data to show about the selected items';
                $('.pv-wrapper').append("<div id=\"pv-dztable-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
                setTimeout(function () { window.open("#pv-dztable-error", "_self") }, 1000)
                return;
            }
            else this.CreateTable(filter, "", sortKey, sortReverse);
        }
        else {
            tableRows.sort(function(a, b){
                if(a.key > b.key) return 1;
                else if(a.key < b.key) return -1; 
                return 0;
            });
         
            if (sortReverse) tableRows.reverse();
         
            for (var i = 0; i < tableRows.length; i++) {
               tableContent += tableRows[i].value;
            }
         
            tableContent += "</table>";
            table.append(tableContent);
            $('#pv-table-data').colResizable({disable:true});
            $('#pv-table-data').colResizable({disable:false});

            // Table view events
            $('.pv-tableview-heading').on('click', function (e) {
                $('#pv-table-loader').show();
                var id = e.originalEvent.target.id;
         
                var filter;
         
                if (that.selected == null) filter = that.filter;
                else filter = [that.selected];
         
                if (id == 'pv-key') that.sortReverse = that.sortReverseEntity
                else if (id == 'pv-facet') that.sortReverse = that.sortReverseAttribute;
                else if (id == 'pv-value') that.sortReverse = that.sortReverseValue;
         
                that.sortKey = id;
                that.CreateTable (filter, that.selectedFacet, id);
                $('#pv-table-loader').fadeOut();
            }); 
            $('.pv-tableview-odd-row').on('click', function (e) {
                $('#pv-table-loader').show();
                var id = e.originalEvent.target.id;
                that.CellClick(id, e.currentTarget.cells);
                $('#pv-table-loader').fadeOut();
;
            }); 
            $('.pv-tableview-even-row').on('click', function (e) {
                $('#pv-table-loader').show();
                var id = e.originalEvent.target.id;
                that.CellClick(id, e.currentTarget.cells);
                $('#pv-table-loader').fadeOut();
            }); 
        }
    },
    SetSelected: function (item) {
        this._super(item);
        if (item == null) this.CreateTable (this.filter, this.selectedFacet);
        else this.CreateTable ([item], this.selectedFacet);
    },
    IsUri: function (value) {
        if (typeof(value) == "string") {
            if (value.substring(0, 5) == 'http:') return true;
            else if (value.substring(0, 6) == 'https:') return true;
        }
        return false;
    }
});
