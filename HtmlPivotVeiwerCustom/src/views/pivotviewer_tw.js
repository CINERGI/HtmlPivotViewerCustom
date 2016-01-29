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

///PivotViewer jQuery extension
var PV = null;
var PivotCollection = new PivotViewer.Models.Collection();
var TileController = null;
var Loader = null;
var LoadSem = new Semaphore(1);

(function ($) {
    var _views = [],
        _facetItemTotals = [], //used to store the counts of all the string facets - used when resetting the filters
        _facetNumericItemTotals = [], //used to store the counts of all the numeric facets - used when resetting the filters
        _facetOrdinalItemTotals = [],
        _wordWheelItems = [], //used for quick access to search values
	    _stringFacets = [],
	    _numericFacets = [],
	    _datetimeFacets = [],
        _selectedFacets = [],
        _currentView = 0,
        _tiles = [],
        _filterList = [],
        _selectedItem = null,
        _imageController,
        _mouseDrag = null,
        _mouseMove = null,
        _viewerState = { View: null, Facet: null, Filters: [] },
        _self = null,
        _nameMapping = {},
        _options = {},
        settings = { visibleCategories: undefined };
        

    var methods = {
        // PivotViewer can be initialised with these options:
        // Loader: a loader that inherits from ICollectionLoader must be specified.  Currently the project only includes the CXMLLoader.  It takes the URL of the collection as a parameter.
        // ImageController: defaults to the DeepZoom image controller.
        // ViewerState: Sets the filters, selected item and chosen view when the PivotViewer first opens
        init: function (options) {
            _self = this;
            _self.addClass('pv-wrapper');

            _options = options;

            //Load default options from "defaults" file
            $.getJSON("defaults.json")
            .always(function (defaultOptions) {

                var keys = Object.keys(defaultOptions);
                for (var i = 0; i < keys.length; i++) {
                    if (options[keys[i]] == undefined) options[keys[i]] == defaultOptions[keys[i]];
                }

                //ViewerState
                //http://i2.silverlight.net/content/pivotviewer/developer-info/api/html/P_System_Windows_Pivot_PivotViewer_ViewerState.htm
                if (options.ViewerState != undefined) {
                    var splitVS = options.ViewerState.split('&');

                    for (var i = 0, _iLen = splitVS.length; i < _iLen; i++) {
                        var splitItem = splitVS[i].split('=');
                        if (splitItem.length == 2) {
                            //Selected view
                            if (splitItem[0] == '$view$') _viewerState.View = parseInt(splitItem[1]) - 1;
                            //Sorted by
                            else if (splitItem[0] == '$facet0$') _viewerState.Facet = PivotViewer.Utils.EscapeItemId(splitItem[1]);
                            //Selected Item
                            else if (splitItem[0] == '$selection$') _viewerState.Selection = PivotViewer.Utils.EscapeItemId(splitItem[1]);
                            //Table Selected Facet
                            else if (splitItem[0] == '$tableFacet$') _viewerState.TableFacet = PivotViewer.Utils.EscapeItemId(splitItem[1]);

                            //Filters
                            else {
                                var filter = { Facet: splitItem[0], Predicates: [] };
                                var filters = splitItem[1].split('_');
                                for (var j = 0, _jLen = filters.length; j < _jLen; j++) {
                                    //var pred = filters[j].split('.');
                                    if (filters[j].indexOf('.') > 0) {
                                        var pred = filters[j].substring(0, filters[j].indexOf('.'));
                                        var value = filters[j].substring(filters[j].indexOf('.') + 1);
                                        //if (pred.length == 2)
                                        filter.Predicates.push({ Operator: pred, Value: value });
                                    }
                                }
                                _viewerState.Filters.push(filter);
                            }
                        }
                    }
                }

                //Image controller
                if (options.ImageController == undefined) _imageController = new PivotViewer.Views.DeepZoomImageController();
                else if (options.ImageController instanceof PivotViewer.Views.IImageController)
                    _imageController = options.ImageController;
                else throw "Image Controller does not inherit from PivotViewer.Views.IImageController.";
                
                if (options.Loader == undefined) {
                    $('.pv-wrapper').append("<div id='pv-file-selection' class='pv-modal-dialog modal-lg'><div><div id='pv-modal-text'><p>Use Existing Project:<br><select id='pv-server-file' class='pv-server-file'><option>Select a file</option></select><p>Create New Project:<br><input id='pv-load-file' class='pv-load-file' type=file accept='.csv'></div></div></div>");

                    $pv_server_file = $('#pv-server-file');
                    $.getJSON("../project_list.php", function (data) {
                        $.each(data, function (key, value) {
                            $pv_server_file.append('<option value=\"' + value + '\">' + value + '</option>');
                        });
                    });

                    $pv_server_file.on('change', function (e) {
                        if ($pv_server_file.val().endsWith(".cxml"))
                            Loader = new PivotViewer.Models.Loaders.CXMLLoader("projects/" + $pv_server_file.val());
                        else Loader = new PivotViewer.Models.Loaders.CSVLoader("projects/" + $pv_server_file.val());
                        InitCollectionLoader(options);
                        window.open("#pv-modal-dialog-close", "_self");
                    });

                    $('.pv-load-file').on('change', function (e) {
                        var fileInput = $("#pv-load-file")[0];
                        Loader = new PivotViewer.Models.Loaders.LocalCSVLoader(fileInput.files[0]);
                        InitCollectionLoader(options);
                    });
                }
                else {
                    Loader = options.Loader;
                    InitCollectionLoader(options);
                }

                window.open("#pv-file-selection", "_self");
            })
            .fail (function (jqxhr, textStatus, error) {
                var err = textStatus + ", " + error;
                Debug.Log ("Getting defaults file failed: " + err);
            });
        }
    };

    InitCollectionLoader = function (options) {
        PV = this;
        _self.append("<div class='pv-loading'><img src='images/loading.gif' alt='Loading' /><span>Loading...</span></div>");
        $('.pv-loading').css('top', ($('.pv-wrapper').height() / 2) - 33 + 'px');
        $('.pv-loading').css('left', ($('.pv-wrapper').width() / 2) - 43 + 'px');

        if (Loader == undefined) throw "Collection loader is undefined.";
        if (Loader instanceof PivotViewer.Models.Loaders.ICollectionLoader)
            Loader.LoadCollection(PivotCollection);
        else throw "Collection loader does not inherit from PivotViewer.Models.Loaders.ICollectionLoader.";
    };

    /// Create the individual controls for the facet
    CreateBucketizedDateTimeFacets = function (facetName, array1, array2) {
        var facetControls = ["<ul class='pv-filterpanel-accordion-facet-list'>"];

        // deal with array1
        if (array1) {
            for (var i = 0; i < array1.length; i++) {
                var index = i + 1;
                facetControls[index] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-item-" + CleanName(facetName) + "__" + CleanName(array1[i].name.toString()) + "'>";
                facetControls[index] += "<input itemvalue='" + CleanName(array1[i].name.toString()) + "' itemfacet='" + CleanName(facetName.toString()) + "' startdate='" + array1[i].start.toISOString() + "' enddate='" + array1[i].end + "' class='pv-facet-facetitem' type='checkbox' />"
                facetControls[index] += "<span class='pv-facet-facetitem-label' title='" + array1[i].name + "'>" +  array1[i].name + "</span>";
                facetControls[index] += "<span class='pv-facet-facetitem-count'>0</span>"
                facetControls[index] += "</li>";
            }
        }
        facetControls[array1.length + 1] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-item-LineBreak' style='border-bottom:thin solid #E2E2E2;'></li>";
        facetControls[array1.length + 2] = "</ul>";
        facetControls[array1.length + 3] = "<ul class='pv-filterpanel-accordion-facet-list'>";

        // deal with array2
        if (array2) {
            for (var i = 0; i < array2.length; i++) {
                var index = i + 4 + array1.length;
                facetControls[index] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-item-" + CleanName(facetName) + "__" + CleanName(array2[i].name.toString()) + "'>";
                facetControls[index] += "<input itemvalue='" + CleanName(array2[i].name.toString()) + "' itemfacet='" + CleanName(facetName.toString()) + "' startdate='" + array2[i].start.toISOString() + "' enddate='" + array2[i].end.toISOString() +  "' class='pv-facet-facetitem' type='checkbox' />"
                facetControls[index] += "<span class='pv-facet-facetitem-label' title='" + array2[i].name + "'>" +  array2[i].name + "</span>";
                facetControls[index] += "<span class='pv-facet-facetitem-count'>0</span>"
                facetControls[index] += "</li>";
            }
        }
        facetControls[array1.length + array2.length + 4] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-item-LineBreak2' style='border-bottom:thin solid #E2E2E2;'></li>";
        facetControls[array1.length + array2.length + 5] = "</ul>";
        return facetControls.join('');
    };

    CreateCustomRange = function (facetName) {
        var facetControls = ["<ul class='pv-filterpanel-accordion-facet-list'>"];
        facetControls[1] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-item-" + CleanName(facetName) + "__" + "_CustomRange'>";
        facetControls[1] += "<input itemvalue='CustomRange' itemfacet='" + CleanName(facetName) + "' class='pv-facet-facetitem' type='checkbox' />"
        facetControls[1] += "<span class='pv-facet-facetitem-label' title='Custom Range'>Custom Range</span>";
        facetControls[1] += "</li>";
        facetControls[1] += "<ul class='pv-filterpanel-accordion-facet-list'>"
        facetControls[1] += "<li class='pv-filterpanel-accordion-facet-list-item' id='pv-custom-range-" + CleanName(facetName) + "__Start' style='visibility:hidden;float:right'>"
        facetControls[1] += "<span class='pv-facet-customrange-label' title='Start Date' >Start:</span>"
        facetControls[1] += "<input itemvalue='CustomRangeStart' itemfacet='" + CleanName(facetName) + "' id='pv-custom-range-" + CleanName(facetName) + "__StartDate' class='pv-facet-customrange' type='text'/>"
        facetControls[1] += "</li>";
        facetControls[1] += "<li class='pv-filterpanel-accordion-facet-list-item' id='pv-custom-range-" + CleanName(facetName) + "__Finish' style='visibility:hidden;float:right'>"
        facetControls[1] += "<span class='pv-facet-customrange-label' title='End Date'>End:</span>"
        facetControls[1] += "<input itemvalue='CustomRangeFinish' itemfacet='" + CleanName(facetName) + "' id='pv-custom-range-" + CleanName(facetName) + "__FinishDate' class='pv-facet-customrange' type='text'/>"
        facetControls[1] += "</li>";
        facetControls[facetControls.length] = "</ul>";
        return facetControls.join('');
    };

    CreateDatetimeNoInfoFacet = function (facetName) {
        var values = _facetItemTotals[facetName];
        if (values == undefined) return "";
        var total = values["(no info)"];
        var facetControls = "<ul class='pv-filterpanel-accordion-facet-list'>";
        if(total != undefined) {
            facetControls += "<li class='pv-filterpanel-accordion-facet-list-item'  id='" + total.id + "'>";
            facetControls += "<input itemvalue='" + CleanName(total.value) + "' itemfacet='" + CleanName(facetName) + "' class='pv-facet-facetitem' type='checkbox' />"
            facetControls += "<span class='pv-facet-facetitem-label' title='" + total.value + "'>" + total.value + "</span>";
            facetControls += "<span class='pv-facet-facetitem-count'>0</span>"
            facetControls += "</li>";
        }
        facetControls += "<li class='pv-filterpanel-accordion-facet-list-item'  style='border-bottom:thin solid #E2E2E2;'></li>";
        facetControls += "</ul>";
        return facetControls;
    };

    CreateStringFacet = function (facetName) {
        var facetControls = ["<ul class='pv-filterpanel-accordion-facet-list'>"];
        var values = _facetItemTotals[facetName];
        var i = 1;
        for (var value in values.values) {
            var total = values.values[value];
            facetControls[i] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='" + total.id + "'>";
            facetControls[i] += "<input itemvalue='" + CleanName(total.value) + "' itemfacet='" + CleanName(facetName) + "' class='pv-facet-facetitem' type='checkbox' />"
            facetControls[i] += "<span class='pv-facet-facetitem-label' title='" + total.value + "'>" + total.value + "</span>";
            facetControls[i] += "<span class='pv-facet-facetitem-count'>0</span>"
            facetControls[i++] += "</li>";
        }
        facetControls[facetControls.length] = "</ul>";
        return facetControls.join('');
    };

    CreateNumberFacet = function (category, values) {
        CreateHistogram(category, PivotViewer.Utils.Histogram(values));
    }

    CreateOrdinalFacet = function (category, values) {
        CreateHistogram(category, PivotViewer.Utils.OrdinalHistogram(values));
    }

    CreateHistogram = function (category, histogram) {
        var w = 165, h = 80, name = CleanName(category.Name);

        var chartWrapper = $("#pv-filterpanel-category-numberitem-" + PivotViewer.Utils.EscapeMetaChars(name));
        chartWrapper.empty();
        chartWrapper.append("<span class='pv-filterpanel-numericslider-range-val'>&nbsp;</span>");
        var chart = "<svg class='pv-filterpanel-accordion-facet-chart' width='" + w + "' height='" + h + "'>";
       
        //work out column width based on chart width
        var columnWidth = (0.5 + (w / histogram.binCount)) | 0;
        //get the largest count from the histogram. This is used to scale the heights
        var maxCount = 0;
        for (var k = 0, _kLen = histogram.histogram.length; k < _kLen; k++)
            maxCount = maxCount < histogram.histogram[k].length ? histogram.histogram[k].length : maxCount;
        //draw the bars
        for (var k = 0, _kLen = histogram.histogram.length; k < _kLen; k++) {
            var barHeight = (0.5 + (h / (maxCount / histogram.histogram[k].length))) | 0;
            var barX = (0.5 + (columnWidth * k)) | 0;
            chart += "<rect x='" + barX + "' y='" + (h - barHeight) + "' width='" + columnWidth + "' height='" + barHeight + "'></rect>";
        }
        chartWrapper.append(chart + "</svg>");
        //add the extra controls
        var p = $("#pv-filterpanel-category-numberitem-" + PivotViewer.Utils.EscapeMetaChars(name));
        p.append('</span><div id="pv-filterpanel-numericslider-' + name + '" class="pv-filterpanel-numericslider"></div><span class="pv-filterpanel-numericslider-range-min">' + histogram.min + '</span><span class="pv-filterpanel-numericslider-range-max">' + histogram.max + '</span>');
        var s = $('#pv-filterpanel-numericslider-' + PivotViewer.Utils.EscapeMetaChars(name));
        s.slider({
            range: true,
            min: histogram.min,
            max: histogram.max,
            values: [histogram.min, histogram.max],
            start: function(event, ui) {this.startMin = ui.values[0]; this.startMax = ui.values[1];},
            slide: function (event, ui) {
                $(this).parent().find('.pv-filterpanel-numericslider-range-val').text(ui.values[0] + " - " + ui.values[1]);
            },
            stop: function (event, ui) {
                var thisWrapped = $(this);
                var thisMin = thisWrapped.slider('option', 'min'), thisMax = thisWrapped.slider('option', 'max');
                if (ui.values[0] > thisMin || ui.values[1] < thisMax)
                    thisWrapped.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
                else if (ui.values[0] == thisMin && ui.values[1] == thisMax)
                    thisWrapped.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
                FilterCollection({category: category, enlarge: this.startMin > ui.values[0] || this.startMax < ui.values[1], min: ui.values[0], max: ui.values[1], rangeMin: thisMin, rangeMax: thisMax});
            }
        });
    };

    /// Creates and initialises the views - including plug-in views
    /// Init shared canvas
    CreateViews = function () {

 
    }

    /// Set the current view
    SelectView = function (viewNumber) {

        DeselectInfoPanel();
        $('#pv-viewpanel-view-' + _currentView + '-image').attr('src', _views[_currentView].GetButtonImage());
        _views[_currentView].Deactivate();
 
        $('#pv-viewpanel-view-' + viewNumber + '-image').attr('src', _views[viewNumber].GetButtonImageSelected());
        _views[viewNumber].Activate();

        _currentView = viewNumber;

        $('.pv-viewpanel-view').hide();
        $('#pv-viewpanel-view-' + _currentView).show();
    };

    //Sorts the facet items based on a specific sort type
    SortFacetItems = function (facetName) {
        if (PivotCollection.GetFacetCategoryByName(facetName).Type == PivotViewer.Models.FacetType.DateTime) return;
        //get facets
        var facetList = $("#pv-cat-" + PivotViewer.Utils.EscapeMetaChars(CleanName(facetName)) + " ul");
        var sortType = facetList.prev().text().replace("Sort: ", "");
        var facetItems = facetList.children("li").get();
        if (sortType == "A-Z") {
            facetItems.sort(function (a, b) {
                var compA = $(a).children().first().attr("itemvalue");
                var compB = $(b).children().first().attr("itemvalue");
                return (compA < compB) ? 1 : (compA > compB) ? -1 : 0;
            });
        } 
        else if (sortType == "Quantity") {
            facetItems.sort(function (a, b) {
                var compA = parseInt($(a).children(".pv-facet-facetitem-count").text());
                var compB = parseInt($(b).children(".pv-facet-facetitem-count").text());
                return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
            });
        } 
        else {
            var facet = PivotCollection.GetFacetCategoryByName(facetName);
            if (facet.CustomSort != undefined) {
                var sortList = [];
                for (var i = facet.CustomSort.SortValues.length - 1; i >= 0; i--) {
                    for (var j = 0; j < facetItems.length; j++) {
                        if (facet.CustomSort.SortValues[i] == $(facetItems[j]).children(".pv-facet-facetitem-label").text())
                            sortList.push(facetItems[j]);
                    }
                }
                facetItems = sortList;
            }
        }
        for (var i = 0; i < facetItems.length; i++) {
            facetList.prepend(facetItems[i]);
        }
    };

    //Selects a string facet
    SelectStringFacetItem = function (facet, value) {
        var cb = $('.pv-facet-facetitem[itemfacet="' + facet + '"][itemvalue="' + value + '"]');
        cb.prop('checked', true);
        cb.parent().parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
    };

    // Filters the collection of items and updates the views
    FilterCollection = function (filterChange) {
        var sort = $('.pv-toolbarpanel-sort option:selected').attr('label');

        DeselectInfoPanel();
        _selectedItem = null;

        //Turn off clear all button
        $('.pv-filterpanel-clearall').css('visibility', 'hidden');

        var stringFacets, datetimeFacets, numericFacets, selectedFacets;
        if (filterChange == undefined) {
            var checked = $('.pv-facet-facetitem:checked');
            stringFacets = []; datetimeFacets = []; numericFacets = [], selectedFacets = [];

            //Filter String facet items
            //create an array of selected facets and values to compare to all items.
            for (var i = 0; i < checked.length; i++) {
                var facet = _nameMapping[$(checked[i]).attr('itemfacet')];
                var facetValue = _nameMapping[$(checked[i]).attr('itemvalue')];
                var category = PivotCollection.GetFacetCategoryByName(facet);

                if (category.Type == PivotViewer.Models.FacetType.String) {
                    var stringFacet = stringFacets[facet];
                    if (stringFacet != undefined) stringFacet.facetValue[facetValue + "a"] = true;
                    else {
                        stringFacet = { facet: facet, facetValue: [], index: i };
                        stringFacet.facetValue[facetValue + "a"] = true;
                        stringFacets.push(stringFacet);
                        stringFacets[facet] = stringFacet;
                        selectedFacets[facet] = true;
                    }
                }
                else if (category.Type == PivotViewer.Models.FacetType.DateTime) {
                    var start = $('#pv-custom-range-' + CleanName(facet) + '__StartDate')[0].value;
                    var end = $('#pv-custom-range-' + CleanName(facet) + '__FinishDate')[0].value;
                    var datetimeValue;
                    if (start && end) datetimeValue = { facetValue: facetValue, startDate: new Date(start), endDate: new Date(end) };
                    else {
                        start = $(checked[i]).attr('startdate');
                        end = $(checked[i]).attr('enddate');
                        datetimeValue = { facetValue: facetValue, startDate: new Date(start), endDate: new Date(end) };
                    }
                    var datetimeFacet = datetimeFacets[facet];
                    if (datetimeFacet != undefined) datetimeFacet.facetValue.push(datetimeValue);
                    else {
                        datetimeFacet = { facet: facet, facetValue: [datetimeValue]};
                        datetimeFacets.push(datetimeFacet);
                        datetimeFacets[facet] = datetimeFacet;
                        selectedFacets[facet] = true;
                    }
                }
            }
            //Numeric facet items. Find all numeric types that have been filtered
            for (var i = 0, _iLen = PivotCollection.FacetCategories.length; i < _iLen; i++) {
                var facet = PivotCollection.FacetCategories[i].Name;
                if (PivotCollection.FacetCategories[i].Type == PivotViewer.Models.FacetType.Number ||
                    PivotCollection.FacetCategories[i].Type == PivotViewer.Models.FacetType.Ordinal) {
                    var numbFacet = $('#pv-filterpanel-category-numberitem-' + CleanName(facet));
                    var sldr = $(numbFacet).find('.pv-filterpanel-numericslider');
                    if (sldr.length > 0) {
                        var range = sldr.slider("values");
                        var rangeMax = sldr.slider('option', 'max'), rangeMin = sldr.slider('option', 'min');
                        if (range[0] != rangeMin || range[1] != rangeMax) {
                            numericFacets.push({ facet: facet, selectedMin: range[0], selectedMax: range[1], rangeMin: rangeMin, rangeMax: rangeMax});
                            numericFacets[facet] = numericFacets[i];
                            selectedFacets[facet] = true;
                        }
                    }
                }
            }
        }
        else {
            stringFacets = _stringFacets; datetimeFacets = _datetimeFacets;
            numericFacets = _numericFacets; selectedFacets = _selectedFacets;
            var category = filterChange.category;
            if (category.Type == PivotViewer.Models.FacetType.Number || category.Type == PivotViewer.Models.FacetType.Ordinal) {
                numericFacet = numericFacets[category.Name];
                if (numericFacet == undefined) {
                    numericFacet = {
                        facet: category.Name, selectedMin: filterChange.min, selectedMax:
                            filterChange.max, rangeMin: filterChange.rangeMin, rangeMax: filterChange.rangeMax
                    };
                    numericFacets.push(numericFacet);
                    numericFacets[category.Name] = numericFacet;
                }
                else {
                    numericFacet.selectedMin = filterChange.min;
                    numericFacet.selectedMax = filterChange.max;
                }
                selectedFacets[category.Name] = true;
            }
            else if ((!filterChange.enlarge && selectedFacets[category.Name] != undefined) || filterChange.clear) {
                if (category.Type == PivotViewer.Models.FacetType.String) {
                    var stringFacet = stringFacets[category.Name];
                    delete stringFacet.facetValue[filterChange.value + "a"];
                    stringFacet.facetValue.splice(stringFacet.facetValue.indexOf(filterChange.value), 1);
                    if (Object.keys(stringFacet.facetValue).length == 0) {
                        delete stringFacets[category.Name];
                        stringFacets.splice(stringFacet.index, 1);
                        delete selectedFacets[category.Name];
                    }
                }
                else {
                    datetimeFacet = datetimeFacets[category.Name];
                    for (var v = 0; v < datetimeFacet.facetValue.length; v++) {
                        if (datetimeFacet.facetValue[v].facetValue == filterChange.value) {
                            datetimeFacet.facetValue.splice(v, 1);
                            if (datetimeFacet.facetValue.length == 0) {
                                delete datetimeFacets[category.Name];
                                datetimeFacets.splice(datetimeFacet.index, 1);
                                delete selectedFacets[category.Name];
                            }
                            break;
                        }
                    }
                }
            }
            else {
                if (category.Type == PivotViewer.Models.FacetType.String) {
                    var stringFacet = stringFacets[category.Name];
                    if (stringFacet != undefined) {
                        stringFacet.facetValue[filterChange.value + "a"] = true;
                        stringFacet.facetValue.push(filterChange.value);
                    }
                    else {
                        stringFacet = { facet: category.Name, facetValue: [filterChange.value], index: i };
                        stringFacet.facetValue[filterChange.value + "a"] = true;
                        stringFacets.push(stringFacet);
                        stringFacets[category.Name] = stringFacet;
                    }
                }
                else {
                    var datetimeValue = { facetValue: filterChange.value, startDate: filterChange.min, endDate: filterChange.max };
                    var datetimeFacet = datetimeFacets[category.Name];
                    if (datetimeFacet != undefined) datetimeFacet.facetValue.push(datetimeValue);
                    else {
                        datetimeFacet = { facet: category.Name, facetValue: [datetimeValue] };
                        datetimeFacets.push(datetimeFacet);
                        datetimeFacets[category.Name] = datetimeFacet;
                    }
                }
                selectedFacets[category.Name] = true;
            }
        }

        //this can be improved. the category info won't change each iteration.
        _filterList = [];
        //Find matching facet values in items
        for (var i = 0, _iLen = _tiles.length; i < _iLen; i++) {
            var tile = _tiles[i];
            if (filterChange != undefined && (!filterChange.enlarge || tile.visible)) {
                if (!filterChange.enlarge && !tile.visible) continue;
                else if (filterChange.enlarge) { _filterList.push(tile); continue; }
                if (filterChange.category.Type == PivotViewer.Models.FacetType.String) {
                    var facet = tile.facetItem.FacetByName[filterChange.category.Name];
                    if (facet == undefined) {
                        if ((filterChange.value == "(no info)") == filterChange.clear) { tile.visible = false; continue; }
                    }
                    else {
                        for (var m = 0; m < facet.FacetValues.length; m++) {
                            if ((facet.FacetValues[m].Value == filterChange.value) != filterChange.clear)  break;
                        }
                        if (m == facet.FacetValues.length) { tile.visible = false; continue; }
                    }
                }
                else if(filterChange.category.Type == PivotViewer.Models.FacetType.Number || 
                    filterChange.category.Type == PivotViewer.Models.FacetType.Ordinal) {
                    var facet = tile.facetItem.FacetByName[filterChange.category.Name];
                    if (facet == undefined) { tile.visible = false; continue; }
                    else {
                        var m, _mLen;
                        for (var m = 0, _mLen = facet.FacetValues.length; m < _mLen; m++) {
                            var parsed = parseFloat(facet.FacetValues[m].Value);
                            facet = numericFacets[category.Name];
                            if (!isNaN(parsed) && parsed >= facet.selectedMin && parsed <= facet.selectedMax)
                                break; // found                        
                        }
                        if (m == _mLen) { tile.visible = false; continue; }
                    }
                }
                else {
                    var facet = tile.facetItem.FacetByName[filterChange.category.Name];
                    var datetimeFacet = datetimeFacets[filterChange.category.Name];
                    if (facet == undefined) {
                        if ((filterChange.value == "(no info)") == filterChange.clear) { tile.visible = false; continue; }
                    }
                    else {
                        var m, _mLen;
                        for (var m = 0, _mLen = facet.FacetValues.length; m < _mLen; m++) {
                            var itemDate = new Date(facet.FacetValues[m].Value)
                            for (var n = 0, _nLen = datetimeFacet.facetValue.length; n < _nLen; n++) {
                                var value = datetimeFacet.facetValue[n];
                                if ((itemDate >= value.startDate && itemDate <= value.endDate) == filterChange.clear) break;
                            }
                            if ((n == _nLen) != filterChange.clear) break;
                        }
                        if ((m == _mLen)) { tile.visible = false; continue; }
                    }
                }
                _filterList.push(tile);
                continue;
            }
            for (var k = 0, _kLen = stringFacets.length; k < _kLen; k++) {
                var facet = tile.facetItem.FacetByName[stringFacets[k].facet];
                if (facet == undefined) {
                    if (!stringFacets[k].facetValue["(no info)a"]) break;
                    else continue;
                }

                var m, _mLen;
                for (var m = 0, _mLen = facet.FacetValues.length; m < _mLen; m++) {
                    if (stringFacets[k].facetValue[facet.FacetValues[m].Value + "a"]) break;
                }
                if (m == _mLen) break; //not found
            }
            if (k < _kLen) {
                tile.visible = false;
                continue; //not found
            }

            for (var k = 0, _kLen = numericFacets.length; k < _kLen; k++) {
                var facet = tile.facetItem.FacetByName[numericFacets[k].facet];
                if (facet == undefined) {
                    if (numericFacets[k].selectedMin == "(no info)") continue; //found
                    else break; //not found
                }

                var m, _mLen;
                for (var m = 0, _mLen = facet.FacetValues.length; m < _mLen; m++) {
                    var parsed = parseFloat(facet.FacetValues[m].Value);
                    if (!isNaN(parsed) && parsed >= numericFacets[k].selectedMin && parsed <= numericFacets[k].selectedMax)
                        break; // found                        
                }
                if (m == _mLen) break; //not found
            }
            if (k < _kLen) {
                tile.visible = false;
                continue; //not found
            }

            for (var k = 0, _kLen = datetimeFacets.length; k < _kLen; k++) {
                var facet = tile.facetItem.FacetByName[datetimeFacets[k].facet];
                if (facet == undefined) {
                    var n, _nLen;
                    for (var n = 0, _nLen = datetimeFacets[k].facetValue.length; n < _nLen; n++) {
                        if (datetimeFacets[k].facetValue[n].facetValue == "(no info)") break; //found
                    }
                    if (n == _nLen) break; //not found
                    else continue;
                }

                var m, _mLen;
                for (var m = 0, _mLen = facet.FacetValues.length; m < _mLen; m++) {
                    var itemDate = new Date(facet.FacetValues[m].Value);
                    for (var n = 0, _nLen = datetimeFacets[k].facetValue.length; n < _nLen; n++) {
                        var value = datetimeFacets[k].facetValue[n];
                        if (itemDate >= value.startDate && itemDate <= value.endDate) break; //found
                    }
                    if (n < _nLen) break; //found
                }
                if (m == _mLen) break; //not found
            }
            if (k < _kLen) { //not found
                tile.visible = false;
                continue; 
            }

            tile.visible = true;
            _filterList.push(tile);
        }
        if (_filterList.length != _tiles.length) $('.pv-filterpanel-clearall').css('visibility', 'visible');

	    // Tidy this up
	    _numericFacets = numericFacets;
	    _stringFacets = stringFacets;
	    _datetimeFacets = datetimeFacets;
	    _selectedFacets = selectedFacets

	    for (var i = 0; i < PivotCollection.FacetCategories.length; i++) {
	        PivotCollection.FacetCategories[i].recount = true;
	    }

        //Filter the facet counts and remove empty facets
	    FilterFacets($($(".pv-facet")[$(".pv-filterpanel-accordion").accordion("option", "active")]));

	    $("#pv-toolbarpanel-countbox").html(_filterList.length);

        //Update breadcrumb
	    var bc = $('.pv-toolbarpanel-facetbreadcrumb');
	    bc.empty();

	    if (stringFacets.length > 0 || numericFacets.length > 0 || datetimeFacets.length > 0) {
	        var bcItems = "|";
	        for (var i = 0, _iLen = stringFacets.length; i < _iLen; i++) {
	            bcItems += "<span class='pv-toolbarpanel-facetbreadcrumb-facet'>" + stringFacets[i].facet + ":</span><span class='pv-toolbarpanel-facetbreadcrumb-values'>"
	            bcItems += stringFacets[i].facetValue.join(', ');
	            bcItems += "</span><span class='pv-toolbarpanel-facetbreadcrumb-separator'>&gt;</span>";
	        }

	        for (var i = 0, _iLen = numericFacets.length; i < _iLen; i++) {
	            bcItems += "<span class='pv-toolbarpanel-facetbreadcrumb-facet'>" + numericFacets[i].facet + ":</span><span class='pv-toolbarpanel-facetbreadcrumb-values'>"
	            if (numericFacets[i].selectedMin == numericFacets[i].rangeMin)
	                bcItems += "Under " + numericFacets[i].selectedMax;
	            else if (numericFacets[i].selectedMax == numericFacets[i].rangeMax)
	                bcItems += "Over " + numericFacets[i].selectedMin;
	            else if (numericFacets[i].selectedMin == numericFacets[i].selectedMax) bcItems += numericFacets[i].selectedMin;
	            else bcItems += numericFacets[i].selectedMin + " - " + numericFacets[i].selectedMax;
	            bcItems += "</span><span class='pv-toolbarpanel-facetbreadcrumb-separator'>&gt;</span>";
	        }

	        for (var i = 0, _iLen = datetimeFacets.length; i < _iLen; i++) {
	            for (var j = 0; j < datetimeFacets[i].facetValue.length; j++) {
	                bcItems += "<span class='pv-toolbarpanel-facetbreadcrumb-facet'>" + datetimeFacets[i].facet + ":</span><span class='pv-toolbarpanel-facetbreadcrumb-values'>"
	                //bcItems += "Between " + datetimeFacets[i].facetValue[j].startDate + " and " + datetimeFacets[i].facetValue[j].endDate;
	                bcItems += datetimeFacets[i].facetValue[j].facetValue;
	                bcItems += "</span><span class='pv-toolbarpanel-facetbreadcrumb-separator'>&gt;</span>";
	            }
	        }
	        bc.append(bcItems);

	        //Filter view
	        TileController.SetCircularEasingBoth();
	    }

        $.publish("/PivotViewer/Views/Filtered", [{tiles: _tiles, filter: _filterList, sort: sort, stringFacets: stringFacets}]);
    };

    InitUIFacet = function (category) {
        Loader.LoadColumn(category);
        LoadSem.acquire(function (release) {
            var uiFacet = $("#pv-cat-" + CleanName(category.Name));
            if (category.Type == PivotViewer.Models.FacetType.DateTime) {
                CreateDatetimeBuckets(category);
                uiFacet.append(CreateBucketizedDateTimeFacets(category.Name, category.datetimeBuckets[0], category.datetimeBuckets[1]));
                uiFacet.append(CreateDatetimeNoInfoFacet(category.Name));
                uiFacet.append(CreateCustomRange(category.Name));
                $("#pv-cat-" + CleanName(category.Name) + " .pv-facet-customrange").on('change', function (e) { CustomRangeChanged(this); });
                $("#pv-cat-" + CleanName(category.Name) + " .pv-facet-facetitem").on("click", function (e) { FacetItemClick(this); });
                $("#pv-cat-" + CleanName(category.Name) + " .pv-facet-facetitem-label").on("click", function (e) {
                    var cb = $(this).prev();
                    cb.prop("checked", !cb.prop("checked"));
                    FacetItemClick(cb[0]);
                });
            }
            else if (category.Type == PivotViewer.Models.FacetType.String) {
                for (var i = 0; i < PivotCollection.Items.length; i++) {
                    var item = PivotCollection.Items[i];
                    var facet = item.FacetByName[category.Name];
                    if (facet != undefined) {
                        for (var k = 0; k < facet.FacetValues.length; k++) {
                            var value = facet.FacetValues[k].Value;
                            var id = "pv-facet-item-" + CleanName(facet.Name) + "__" + CleanName(facet.FacetValues[k].Value);
                            var values = _facetItemTotals[facet.Name];
                            if (values == undefined) values = _facetItemTotals[facet.Name] = { values: [], facet: facet.Name, filtered: true };
                            var total = values.values[value];
                            if (total == undefined) {
                                values.values[value] = ({ id: id, value: value, count: 1 });
                                _wordWheelItems.push({ facet: facet.Name, value: value });
                            }
                            else total.count++;
                        }
                    }
                    else {
                        var id = "pv-facet-item-" + CleanName(category.Name) + "__" + CleanName("(no info)");
                        var values = _facetItemTotals[category.Name];
                        if (values == undefined) values = _facetItemTotals[category.Name] = { values: [], facet: category.Name, filtered: true };
                        var total = values.values["(no info)"];
                        if (total == undefined) values.values["(no info)"] = ({ id: id, value: "(no info)", count: 1 });
                        else total.count++;
                    }
                }
                if (category.CustomSort != undefined || category.CustomSort != null)
                    uiFacet.append("<span class='pv-filterpanel-accordion-facet-sort' customSort='" + category.CustomSort.Name + "'>Sort: " + category.CustomSort.Name + "</span>");
                else uiFacet.append("<span class='pv-filterpanel-accordion-facet-sort'>Sort: A-Z</span>");
                uiFacet.append(CreateStringFacet(category.Name));
                var facetItem = _facetItemTotals[category.Name];
                for (value in facetItem.values) {
                    total = facetItem.values[value];
                    total.valueItem = $("#" + total.id);
                    total.itemCount = total.valueItem.find('span').last();
                }
                $("#pv-cat-" + CleanName(category.Name) + " .pv-facet-facetitem").on("click", function (e) { FacetItemClick(this); });
                $("#pv-cat-" + CleanName(category.Name) + " .pv-facet-facetitem-label").on("click", function (e) {
                    var cb = $(this).prev();
                    cb.prop("checked", !cb.prop("checked"));
                    FacetItemClick(cb[0]);
                });
                $("#pv-cat-" + CleanName(category.Name) + " .pv-filterpanel-accordion-facet-sort").on("click", function (e) {
                    var sortDiv = $(this), sortText = sortDiv.text(), facetName = sortDiv.parent().prev().children('a').text();
                    var customSort = sortDiv.attr("customSort");
                    if (sortText == "Sort: A-Z") $(this).text("Sort: Quantity");
                    else if (sortText == "Sort: Quantity" && customSort == undefined) $(this).text("Sort: A-Z");
                    else if (sortText == "Sort: Quantity") $(this).text("Sort: " + customSort);
                    else $(this).text("Sort: A-Z");
                    SortFacetItems(facetName);
                });
            }
            else if (category.Type == PivotViewer.Models.FacetType.Number) {
                for (var i = 0; i < PivotCollection.Items.length; i++) {
                    var item = PivotCollection.Items[i];
                    var facet = item.FacetByName[category.Name];
                    if (facet != undefined) {
                        for (var k = 0; k < facet.FacetValues.length; k++) {
                            var value = facet.FacetValues[k].Value, total = _facetNumericItemTotals[facet.Name];
                            if (total != undefined) total.values.push(value);
                            else _facetNumericItemTotals[facet.Name] = { facet: facet.Name, values: [value], filtered: true };
                        }
                    }
                    else {
                        var id = "pv-facet-item-" + CleanName(category.Name) + "__" + CleanName("(no info)");
                        var values = _facetItemTotals[category.Name];
                        if (values == undefined) values = _facetItemTotals[category.Name] = { values: [], facet: category.Name, filtered: true };
                        var total = values.values["(no info)"];
                        if (total == undefined) values.values["(no info)"] = ({ id: id, value: "(no info)", count: 1 });
                        else total.count++;
                    }
                }
                uiFacet.append("<div id='pv-filterpanel-category-numberitem-" + CleanName(category.Name) + "'></div>");
                CreateNumberFacet(category, _facetNumericItemTotals[category.Name].values);
            }
            else if (category.Type == PivotViewer.Models.FacetType.Ordinal) {
                for (var i = 0; i < PivotCollection.Items.length; i++) {
                    var item = PivotCollection.Items[i];
                    var facet = item.FacetByName[category.Name];
                    if (facet != undefined) {
                        for (var k = 0; k < facet.FacetValues.length; k++) {
                            var value = facet.FacetValues[k].Value, total = _facetOrdinalItemTotals[facet.Name];
                            if (total != undefined) total.values.push(value);
                            else _facetOrdinalItemTotals[facet.Name] = { facet: facet.Name, values: [value], filtered: true };
                        }
                    }
                    else {
                        var id = "pv-facet-item-" + CleanName(category.Name) + "__" + CleanName("(no info)");
                        var values = _facetItemTotals[category.Name];
                        if (values == undefined) values = _facetItemTotals[category.Name] = { values: [], facet: category.Name, filtered: true };
                        var total = values.values["(no info)"];
                        if (total == undefined) values.values["(no info)"] = ({ id: id, value: "(no info)", count: 1 });
                        else total.count++;
                    }
                }
                uiFacet.append("<div id='pv-filterpanel-category-numberitem-" + CleanName(category.Name) + "'></div>");
                CreateOrdinalFacet(category, _facetOrdinalItemTotals[category.Name].values);
            }

            category.uiInit = true;
            release();
        });
    }

    // Filters the facet panel items and updates the counts
    FilterFacets = function (viewFacet) {
        var category = PivotCollection.GetFacetCategoryByName(viewFacet.children()[0].innerHTML);
        if (!category.IsFilterVisible || !category.recount) return;

        if (!category.uiInit) InitUIFacet(category);
        
        LoadSem.acquire(function (release) {
            var checkList = [];
            if (_filterList.length * 2 < _tiles.length) checkList = _filterList;
            else {
                for (var i = 0; i < _tiles.length; i++) {
                    if (!_tiles[i].visible) checkList.push(_tiles[i]);
                }
            }

            if (category.Type == PivotViewer.Models.FacetType.String) {
                var filterList = [];
                var emptyItem = PivotViewer.Utils.EscapeMetaChars('pv-facet-item-' + CleanName(category.Name) + '__' + CleanName("(no info)"));
                for (var j = 0; j < checkList.length; j++) {
                    var facet = checkList[j].facetItem.FacetByName[category.Name];
                    if (facet == undefined) {
                        var filteredItem = filterList[emptyItem];
                        if (filteredItem != undefined) filteredItem.count++;
                        else filterList[emptyItem] = { count: 1 };
                        continue;
                    }
                    for (var k = 0; k < facet.FacetValues.length ; k++) {
                        var item = PivotViewer.Utils.EscapeMetaChars('pv-facet-item-' + CleanName(category.Name) + '__' + CleanName(facet.FacetValues[k].Value));
                        var filteredItem = filterList[item];
                        if (filteredItem != undefined) filteredItem.count++;
                        else filterList[item] = { count: 1 };
                    }
                }

                if (checkList == _filterList) {
                    var values = _facetItemTotals[category.Name].values;
                    for (var value in values) {
                        var item = values[value];
                        if (filterList[item.id] == undefined) {
                            if (!_selectedFacets[category.Name]) item.valueItem.hide();
                        }
                        else {
                            item.valueItem.show();
                            item.itemCount.text(filterList[item.id].count);
                        }
                    }
                }
                else {
                    var values = _facetItemTotals[category.Name].values;
                    for (var value in values) {
                        var item = values[value];
                        var count;
                        if (filterList[item.id] == undefined) count = _facetItemTotals[category.Name].values[value].count;
                        else count = _facetItemTotals[category.Name].values[value].count - filterList[item.id].count;
                        if (count == 0) {
                            if (!_selectedFacets[category.Name]) item.valueItem.hide();
                        }
                        else {
                            item.valueItem.show();
                            item.itemCount.text(count);
                        }
                    }
                }
                SortFacetItems(category.Name);
            }
            else if (category.Type == PivotViewer.Models.FacetType.DateTime) {
                var filterList = [];
                var emptyItem = PivotViewer.Utils.EscapeMetaChars('#pv-facet-item-' + CleanName(category.Name) + '__' + CleanName("(no info)"));
                for (var i = 0; i < checkList.length; i++) {
                    var facet = checkList[i].facetItem.FacetByName[category.Name];
                    if (facet == undefined) {
                        var filteredItem = filterList[emptyItem];
                        if (filteredItem != undefined) filteredItem.count++;
                        else filterList[item] = { count: 1 };
                    }
                    else {
                        for (var j = 0; j < category.datetimeBuckets.length && j < 2; j++) {
                            var group = category.datetimeBuckets[j];
                            for (var k = 0; k < group.length; k++) {
                                if (group[k].items[checkList[i].facetItem.Id + "a"] == undefined) continue;
                                var item = PivotViewer.Utils.EscapeMetaChars("#pv-facet-item-" + CleanName(category.Name) + "__" + CleanName(group[k].name.toString()));
                                var filteredItem = filterList[item];
                                if (filteredItem != undefined) filteredItem.count++;
                                else filterList[item] = { count: 1 };
                                break;
                            }
                        }
                    }
                }

                if (checkList == _filterList) {
                    for (var j = 0; j < category.datetimeBuckets.length && j < 2; j++) {
                        var group = category.datetimeBuckets[j];
                        for (var k = 0; k < group.length; k++) {
                            item = PivotViewer.Utils.EscapeMetaChars("#pv-facet-item-" + CleanName(category.Name) + "__" + CleanName(group[k].name.toString()));
                            if (filterList[item] == undefined) {
                                if (!_selectedFacets[category.Name]) $(item).hide();
                            }
                            else {
                                $(item).show();
                                $(item).find('span').last().text(filterList[item].count);
                            }
                        }
                    }
                }
                else {
                    for (var j = 0; j < category.datetimeBuckets.length && j < 2; j++) {
                        var group = category.datetimeBuckets[j];
                        for (var k = 0; k < group.length; k++) {
                            item = PivotViewer.Utils.EscapeMetaChars("#pv-facet-item-" + CleanName(category.Name) + "__" + CleanName(group[k].name.toString()));
                            var count;
                            if (filterList[item] == undefined) count = group[k].items.length;
                            else count = group[k].items.length - filterList[item].count;
                            if (count == 0) {
                                if (!_selectedFacets[category.Name]) $(item).hide();
                            }
                            else {
                                $(item).show();
                                $(item).find('span').last().text(count);
                            }
                        }
                    }
                }
            }
            else if (category.Type == PivotViewer.Models.FacetType.Number) {
                if (_filterList.length == _tiles.length)
                    CreateNumberFacet(category, _facetNumericItemTotals[category.Name].values);
                else {
                    var values = [];
                    for (var i = 0; i < _filterList.length; i++) {
                        var facet = _filterList[i].facetItem.FacetByName[category.Name];
                        if (facet == undefined) continue;
                        for (var v = 0; v < facet.FacetValues.length; v++) {
                            values.push(facet.FacetValues[v].Value);
                        }
                    }
                    CreateNumberFacet(category, values);
                }
            }
            else if (category.Type == PivotViewer.Models.FacetType.Ordinal) {
                if (_filterList.length == _tiles.length)
                    CreateOrdinalFacet(category, _facetOrdinalItemTotals[category.Name].values);
                else {
                    var values = [];
                    for (var i = 0; i < _filterList.length; i++) {
                        var facet = _filterList[i].facetItem.FacetByName[category.Name];
                        if (facet == undefined) continue;
                        for (var v = 0; v < facet.FacetValues.length; v++) {
                            values.push(facet.FacetValues[v].Value);
                        }
                    }
                    CreateOrdinalFacet(category, values);
                }
            }

            category.recount = false;
            release();
        });
    };

    DeselectInfoPanel = function () {
        //de-select details
        $('.pv-infopanel').fadeOut();
        $('.pv-infopanel-heading').empty();
        $('.pv-infopanel-details').empty();
    };

    CleanName = function (uncleanName) {
        name = uncleanName.replace(/[^\w]/gi, '_');
        _nameMapping[name] = uncleanName;      
        return name;
    }

    //Events
    $.subscribe("/PivotViewer/Models/Collection/Loaded", function (event) {
        $.cookie.json = true;
        settings.visibleCategories = $.cookie(PivotCollection.CollectionName + "_visible_categories");
        if (settings.visibleCategories == undefined) {
            settings.visibleCategories = [];
            for (var i = 0; i < PivotCollection.FacetCategories.length; i++) {
                settings.visibleCategories.push(i);
            }
        }

        //toolbar
        var toolbarPanel = "<div class='pv-toolbarpanel'>";

        var brandImage = PivotCollection.BrandImage;
        if (brandImage.length > 0) toolbarPanel += "<img class='pv-toolbarpanel-brandimage' src='" + brandImage + "'></img>";
        toolbarPanel += "<span class='pv-toolbarpanel-name'>" + PivotCollection.CollectionName + "</span>";
        toolbarPanel += "<span class='pv-countbox' id='pv-toolbarpanel-countbox' width=25></span>";
        toolbarPanel += "<div class='pv-toolbarpanel-facetbreadcrumb'></div>";
        toolbarPanel += "<div class='pv-toolbarpanel-zoomcontrols'><div class='pv-toolbarpanel-zoomslider'></div>";
        toolbarPanel += "<div class='pv-toolbarpanel-timelineselector'></div>";
        toolbarPanel += "<div class='pv-toolbarpanel-maplegend'></div></div>";
        toolbarPanel += "<div class='pv-toolbarpanel-viewcontrols'></div>";
        toolbarPanel += "<div class='pv-toolbarpanel-sortcontrols'></div>";
        toolbarPanel += "</div>";
        _self.append(toolbarPanel);

        //setup zoom slider
        var thatRef = 0;
        $('.pv-toolbarpanel-zoomslider').slider({
            max: 100,
            change: function (event, ui) {
                var val = ui.value - thatRef;
                $.publish("/PivotViewer/Views/Canvas/Zoom", [{ x: $('.pv-viewarea-canvas').width() / 2, y: $('.pv-viewarea-canvas').height() / 2, delta: (0.5 * val) }]);
                thatRef = ui.value;
            }
        });

        //main panel
        _self.append("<div class='pv-mainpanel'></div>");
        var mainPanelHeight = $(window).height() - $('.pv-toolbarpanel').height() - 30;
        $('.pv-mainpanel').css('height', mainPanelHeight + 'px');
        $('.pv-mainpanel').append("<div class='pv-filterpanel'></div>");
        $('.pv-mainpanel').append("<div class='pv-viewpanel'><canvas class='pv-viewarea-canvas' width='" + _self.width() + "' height='" + mainPanelHeight + "px'></canvas></div>");
        $('.pv-mainpanel').append("<div class='pv-infopanel'></div>");

        //add grid for tableview to the mainpanel
        $('.pv-viewpanel').append("<div class='pv-tableview-table' id='pv-table'></div>");

        //add canvas for map to the mainpanel
        $('.pv-viewpanel').append("<div class='pv-mapview-canvas' id='pv-map-canvas'></div>");
        //add map legend 
        $('.pv-mainpanel').append("<div class='pv-mapview-legend' id='pv-map-legend'></div>");

        //add canvas for timeline to the mainpanel
        $('.pv-viewpanel').append("<div class='pv-timeview-canvas' id='pv-time-canvas'></div>");
        $('.pv-mapview-legend').css('left', (($('.pv-mainpanel').offset().left + $('.pv-mainpanel').width()) - 205) + 'px').css('height', mainPanelHeight - 28 + 'px');


        //filter panel
        var filterPanel = $('.pv-filterpanel');
        filterPanel.append("<div class='pv-filterpanel-clearall'>Clear All</div>")
            .append("<input class='pv-filterpanel-search' type='text' placeholder='Search...' /><div class='pv-filterpanel-search-autocomplete'></div>")
            .css('height', mainPanelHeight - 13 + 'px');
        if (navigator.userAgent.match(/iPad/i) != null)
            $('.pv-filterpanel-search').css('width', filterPanel.width() - 10 + 'px');
        else $('.pv-filterpanel-search').css('width', filterPanel.width() - 2 + 'px');
        $('.pv-filterpanel-search-autocomplete').css('width', filterPanel.width() - 8 + 'px').hide();

        //info panel
        var infoPanel = $('.pv-infopanel');
        infoPanel.css('left', (($('.pv-mainpanel').offset().left + $('.pv-mainpanel').width()) - 205) + 'px').css('height', mainPanelHeight - 28 + 'px');
        infoPanel.append("<div class='pv-infopanel-controls'></div>");
        $('.pv-infopanel-controls').append("<div><div class='pv-infopanel-controls-navleft'></div><div class='pv-infopanel-controls-navleftdisabled'></div><div class='pv-infopanel-controls-navbar'></div><div class='pv-infopanel-controls-navright'></div><div class='pv-infopanel-controls-navrightdisabled'></div></div>");
        $('.pv-infopanel-controls-navleftdisabled').hide();
        $('.pv-infopanel-controls-navrightdisabled').hide();
        infoPanel.append("<div class='pv-infopanel-heading'></div>");
        infoPanel.append("<div class='pv-infopanel-details'></div>");
        if (PivotCollection.MaxRelatedLinks > 0) infoPanel.append("<div class='pv-infopanel-related'></div>");
        if (PivotCollection.CopyrightName != "")
            infoPanel.append("<div class='pv-infopanel-copyright'><a href=\"" + PivotCollection.CopyrightHref + "\" target=\"_blank\">" + PivotCollection.CopyrightName + "</a></div>");
        infoPanel.hide();

        //init DZ Controller
        var baseCollectionPath = PivotCollection.ImageBase;
        if (!(baseCollectionPath.indexOf('http', 0) >= 0 || baseCollectionPath.indexOf('www.', 0) >= 0))
            baseCollectionPath = PivotCollection.CollectionBase.substring(0, PivotCollection.CollectionBase.lastIndexOf('/') + 1) + baseCollectionPath;
        var canvasContext = $('.pv-viewarea-canvas')[0].getContext("2d");

        //Init Tile Controller and start animation loop
        TileController = new PivotViewer.Views.TileController(_imageController);
        _tiles = TileController.initTiles(PivotCollection.Items, baseCollectionPath, canvasContext);
        //Init image controller
        _imageController.Setup(baseCollectionPath.replace("\\", "/"));
    });

    $.subscribe("/PivotViewer/Settings/Categories/Changed", function (event) {
        var category = PivotCollection.FacetCategories[event.visibleCategories[0]];
        if (!category.uiInit) InitUIFacet(category);
        LoadSem.acquire(function (release) {
            $(".pv-facet").hide();
            $(".pv-toolbarpanel-sort option").remove();
            for (var i = 0; i < event.visibleCategories.length; i++) {
                $(".pv-facet").eq(event.visibleCategories[i]).show();
                var category = PivotCollection.FacetCategories[event.visibleCategories[i]];
                $(".pv-toolbarpanel-sort").append("<option value='" + CleanName(category.Name) + "' label='" + category.Name + "'>" + category.Name + "</option>");
            }
            FilterFacets($($(".pv-facet")[event.visibleCategories[0]]));
            $('.pv-filterpanel-accordion').accordion('option', 'active', parseFloat(event.visibleCategories[0]));
            $('.pv-filterpanel-accordion').accordion('refresh');
            $(".pv-toolbarpanel-sort").val($($(".pv-toolbarpanel-sort option")[0]).val());
            release();
        });
    });

    $.subscribe("/PivotViewer/ImageController/Collection/Loaded", function (event) {
        var facets = ["<div class='pv-filterpanel-accordion'>"];
        var sort = [];
        var activeNumber = 0;
        for (var i = 0; i < PivotCollection.FacetCategories.length; i++) {
            var category = PivotCollection.FacetCategories[i];
            if (!category.IsFilterVisible) continue;
            activeNumber++;

            facets[i + 1] = "<h3 class='pv-facet' style='display:inherit'><a href='#' title='" + category.Name + "'>";
            facets[i + 1] += category.Name;
            facets[i + 1] += "</a><div class='pv-filterpanel-accordion-heading-clear' facetType='" + category.Type + "'>&nbsp;</div></h3>";
            facets[i + 1] += "<div style='display:'inherit' style='height:30%' id='pv-cat-" + CleanName(category.Name) + "'>";
            facets[i + 1] += "</div>";
            //Add to sort
            sort[i] = "<option value='" + CleanName(category.Name) + "' label='" + category.Name + "'>" + category.Name + "</option>";
        }
        facets[facets.length] = "</div>";
        $(".pv-filterpanel").append(facets.join(''));

        // Minus an extra 25 to leave room for the version number to be added underneath
        $(".pv-filterpanel-accordion").css('height', ($(".pv-filterpanel").height() - $(".pv-filterpanel-search").height() - 75) + "px");

        $(".pv-filterpanel-accordion").accordion({ icons: false });
        $('.pv-toolbarpanel-sortcontrols').append('<select class="pv-toolbarpanel-sort">' + sort.join('') + '</select>');

        // Set the active div in the accordion
        $(".pv-filterpanel-accordion").accordion("option", "active", activeNumber);
        
        var viewPanel = $('.pv-viewpanel');
        var width = _self.width();
        var height = $('.pv-mainpanel').height();
        var offsetX = $('.pv-filterpanel').width() + 18;
        var offsetY = 4;

        //Create instances of all the views
        _views.push(new PivotViewer.Views.GridView());
        _views.push(new PivotViewer.Views.BucketView());
        _views.push(new PivotViewer.Views.GraphView());
        _views.push(new PivotViewer.Views.TableView());
        var mapView = new PivotViewer.Views.MapView2();
        mapView.SetOptions(_options);
        _views.push(mapView);
        _views.push(new PivotViewer.Views.TimeView());

        //init the views interfaces
        for (var i = 0; i < _views.length; i++) {
            try {
                if (_views[i] instanceof PivotViewer.Views.IPivotViewerView) {
                    _views[i].Setup(width, height, offsetX, offsetY, TileController.GetMaxTileRatio());
                    viewPanel.append("<div class='pv-viewpanel-view' id='pv-viewpanel-view-" + i + "'>" + _views[i].GetUI() + "</div>");
                    $('.pv-toolbarpanel-viewcontrols').append("<div class='pv-toolbarpanel-view' id='pv-toolbarpanel-view-" + i + "' title='" + _views[i].GetViewName() + "'><img id='pv-viewpanel-view-" + i + "-image' src='" + _views[i].GetButtonImage() + "' alt='" + _views[i].GetViewName() + "' /></div>");
                } else {
                    var msg = '';
                    msg = msg + 'View does not inherit from PivotViewer.Views.IPivotViewerView<br>';
                    $('.pv-wrapper').append("<div id=\"pv-view-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
                    window.open("#pv-view-error", "_self")
                }
            } catch (ex) { alert(ex.Message); }
        }

        //loading completed
        $('.pv-loading').remove();

        //Apply Viewer State
        if (_viewerState.Facet == null) _viewerState.Facet = PivotCollection.FacetCategories[0].Name;
        $('.pv-toolbarpanel-sort option[value=' + CleanName(_viewerState.Facet) + ']').prop('selected', 'selected');
        //var currentSort = $('.pv-toolbarpanel-sort :selected').attr('label');
        var currentSort = $('.pv-toolbarpanel-sort option').eq(settings.visibleCategories[0]).attr('label');
        var category = PivotCollection.GetFacetCategoryByName(currentSort);
        if (!category.uiInit) InitUIFacet(category);

        LoadSem.acquire(function (release) {
            _tiles.sort(tile_sort_by(currentSort, false, _stringFacets));

            //Filters
            for (var i = 0, _iLen = _viewerState.Filters.length; i < _iLen; i++) {
                var showDateControls = false;
                for (var j = 0, _jLen = _viewerState.Filters[i].Predicates.length; j < _jLen; j++) {
                    var operator = _viewerState.Filters[i].Predicates[j].Operator;
                    if (operator == "GT" || operator == "GE" || operator == "LT" || operator == "LE") {
                        var s = $('#pv-filterpanel-numericslider-' + CleanName(_viewerState.Filters[i].Facet));
                        if (s.length > 0) { // a numeric value 
                            var intvalue = parseFloat(_viewerState.Filters[i].Predicates[j].Value);
                            switch (operator) {
                                case "GT":
                                    s.slider("values", 0, intvalue + 1);
                                    break;
                                case "GE":
                                    s.slider("values", 0, intvalue);
                                    break;
                                case "LT":
                                    s.slider("values", 1, intvalue - 1);
                                    break;
                                case "LE":
                                    s.slider("values", 1, intvalue);
                                    break;
                            }
                            s.parent().find('.pv-filterpanel-numericslider-range-val').text(s.slider("values", 0) + " - " + s.slider("values", 1));
                            s.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
                        }
                        else { // it must be a date range
                            var facetName = CleanName(_viewerState.Filters[i].Facet);
                            var cb = $('#pv-facet-item-' + facetName + '___CustomRange')[0].firstElementChild;
                            cb.checked = true;
                            if (!showDateControls) {
                                GetCustomDateRange(facetName);
                                showDateControls = true;
                            }
                            switch (operator) {
                                case "GE":
                                    $('#pv-custom-range-' + facetName + '__StartDate')[0].value = new Date(_viewerState.Filters[i].Predicates[j].Value);
                                    CustomRangeChanged($('#pv-custom-range-' + facetName + '__StartDate')[0]);
                                    break;
                                case "LE":
                                    $('#pv-custom-range-' + facetName + '__FinishDate')[0].value = new Date(_viewerState.Filters[i].Predicates[j].Value);
                                    CustomRangeChanged($('#pv-custom-range-' + facetName + '__FinishDate')[0]);
                                    break;
                            }
                        }
                    }
                    else if (operator == "EQ") {
                        //String facet
                        SelectStringFacetItem(CleanName(_viewerState.Filters[i].Facet), CleanName(_viewerState.Filters[i].Predicates[j].Value));
                    }
                    else if (operator == "NT") {
                        //No Info string facet
                        SelectStringFacetItem(CleanName(_viewerState.Filters[i].Facet), "_no_info_");
                    }
                }
            }


            FilterCollection();

            if (settings.visibleCategories.length < PivotCollection.FacetCategories.length)
                $.publish("/PivotViewer/Settings/Categories/Changed", [settings]);
            release();
        });

        //Set the width for displaying breadcrumbs as we now know the control sizes 
        //Hardcoding the value for the width of the viewcontrols images (145=29*5) as the webkit browsers 
        //do not know the size of the images at this point.
        var controlsWidth = $('.pv-toolbarpanel').innerWidth() - ($('.pv-toolbarpanel-brandimage').outerWidth(true) + 25 + $('.pv-toolbarpanel-name').outerWidth(true) + 30 + $('.pv-toolbarpanel-zoomcontrols').outerWidth(true) + 174 + $('.pv-toolbarpanel-sortcontrols').outerWidth(true));
        $('.pv-toolbarpanel-facetbreadcrumb').css('width', controlsWidth + 'px');

        var filterPanel = $('.pv-filterpanel');
        filterPanel.append("<div class='pv-filterpanel-version'><a href='#pv-open-version'>About</a>&nbsp<a href='#pv-open-settings'>Settings</a></div>");
        filterPanel.append("<div id='pv-open-version' class='pv-modal-dialog'><div><a href='#pv-modal-dialog-close' title='Close' class='pv-modal-dialog-close'>X</a><h2>HTML5 PivotViewer</h2><p>Version: " + $(PivotViewer)[0].Version + "</p><p>The sources are available on <a href=\"https://github.com/openlink/html5pivotviewer\" target='_blank'>github</a></p></div></div>");
        filterPanel.append("<div id='pv-open-settings' class='pv-modal-dialog modal-xl'><div><a href='#pv-modal-dialog-close' title='Close' class='pv-modal-dialog-close'>X</a><h2>Settings</h2><div id='pv-options-text'>&nbsp;</div></div></div>");
        var html = "<table><tr><td>All Columns:</th><td>Columns to Display:</th><tr><td><select id='all-columns' multiple style='width:250px' size=20>";
        for (var i = 0; i < PivotCollection.FacetCategories.length; i++) {
            html += "<option value=" + i + " id='" + PivotCollection.FacetCategories[i].Name + "'>" + PivotCollection.FacetCategories[i].Name + "</option>";
        }
        html += "</select></td><td><select id='column-select' multiple style='width:250px' size=20>";
        if (settings.visibleCategories.length == 0) html += "<option value='-1'>Select Categories...</option>";
        else {
            for (var i = 0; i < settings.visibleCategories.length; i++) {
                html += "<option value=" + settings.visibleCategories[i] + " id='" + PivotCollection.FacetCategories[settings.visibleCategories[i]].Name + "'>" + PivotCollection.FacetCategories[settings.visibleCategories[i]].Name + "</option>";
            }
        }
        html += "</select></td><td><input id='column-search' placeholder='Search For Variable...' type='text' size=20><p><button id='select-all'>Select All</button><p><button id='deselect-all'>Deselect All</button><p><button id='submit'>Submit</button><p><button id='cancel'>Cancel</button></td></table>";
        $("#pv-options-text").html(html);
        $("#all-columns").dblclick(function (e) {
            var value = parseFloat($("#all-columns").val()), category = PivotCollection.FacetCategories[value];
            if ($("#column-select option[value='-1']").length == 1) $("#column-select option[value='-1']").remove();
            var selectList = $("#column-select option");
            for (var i = 0; i < selectList.length; i++) {
                if (parseFloat(selectList[i].value) == value) break;
                else if (parseFloat(selectList[i].value) > value) {
                    $(selectList[i]).before($("<option></option>").attr("id", category.Name).val(value).html(category.Name));
                    break;
                }
            }
            if (i == selectList.length) $("#column-select").append("<option value=" + value + " id='" + category.Name + "'>" + category.Name + "</option>");
        });
        $("#column-select").dblclick(function (e) {
            var value = parseFloat($("#column-select").val()), category = PivotCollection.FacetCategories[value];
            $("#column-select option[value='" + value + "']").remove();
            if ($("#column-select option").length == 0) $("#column-select").append("<option value='-1'>Select Categories...</option>");
        });
        $("#select-all").click(function (e) {
            $("#column-select option").remove();
            var selectList = $("#all-columns option");
            for (var i = 0; i < selectList.length; i++) {
                $("#column-select").append("<option value=" + selectList[i].value + " id='" + PivotCollection.FacetCategories[parseFloat(selectList[i].value)].Name + "'>" +
                    PivotCollection.FacetCategories[parseFloat(selectList[i].value)].Name + "</option>");
            }
        });
        $("#deselect-all").click(function (e) {
            $("#column-select option").remove();
            $("#column-select").append("<option value='-1'>Select Categories...</option>");
        });
        $("#submit").click(function (e) {
            settings.visibleCategories = [];
            var selectList = $("#column-select option");
            for (var i = 0; i < selectList.length; i++) {
                settings.visibleCategories.push(selectList[i].value);
            }
            $.cookie(PivotCollection.CollectionName + "_visible_categories", settings.visibleCategories, { expires: 365 });
            $.publish("/PivotViewer/Settings/Categories/Changed", [settings]);
            window.open("#pv-modal-dialog-close", "_self");

            var currentSort = $('.pv-toolbarpanel-sort option').eq(0).attr('label');
            var category = PivotCollection.GetFacetCategoryByName(currentSort);
            if (!category.uiInit) InitUIFacet(category);
            LoadSem.acquire(function (release) {
                _tiles.sort(tile_sort_by(currentSort, false, _stringFacets));
                _filterList = [];
                for (var i = 0; i < _tiles.length; i++) {
                    if (_tiles[i].visible) {
                        _filterList.push(_tiles[i]);
                    }
                }
                $.publish("/PivotViewer/Views/Filtered", [{ tiles: _tiles, filter: _filterList, sort: currentSort }]);
                release();
            });

        });
        $("#cancel").click(function (e) { window.open("#pv-modal-dialog-close", "_self"); });

        $("#column-search").on("keyup", function (e) {
            $("#all-columns option").show();
            if (!e.target.value == "") $("#all-columns option:not([id*='" + e.target.value + "'])").hide();
            $("#column-select option").show();
            if (!e.target.value == "") $("#column-select option:not([id*='" + e.target.value + "'])").hide();
        });

        //Event Handlers
        //View click
        $('.pv-toolbarpanel-view').on("click", function (e) {
            var viewId = this.id.substring(this.id.lastIndexOf('-') + 1, this.id.length);
            if (viewId != null) SelectView(parseInt(viewId));
        });
        //Sort change
        $('.pv-toolbarpanel-sort').on('change', function (e) {
            var currentSort = $('.pv-toolbarpanel-sort option:selected').attr('label');
            var category = PivotCollection.GetFacetCategoryByName(currentSort);
            if (!category.uiInit) InitUIFacet(category);
            LoadSem.acquire(function (release) {
                _tiles.sort(tile_sort_by(currentSort, false, _stringFacets));
                _filterList = [];
                for (var i = 0; i < _tiles.length; i++) {
                    if (_tiles[i].visible) {
                        _filterList.push(_tiles[i]);
                    }
                }
                $.publish("/PivotViewer/Views/Filtered", [{ tiles: _tiles, filter: _filterList, sort: currentSort }]);
                release();
            });
        });

        $(".pv-facet").on("click", function (e) { FilterFacets($(this)); });

        //Facet clear all click
        $('.pv-filterpanel-clearall').on("click", function (e) {
            //deselect all String Facets
            var checked = $('.pv-facet-facetitem:checked');
            checked.prop("checked", false);
            for (var i = 0; i < checked.length; i++) {
                if ($(checked[i]).attr('itemvalue') == "CustomRange")
                    HideCustomDateRange($(checked[i]).attr('itemfacet'));
            }
            //Reset all Numeric Facets
            var sliders = $('.pv-filterpanel-numericslider');
            for (var i = 0; i < sliders.length; i++) {
                var slider = $(sliders[i]), thisMin = slider.slider('option', 'min'), thisMax = slider.slider('option', 'max');
                slider.slider('values', 0, thisMin);
                slider.slider('values', 1, thisMax);
                slider.prev().prev().html('&nbsp;');
            }
            //Clear search box
            $('.pv-filterpanel-search').val('');
            //turn off clear buttons
            $('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
            FilterCollection();
        });
        //Facet clear click
        $('.pv-filterpanel-accordion-heading-clear').on("click", function (e) {
            //Get facet type
            var facetType = this.attributes['facetType'].value;
            if (facetType == "DateTime") {
                //get selected items in current group
                var checked = $(this.parentElement).next().find('.pv-facet-facetitem:checked');
                checked.prop('checked', false);
                for (var i = 0; i < checked.length; i++) HideCustomDateRange($(checked[i]).attr('itemfacet'));
            }
            else if (facetType == "String") $(this.parentElement).next().find('.pv-facet-facetitem:checked').prop("checked", false);
            else if (facetType == "Number" || facetType == "Ordinal") {
                //reset range
                var slider = $(this.parentElement).next().find('.pv-filterpanel-numericslider');
                var thisMin = slider.slider('option', 'min'), thisMax = slider.slider('option', 'max');
                slider.slider('values', 0, thisMin);
                slider.slider('values', 1, thisMax);
                slider.prev().prev().html('&nbsp;');
            }
            FilterCollection();
            $(this).css('visibility', 'hidden');
        });

        //Datetime Facet Custom Range Text input changed
        $('.pv-facet-customrange').on('change', function (e) { CustomRangeChanged(this); });
        //Info panel
        $('.pv-infopanel-details').on("click", '.detail-item-value-filter', function (e) {
            $.publish("/PivotViewer/Views/Item/Filtered", [{ Facet: $(this).parent().children().attr('pv-detail-item-title'), Item: this.getAttribute('pv-detail-item-value'), Values: null, ClearFacetFilters: true }]);
            return false;
        });
        $('.pv-infopanel-details').on("click", '.pv-infopanel-detail-description-more', function (e) {
            var that = $(this);
            var details = that.prev();
            if (that.text() == "More") { details.css('height', ''); that.text('Less'); }
            else { details.css('height', '100px'); that.text('More'); }
        });
        $('.pv-infopanel-controls-navleft').on("click", function (e) {
            for (var i = 1; i < _filterList.length; i++) {
                if (_filterList[i].facetItem.Id == _selectedItem.facetItem.Id) {
                    var item = _filterList[i - 1];
                    $.publish("/PivotViewer/Views/Item/Selected", [{ item: item, bkt: 0 }]);
                    if (_currentView == 0 || _currentView == 1) {
                        selectedCol = _views[_currentView].GetSelectedCol(item);
                        selectedRow = _views[_currentView].GetSelectedRow(item);
                        _views[_currentView].CenterOnSelectedTile(selectedCol, selectedRow);
                    }
                    break;
                }
            }
        });
        $('.pv-infopanel-controls-navright').on("click", function (e) {
            for (var i = 0; i < _filterList.length - 1; i++) {
                if (_filterList[i].facetItem.Id == _selectedItem.facetItem.Id) {
                    var item = _filterList[i + 1];
                    $.publish("/PivotViewer/Views/Item/Selected", [{ item: item, bkt: 0 }]);
                    if (_currentView == 0 || _currentView == 1) {
                        selectedCol = _views[_currentView].GetSelectedCol(item);
                        selectedRow = _views[_currentView].GetSelectedRow(item);
                        _views[_currentView].CenterOnSelectedTile(selectedCol, selectedRow);
                    }
                    break;
                }
            }
        });
        //Search
        $('.pv-filterpanel-search').on('keyup', function (e) {
            var foundAlready = [];
            var autocomplete = $('.pv-filterpanel-search-autocomplete');
            autocomplete.empty();

            //Esc
            if (e.keyCode == 27) {
                $(e.target).blur(); //remove focus
                return;
            }

            for (var i = 0, _iLen = _wordWheelItems.length; i < _iLen; i++) {
                var wwi = _wordWheelItems[i].value.toLowerCase();
                if (wwi.indexOf(e.target.value.toLowerCase()) >= 0) {
                    if ($.inArray(wwi, foundAlready) == -1) {
                        foundAlready.push(wwi);
                        //Add to autocomplete
                        autocomplete.append('<span facet="' + _wordWheelItems[i].facet + '">' + _wordWheelItems[i].value + '</span>');
                        if (e.keyCode == 13) {
                            SelectStringFacetItem(CleanName(_wordWheelItems[i].facet), CleanName(_wordWheelItems[i].value));
                            FilterCollection({ category: PivotCollection.GetFacetCategoryByName(_wordWheelItems[i].facet), enlarge: false, value: _wordWheelItems[i].value });
                        }
                    }
                }
            }

            $('.pv-filterpanel-search-autocomplete > span').on('mousedown', function (e) {
                e.preventDefault();
                $('.pv-filterpanel-search').val(e.target.textContent);
                $('.pv-filterpanel-search-autocomplete').hide();
                SelectStringFacetItem(CleanName(e.target.attributes[0].value), CleanName(e.target.textContent));
                FilterCollection({ category: PivotCollection.GetFacetCategoryByName(_wordWheelItems[i].facet), enlarge: false, value: _wordWheelItems[i].value });
            });

            if (foundAlready.length > 0) autocomplete.show();
        });
        $('.pv-filterpanel-search').on('blur', function (e) {
            e.target.value = '';
            $('.pv-filterpanel-search-autocomplete').hide();
        });
        //Shared canvas events
        var canvas = $('.pv-viewarea-canvas');
        //mouseup event - used to detect item selection, or drag end
        canvas.on('mouseup', function (evt) {
            var offset = $(this).offset();
            var offsetX = evt.clientX - offset.left;
            var offsetY = evt.clientY - offset.top;
            if (!_mouseMove || (_mouseMove.x == 0 && _mouseMove.y == 0))
                $.publish("/PivotViewer/Views/Canvas/Click", [{ x: offsetX, y: offsetY }]);
            _mouseDrag = null;
            _mouseMove = false;
        });
        //mouseout event
        canvas.on('mouseout', function (evt) {
            _mouseDrag = null;
            _mouseMove = false;
        });
        //mousedown - used to detect drag
        canvas.on('mousedown', function (evt) {
            var offset = $(this).offset();
            var offsetX = evt.clientX - offset.left;
            var offsetY = evt.clientY - offset.top;
            _mouseDrag = { x: offsetX, y: offsetY };
        });
        //mousemove - used to detect drag
        canvas.on('mousemove', function (evt) {
            var offset = $(this).offset();
            var offsetX = evt.clientX - offset.left;
            var offsetY = evt.clientY - offset.top;

            if (_mouseDrag == null)
                $.publish("/PivotViewer/Views/Canvas/Hover", [{ x: offsetX, y: offsetY }]);
            else {
                _mouseMove = { x: offsetX - _mouseDrag.x, y: offsetY - _mouseDrag.y };
                _mouseDrag = { x: offsetX, y: offsetY };
                $.publish("/PivotViewer/Views/Canvas/Drag", [_mouseMove]);
            }
        });
        //mousewheel - used for zoom
        canvas.on('mousewheel', function (evt, delta) {
            var offset = $(this).offset();
            var offsetX = evt.clientX - offset.left;
            var offsetY = evt.clientY - offset.top;
            //zoom easing different from filter
            TileController.SetQuarticEasingOut();

            //Draw helper
            TileController.DrawHelpers([{ x: offsetX, y: offsetY }]);

            var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
            if (delta > 0) { value = (value < 5) ? 5 : value + 5; }
            else if (delta < 0) { value = value - 5; }

            // Ensure that its limited between 0 and 20
            value = Math.max(0, Math.min(100, value));
            $('.pv-toolbarpanel-zoomslider').slider('option', 'value', value);
        });
        //http://stackoverflow.com/questions/6458571/javascript-zoom-and-rotate-using-gesturechange-and-gestureend
        canvas.on("touchstart", function (evt) {
            var orig = evt.originalEvent;

            var offset = $(this).offset();
            var offsetX = orig.touches[0].pageX - offset.left;
            var offsetY = orig.touches[0].pageY - offset.top;
            _mouseDrag = { x: offsetX, y: offsetY };
        });
        canvas.on("touchmove", function (evt) {
            try {
                var orig = evt.originalEvent;
                evt.preventDefault();

                //pinch
                if (orig.touches.length > 1) {
                    evt.preventDefault();
                    //Get center of pinch
                    var minX = 10000000, minY = 10000000;
                    var maxX = 0, maxY = 0;
                    var helpers = [];
                    for (var i = 0; i < orig.touches.length; i++) {
                        helpers.push({ x: orig.touches[i].pageX, y: orig.touches[i].pageY });
                        if (orig.touches[i].pageX < minX)
                            minX = orig.touches[i].pageX;
                        if (orig.touches[i].pageX > maxX)
                            maxX = orig.touches[i].pageX;
                        if (orig.touches[i].pageY < minY)
                            minY = orig.touches[i].pageY;
                        if (orig.touches[i].pageY > maxY)
                            maxY = orig.touches[i].pageY;
                    }
                    var avgX = (minX + maxX) / 2;
                    var avgY = (minY + maxY) / 2;
                    TileController.SetLinearEasingBoth();

                    helpers.push({ x: avgX, y: avgY });
                    TileController.DrawHelpers(helpers);
                    TileController.DrawHelperText("Scale: " + orig.scale);
                    $.publish("/PivotViewer/Views/Canvas/Zoom", [{ x: avgX, y: avgY, scale: orig.scale }]);
                    return;
                } else {
                    var offset = $(this).offset();
                    var offsetX = orig.touches[0].pageX - offset.left;
                    var offsetY = orig.touches[0].pageY - offset.top;

                    _mouseMove = { x: offsetX - _mouseDrag.x, y: offsetY - _mouseDrag.y };
                    _mouseDrag = { x: offsetX, y: offsetY };
                    $.publish("/PivotViewer/Views/Canvas/Drag", [_mouseMove]);
                }
            }
            catch (err) { Debug.Log(err.message); }
        });

        canvas.on("touchend", function (evt) {
            var orig = evt.originalEvent;
            //Item selected
            if (orig.touches.length == 1 && _mouseDrag == null) {
                var offset = $(this).offset();
                var offsetX = orig.touches[0].pageX - offset.left;
                var offsetY = orig.touches[0].pageY - offset.top;
                if (!_mouseMove || (_mouseMove.x == 0 && _mouseMove.y == 0))
                    $.publish("/PivotViewer/Views/Canvas/Click", [{ x: offsetX, y: offsetY }]);
            }
            _mouseDrag = null;
            _mouseMove = false;
            return;
        });

        LoadSem.acquire(function (release) {
            //select first view
            if (_viewerState.View != null) SelectView(_viewerState.View);
            else SelectView(0);
            TileController.BeginAnimation();
            release();
        });
    });

    //Item selected - show the info panel
    $.subscribe("/PivotViewer/Views/Item/Selected", function (evt) {
        if (evt.item === undefined || evt.item == null) {
            DeselectInfoPanel();
            if (_selectedItem != null) _selectedItem.Selected(false);
            _views[_currentView].SetSelected(null);
            return;
        }

        var selectedItem = evt.item;
        if (selectedItem != null) {
            var alternate = true;
            $('.pv-infopanel-heading').empty();
            $('.pv-infopanel-heading').append("<a href=\"" + selectedItem.facetItem.Href + "\" target=\"_blank\">" + selectedItem.facetItem.Name + "</a></div>");
            var infopanelDetails = $('.pv-infopanel-details');
            infopanelDetails.empty();
            if (selectedItem.Description != undefined && selectedItem.Description.length > 0) {
                infopanelDetails.append("<div class='pv-infopanel-detail-description' style='height:100px;'>" + selectedItem.Description + "</div><div class='pv-infopanel-detail-description-more'>More</div>");
            }
            // nav arrows...
            if (selectedItem.facetItem.Id == _filterList[0].Id) {
                $('.pv-infopanel-controls-navleft').hide();
                $('.pv-infopanel-controls-navleftdisabled').show();
            }
            else {
                $('.pv-infopanel-controls-navleft').show();
                $('.pv-infopanel-controls-navleftdisabled').hide();
            }
            if (selectedItem.facetItem.Id == _filterList[_filterList.length - 1].Id) {
                $('.pv-infopanel-controls-navright').hide();
                $('.pv-infopanel-controls-navrightdisabled').show();
            }
            else {
                $('.pv-infopanel-controls-navright').show();
                $('.pv-infopanel-controls-navrightdisabled').hide();
            }

            var detailDOM = [];
            var detailDOMIndex = 0;

            var facets = Loader.GetRow(selectedItem.facetItem.Id);
            for (var i = 0, k = 0; i < facets.length; i++) {
                var category = PivotCollection.GetFacetCategoryByName(facets[i].Name);
                while (settings.visibleCategories[k] < category.index && k < settings.visibleCategories.length) k++;
                if (k == settings.visibleCategories.length) break;
                else if (settings.visibleCategories[k] > category.index) continue;

                var IsMetaDataVisible = false. IsFilterVisible = false;
                if (category.IsMetaDataVisible) { IsMetaDataVisible = true; IsFilterVisible = true;}
                if (IsMetaDataVisible) {
                    detailDOM[detailDOMIndex] = "<div class='pv-infopanel-detail " + (alternate ? "detail-dark" : "detail-light") + "'><div class='pv-infopanel-detail-item detail-item-title' pv-detail-item-title='" + category.Name + "'>" + category.Name + "</div>";
                    for (var j = 0; j < facets[i].FacetValues.length; j++) {
                        var value = facets[i].FacetValues[j];
                        detailDOM[detailDOMIndex] += "<div pv-detail-item-value='" + value.Value + "' class='pv-infopanel-detail-item detail-item-value" + (IsFilterVisible ? " detail-item-value-filter" : "") + "'>";
                        if (value.Href != null)
                            detailDOM[detailDOMIndex] += "<a class='detail-item-link' href='" + value.Href + "'>" + value.Label + "</a>";
                        else detailDOM[detailDOMIndex] += value.Label;
                        detailDOM[detailDOMIndex] += "</div>";
                    }
                    detailDOM[detailDOMIndex] += "</div>";
                    detailDOMIndex++;
                    alternate = !alternate;
                }
            }
            if (selectedItem.facetItem.Links.length > 0) {
                $('.pv-infopanel-related').empty();
                for (var k = 0; k < selectedItem.facetItem.Links.length; k++) {
                    $('.pv-infopanel-related').append("<a href='" + selectedItem.facetItem.Links[k].Href + "'>" + selectedItem.facetItem.Links[k].Name + "</a><br>");
                }
            }
            infopanelDetails.append(detailDOM.join(''));
            $('.pv-infopanel').fadeIn();
            infopanelDetails.css('height', ($('.pv-infopanel').height() - ($('.pv-infopanel-controls').height() + $('.pv-infopanel-heading').height() + $('.pv-infopanel-copyright').height() + $('.pv-infopanel-related').height()) - 20) + 'px');

            if(_selectedItem != null) _selectedItem.Selected(false);
            selectedItem.Selected(true);

            _selectedItem = selectedItem;
            _selectedItemBkt = evt.bkt;

            _views[_currentView].SetSelected(_selectedItem); 
        }

    });

    $.subscribe("/PivotViewer/Views/Item/Filtered", function (evt) {
        if (evt == undefined || evt == null) return;
        var category = PivotCollection.GetFacetCategoryByName(evt.Facet);
        if (!category.uiInit) InitUIFacet(category);
        LoadSem.acquire(function (release) {
            if (category.Type == PivotViewer.Models.FacetType.String) {
                if (evt.ClearFacetFilters == true) $('.pv-facet-facetitem[itemfacet="' + CleanName(evt.Facet) + '"]:checked').prop('checked', false);
                if (evt.Values) {
                    if (evt.Values.length == 1) {
                        var cb = $(PivotViewer.Utils.EscapeMetaChars("#pv-facet-item-" + CleanName(evt.Facet) + "__" + CleanName(evt.Values[0].toString())) + " input");
                        cb.prop('checked', true);
                        FacetItemClick(cb[0]);
                    }
                    else {
                        for (var j = 0; j < evt.Values.length; j++) {
                            $(PivotViewer.Utils.EscapeMetaChars("#pv-facet-item-" + CleanName(evt.Facet) + "__" + CleanName(evt.Values[j].toString())) + " input").prop('checked', true);
                        }
                        FilterCollection();
                    }
                }
                else {
                    var cb = $(PivotViewer.Utils.EscapeMetaChars("#pv-facet-item-" + CleanName(evt.Facet) + "__" + CleanName(evt.Item.toString())) + " input");
                    cb.prop('checked', true);
                    FacetItemClick(cb[0]);
                }
            }
            else if (category.Type == PivotViewer.Models.FacetType.Number || category.Type == PivotViewer.Models.FacetType.Ordinal) {
                var s = $('#pv-filterpanel-numericslider-' + PivotViewer.Utils.EscapeMetaChars(CleanName(evt.Facet)));
                if (evt.MaxRange == undefined) evt.MaxRange = evt.Item;
                FacetSliderDrag(s, evt.Item, evt.MaxRange);
            }
            else if (category.Type == PivotViewer.Models.FacetType.DateTime) {
                $('#pv-facet-item-' + category.Name + '___CustomRange')[0].firstElementChild.checked = true;
                GetCustomDateRange(category.Name);
                var textbox1 = $('#pv-custom-range-' + CleanName(category.Name) + '__StartDate'),
                    textbox2 = $('#pv-custom-range-' + CleanName(category.Name) + '__FinishDate');
                var minDate = new Date(evt.Item), maxDate = new Date(evt.MaxRange);
                textbox1[0].value = (minDate.getMonth() + 1) + "/" + minDate.getDate() + "/" + minDate.getFullYear();
                textbox2[0].value = (maxDate.getMonth() + 1) + "/" + maxDate.getDate() + "/" + maxDate.getFullYear();
                textbox1.datepicker("option", "minDate", minDate);
                textbox2.datepicker("option", "maxDate", maxDate);

                // Clear any filters already set for this facet
                var checked = $(textbox1[0].parentElement.parentElement.parentElement.parentElement.children).next().find('.pv-facet-facetitem:checked');
                for (var i = 0; i < checked.length; i++) {
                    if ($(checked[i]).attr('itemvalue') != 'CustomRange') $(checked[i]).prop('checked', false);
                }
                FilterCollection();
            }
            release();
        });
    });

    FacetItemClick = function (checkbox) {
        var category = PivotCollection.GetFacetCategoryByName(_nameMapping[$(checkbox).attr('itemfacet')]);
        var value = _nameMapping[$(checkbox).attr('itemvalue')], enlarge, clear; 
        if ($(checkbox).prop('checked')) {
            $(checkbox.parentElement.parentElement.parentElement).prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
            if ($(checkbox).attr('itemvalue') == "CustomRange"){
                GetCustomDateRange($(checkbox).attr('itemfacet'));
                return;
            }
            enlarge = ($("input[itemfacet|='" + $(checkbox).attr("itemfacet") + "']:checked").length > 1);
            clear = false;
        }
        else if (!$(checkbox).prop('checked')) {
            if ($(checkbox).attr('itemvalue') == "CustomRange") HideCustomDateRange($(checkbox).attr('itemfacet'));
            if ($("input[itemfacet|='" + $(checkbox).attr("itemfacet") + "']:checked").length == 0) {
                enlarge = true;
                $(checkbox.parentElement.parentElement.parentElement).prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
            }
            else enlarge = false;
            clear = true;
        }
        if (category.Type == PivotViewer.Models.FacetType.String) FilterCollection({ category: category, enlarge: enlarge, clear: clear, value: value });
        else {
            start = $(checkbox).attr('startdate');
            end = $(checkbox).attr('enddate');
            FilterCollection({ category: category, enlarge: enlarge, clear: clear, value: value, min: new Date(start), max: new Date(end) })
        }

    };

    FacetSliderDrag = function (slider, min, max) {
        var thisWrapped = $(slider);
        var thisMin = thisWrapped.slider('option', 'min'), thisMax = thisWrapped.slider('option', 'max');
        // Treat no info as like 0 (bit dodgy fix later)
        if (min == "(no info)") min = 0;
        if (min > thisMin || max < thisMax) {
            thisWrapped.parent().find('.pv-filterpanel-numericslider-range-val').text(min + " - " + max);
            thisWrapped.slider('values', 0, min);
            thisWrapped.slider('values', 1, max);
            thisWrapped.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
        }
        else if (min == thisMin && max == thisMax)
            thisWrapped.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
        FilterCollection();
    }

    Bucketize = function (bucketGroups, index, bucketName, id, date) {
        if (bucketGroups[index] == undefined) bucketGroups[index] = [];
        var group = bucketGroups[index], bucket = group[bucketName + "a"];
        if (bucket != undefined) {
            bucket.items[id + "a"] = id;
            bucket.items.push(id);
            if (bucket.start > date) bucket.start = date;
            else if (bucket.end < date) bucket.end = date;
        }
        else {
            var bucket = new PivotViewer.Models.DateTimeInfo(bucketName, date, date);
            bucket.items[id + "a"] = id; //needs to be a string
            bucket.items.push(id);
            group.push(bucket);
            group[bucketName + "a"] = bucket;
        }
    };

    CreateDatetimeBuckets = function (category) {
        var min = new Date(8640000000000000), max = new Date(-8640000000000000);

        var hasHours = false, hasMinutes = false, hasSeconds = false;
        for (var j = 0; j < PivotCollection.Items.length; j++) {
            var item = PivotCollection.Items[j], facet = item.FacetByName[category.Name];
            if (facet == undefined) continue;
            var date = new Date(facet.FacetValues[0].Value);
            if (date < min) min = date;
            if (date > max) max = date;
            if (date.getHours() != 0) hasHours = true;
            if (date.getMinutes() != 0) hasMinutes = true;
            if (date.getSeconds() != 0) hasSeconds = true;
        }
        var hasDecades = (max.getFullYear() - min.getFullYear() + min.getFullYear() % 10 > 9),
            hasYears = max.getFullYear() > min.getFullYear(),
            hasMonths = hasYears || max.getMonth() > min.getMonth(),
            hasDays = hasMonths || max.getDate() > min.getDate();

        for (var j = 0; j < PivotCollection.Items.length; j++) {
            var item = PivotCollection.Items[j], facet = item.FacetByName[category.Name];
            if (facet == undefined) continue;
            var date = new Date(facet.FacetValues[0].Value);

            var k = 0;
            var year = date.getFullYear();
            var decade = year - (year % 10);

            if (hasDecades) {
                Bucketize(category.datetimeBuckets, k, decade + "s", item.Id, date);
                category.datetimeBuckets["decade"] = category.datetimeBuckets[k++];
            }
            if (hasYears) {
                Bucketize(category.datetimeBuckets, k, year, item.Id, date);
                category.datetimeBuckets["year"] = category.datetimeBuckets[k++];
            }
            var month = GetMonthName(date);
            if (hasMonths) {
                Bucketize(category.datetimeBuckets, k, month + ", " + year, item.Id, date);
                category.datetimeBuckets["month"] = category.datetimeBuckets[k++];
            }
            var day = date.getDate();
            if (hasDays) {
                Bucketize(category.datetimeBuckets, k, month + " " + day + ", " + year, item.Id, date);
                category.datetimeBuckets["day"] = category.datetimeBuckets[k++];
            }
            var hours = GetStandardHour(date), meridian = GetMeridian(date);
            if (hasHours) {
                Bucketize(category.datetimeBuckets, k, month + " " + day + ", " + year + " " + hours + " " + meridian, item.Id, date);
                category.datetimeBuckets["hour"] = category.datetimeBuckets[k++];
            }
            var mins = GetStandardMinutes(date);
            if (hasMinutes) {
                Bucketize(category.datetimeBuckets, k, month + " " + day + ", " + year + " " + hours + ":" + mins + " " + meridian, item.Id, date);
                category.datetimeBuckets["minute"] = category.datetimeBuckets[k++];
            }
            var secs = GetStandardSeconds(date);
            if (hasSeconds) {
                Bucketize(category.datetimeBuckets, k, month + " " + day + ", " + year + " " + hours + ":" + mins + ":" + secs + " " + meridian, item.Id, date);
                category.datetimeBuckets["second"] = category.datetimeBuckets[k];
            }
        }
        for (var j = 0; j < category.datetimeBuckets.length; j++) {
            category.datetimeBuckets[j].sort(function (a, b) { return a.start - b.start });
        }
    };

    HideCustomDateRange = function (facetName) {
        $('#pv-custom-range-' + facetName + '__Start').css('visibility', 'hidden'); 
        $('#pv-custom-range-' + facetName + '__Finish').css('visibility', 'hidden'); 
        $('#pv-custom-range-' + facetName + '__StartDate').datepicker("setDate", null);
        $('#pv-custom-range-' + facetName + '__FinishDate').datepicker("setDate", null);
        $('#pv-custom-range-' + facetName + '__FinishDate').datepicker("option", "minDate", null);
        $('#pv-custom-range-' + facetName + '__StartDate').datepicker("option", "minDate", null);
        $('#pv-custom-range-' + facetName + '__FinishDate').datepicker("option", "maxDate", null);
        $('#pv-custom-range-' + facetName + '__StartDate').datepicker("option", "maxDate", null);
    };

    GetCustomDateRange = function (facetName) {
        var facet = _nameMapping[facetName];
        var category = PivotCollection.GetFacetCategoryByName(facet);
        var maxYear, minYear;
        var maxDate, minDate;
        $('#pv-custom-range-' + facetName + '__Start').css('visibility', 'visible'); 
        $('#pv-custom-range-' + facetName + '__Finish').css('visibility', 'visible'); 
        $('#pv-custom-range-' + facetName + '__StartDate').datepicker({
            showOn: 'button',
            changeMonth: true,
            changeYear: true,
            buttonText: 'Show Date',
            buttonImageOnly: true,
            buttonImage: 'http://jqueryui.com/resources/demos/datepicker/images/calendar.gif'
        });
        $('#pv-custom-range-' + facetName + '__FinishDate').datepicker({
            showOn: 'button',
            changeMonth: true,
            changeYear: true,
            buttonText: 'Show Date',
            buttonImageOnly: true,
            buttonImage: 'http://jqueryui.com/resources/demos/datepicker/images/calendar.gif'
        });
        if (category.datetimeBuckets["day"].length > 0){
            maxDate = category.datetimeBuckets["day"][category.datetimeBuckets["day"].length - 1].start;
            minDate = category.datetimeBuckets["day"][0].start;
            $('#pv-custom-range-' + facetName + '__StartDate').datepicker( "option", "defaultDate", minDate );
            $('#pv-custom-range-' + facetName + '__FinishDate').datepicker( "option", "defaultDate", maxDate );
            if (category.datetimeBuckets["year"].length > 0) {
                maxYear = category.datetimeBuckets["year"][category.datetimeBuckets["year"].length - 1].name;
                minYear = category.datetimeBuckets["year"][0].name;
                $('#pv-custom-range-' + facetName + '__StartDate').datepicker( "option", "yearRange", minYear + ':' + maxYear );
                $('#pv-custom-range-' + facetName + '__FinishDate').datepicker( "option", "yearRange", minYear + ':' + maxYear );
            }
        }
    };

    CustomRangeChanged = function (textbox) {
        var start;        
        var end;
        if ($(textbox).attr('itemvalue') == "CustomRangeStart") {
            // Check we have value for matching end
            start = $(textbox)[0].value;
            end = $('#pv-custom-range-' + $(textbox).attr('itemfacet') + '__FinishDate')[0].value;
            if (end == "")
                $('#pv-custom-range-' + $(textbox).attr('itemfacet') + '__FinishDate').datepicker("option", "minDate", new Date(start));
        }
        else if ($(textbox).attr('itemvalue') == "CustomRangeFinish") {
            // Check we have value for matching start
            end = $(textbox)[0].value;
            start = $('#pv-custom-range-' + $(textbox).attr('itemfacet') + '__StartDate')[0].value;
            if (start == "")
                $('#pv-custom-range-' + $(textbox).attr('itemfacet') + '__StartDate').datepicker("option", "maxDate", new Date(end));
        }
        if (start && end) {
            // Clear any filters already set for this facet
            var checked = $(textbox.parentElement.parentElement.parentElement.parentElement.children).next().find('.pv-facet-facetitem:checked');
            for (var i = 0; i < checked.length; i++) {
                if ($(checked[i]).attr('itemvalue') != 'CustomRange')
                    $(checked[i]).prop('checked', false);
            }
            FilterCollection();
        }
    };

    //Constructor
    $.fn.PivotViewer = function (method) {
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.PivotViewer');
        }
    };
})(jQuery);