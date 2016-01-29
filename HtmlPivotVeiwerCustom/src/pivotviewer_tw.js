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
var settings = { showMissing: false, visibleCategories: undefined };

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
        _currentSort = null;
        _tiles = [],
        _filterList = [],
        _selectedItem = null,
        _imageController = null,
        _mouseDrag = null,
        _mouseMove = null,
        _self = null,
        _nameMapping = {},
        _options = {};
        

    var methods = {
        // PivotViewer can be initialised with these options:
        // Loader: a loader that inherits from ICollectionLoader must be specified.  Currently the project only includes the CXMLLoader.  It takes the URL of the collection as a parameter.
        // ImageController: defaults to the DeepZoom image controller.
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
		//while (PivotCollection.Items.length == 0){
		
		//}
		//alert("I'm out!");

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

    /// Set the current view
    SelectView = function (view) {
        var number;
        if (typeof view == 'string' || view instanceof String) {
            for (var i = 0; i < _views.length; i++) {
                if (_views[i].GetViewName().toLowerCase().startsWith(view.toLowerCase())) {
                    number = i;
                    break;
                }
            }
        }
        else number = view;

        DeselectInfoPanel();
        $('#pv-viewpanel-view-' + _currentView + '-image').attr('src', _views[_currentView].GetButtonImage());
        _views[_currentView].Deactivate();
 
        $('#pv-viewpanel-view-' + number + '-image').attr('src', _views[number].GetButtonImageSelected());
        _views[number].Activate();

        _currentView = number;

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

    // Filters the collection of items and updates the views
    FilterCollection = function (filterChange) {

        DeselectInfoPanel();
        _selectedItem = null;

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
            if (filterChange != undefined && (!filterChange.enlarge || tile.filtered)) {
                if (!filterChange.enlarge && !tile.filtered) continue;
                else if (filterChange.enlarge) { _filterList.push(tile); continue; }
                if (filterChange.category.Type == PivotViewer.Models.FacetType.String) {
                    var facet = tile.facetItem.FacetByName[filterChange.category.Name];
                    if (facet == undefined) {
                        if ((filterChange.value == "(no info)") == filterChange.clear) { tile.filtered = false; continue; }
                    }
                    else {
                        for (var m = 0; m < facet.FacetValues.length; m++) {
                            if ((facet.FacetValues[m].Value == filterChange.value) != filterChange.clear) break;
                        }
                        if (m == facet.FacetValues.length) { tile.filtered = false; continue; }
                    }
                }
                else if (filterChange.category.Type == PivotViewer.Models.FacetType.Number ||
                    filterChange.category.Type == PivotViewer.Models.FacetType.Ordinal) {
                    var facet = tile.facetItem.FacetByName[filterChange.category.Name];
                    if (facet == undefined) { tile.filtered = false; continue; }
                    else {
                        var m, _mLen;
                        for (var m = 0, _mLen = facet.FacetValues.length; m < _mLen; m++) {
                            var parsed = parseFloat(facet.FacetValues[m].Value);
                            facet = numericFacets[category.Name];
                            if (!isNaN(parsed) && parsed >= facet.selectedMin && parsed <= facet.selectedMax)
                                break; // found                        
                        }
                        if (m == _mLen) { tile.filtered = false; continue; }
                    }
                }
                else {
                    var facet = tile.facetItem.FacetByName[filterChange.category.Name];
                    var datetimeFacet = datetimeFacets[filterChange.category.Name];
                    if (facet == undefined) {
                        if ((filterChange.value == "(no info)") == filterChange.clear) { tile.filtered = false; continue; }
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
                        if ((m == _mLen)) { tile.filtered = false; continue; }
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
                tile.filtered = false;
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
                tile.filtered = false;
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
                tile.filtered = false;
                continue; 
            }

            tile.filtered = true;
            _filterList.push(tile);
        }

	    _numericFacets = numericFacets;
	    _stringFacets = stringFacets;
	    _datetimeFacets = datetimeFacets;
	    _selectedFacets = selectedFacets

	    if (_numericFacets.length != 0 || _stringFacets.length != 0 || _datetimeFacets.length != 0) $('.pv-filterpanel-clearall').css('visibility', 'visible');

	    for (var i = 0; i < PivotCollection.FacetCategories.length; i++) {
	        PivotCollection.FacetCategories[i].recount = true;
	    }

        //Filter the facet counts and remove empty facets
	    FilterFacets($(".pv-facet").eq($(".pv-filterpanel-accordion").accordion("option", "active")));

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

        $.publish("/PivotViewer/Views/Filtered", [{tiles: _tiles, filter: _filterList, sort: _currentSort, stringFacets: stringFacets}]);
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
                $("#pv-cat-" + CleanName(category.Name) + " .pv-facet-facetitem").click(function (e) { FacetItemClick(this); });
                $("#pv-cat-" + CleanName(category.Name) + " .pv-facet-facetitem-label").click(function (e) {
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
                $("#pv-cat-" + CleanName(category.Name) + " .pv-facet-facetitem").click(function (e) { FacetItemClick(this); });
                $("#pv-cat-" + CleanName(category.Name) + " .pv-facet-facetitem-label").click(function (e) {
                    var cb = $(this).prev();
                    cb.prop("checked", !cb.prop("checked"));
                    FacetItemClick(cb[0]);
                });
                $("#pv-cat-" + CleanName(category.Name) + " .pv-filterpanel-accordion-facet-sort").click(function (e) {
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
                    if (!_tiles[i].filtered) checkList.push(_tiles[i]);
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
                if (!_selectedFacets[category.Name]) {
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
            }
            else if (category.Type == PivotViewer.Models.FacetType.Ordinal) {
                if (!_selectedFacets[category.Name]) {
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
        var store = Lawnchair({ name: PivotCollection.CollectionName });
        store.get('settings', function (result) {
            if(result != null) settings = result.value;
            else {
                settings.showMissing = false;
                settings.visibleCategories = [];
                for (var i = 0; i < PivotCollection.FacetCategories.length; i++) {
                    if (PivotCollection.FacetCategories[i].IsFilterVisible) settings.visibleCategories.push(i);
                }
            }
            $.publish("/PivotView/Models/Settings/Loaded");
        });
    });

    $.subscribe("/PivotView/Models/Settings/Loaded", function (event) {
        //toolbar
		
		for (var i = 0; i < PivotCollection.Items.length; i++){
		   var item = PivotCollection.Items[i];
		   //for (var z = 0; z<item.facets.length; z++){
				//a/lert (item.facets[z])
			var name = item.Name;
			//for (var k = 0; k < facet.FacetValues.length; k++) {
			//	var value = facet.FacetValues[k].Value;
			//	var id = "pv-facet-item-" + CleanName(facet.Name) + "__" + CleanName(facet.FacetValues[k].Value);
			//	var values = _facetItemTotals[facet.Name];
			//	if (values == undefined) values = _facetItemTotals[facet.Name] = { values: [], facet: facet.Name, filtered: true };
			//	var total = values.values[value];
			//	if (total == undefined) {
			//		values.values[value] = ({ id: id, value: value, count: 1 });
					_wordWheelItems.push({ facet: "name", value: name });
			//	}
			//}
		   
		   //}
		
		
		}
        var toolbarPanel = "<div class='pv-toolbarpanel'>";

        var brandImage = PivotCollection.BrandImage;
        if (brandImage.length > 0) toolbarPanel += "<img class='pv-toolbarpanel-brandimage' src='" + brandImage + "'></img>";
        toolbarPanel += "<span class='pv-toolbarpanel-name'>" + PivotCollection.CollectionName + "</span>";
        toolbarPanel += "<span class='pv-countbox' id='pv-toolbarpanel-countbox' width=25></span>";
        toolbarPanel += "<div class='pv-toolbarpanel-facetbreadcrumb'></div>";
        toolbarPanel += "<div class='pv-toolbarpanel-viewcontrols'></div>";
        toolbarPanel += "<div id='pv-primsortcontrols' class='pv-toolbarpanel-sortcontrols'></div>";
        toolbarPanel += "<div class='pv-toolbarpanel-zoomcontrols'><div class='pv-toolbarpanel-zoomslider'></div></div>";
        toolbarPanel += "<div class='pv-toolbarpanel-info'></div>";
        toolbarPanel += "</div>";
        _self.append(toolbarPanel);
        $("#pv-altsort").hide();

        //setup zoom slider
        $('.pv-toolbarpanel-zoomslider').slider({
            max: 100,
            stop: function (event, ui) {Zoom(ui.value);}
        });

        //main panel
        _self.append("<div class='pv-mainpanel'></div>");
        var mainPanelHeight = $(window).height() - $('.pv-toolbarpanel').height() - 30;
        $('.pv-mainpanel').css('height', mainPanelHeight + 'px');
        $('.pv-mainpanel').append("<div class='pv-filterpanel'></div>");
        $('.pv-mainpanel').append("<div class='pv-viewpanel'><canvas class='pv-canvas' width='" + _self.width() + "' height='" + mainPanelHeight + "px'></canvas></div>");
        $('.pv-mainpanel').append("<div class='pv-infopanel'></div>");
        $('.pv-mainpanel').append("<div class='pv-altinfopanel' id='pv-altinfopanel'></div>");

        //add canvas for timeline to the mainpanel
        $('.pv-viewpanel').append("<div class='pv-timeview-canvas' id='pv-time-canvas'></div>");
        $('.pv-altinfopanel').css('left', (($('.pv-mainpanel').offset().left + $('.pv-mainpanel').width()) - 205) + 'px').css('height', mainPanelHeight - 28 + 'px');


        //filter panel
        var filterPanel = $('.pv-filterpanel');
        filterPanel.append("<div class='pv-filterpanel-clearall'>Clear All</div>")
            .append("<input class='pv-filterpanel-search' type='text' placeholder='Search...' /><div class='pv-search-clear' id='pv-filterpanel-search-clear'>&nbsp;</div>")
            .css('height', mainPanelHeight - 13 + 'px');
        if (navigator.userAgent.match(/iPad/i) != null)
            $('.pv-filterpanel-search').css('width', filterPanel.width() - 24 + 'px');
        else $('.pv-filterpanel-search').css('width', filterPanel.width() - 15 + 'px');

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
        var canvasContext = $('.pv-canvas')[0].getContext("2d");

        //Init Tile Controller and start animation loop
        TileController = new PivotViewer.Views.TileController(_imageController);
        _tiles = TileController.initTiles(PivotCollection.Items, baseCollectionPath, canvasContext);
        //Init image controller
        _imageController.Setup(baseCollectionPath.replace("\\", "/"));
    });

    $.subscribe("/PivotViewer/Settings/Changed", function (event) {
        var selCategory = PivotCollection.FacetCategories[event.visibleCategories[0]];
        if (!selCategory.uiInit) InitUIFacet(selCategory);
        SelectView(0);

        LoadSem.acquire(function (release) {
            var facetSelect = $(".pv-facet"), sortSelect = $(".pv-toolbarpanel-sort");
            facetSelect.hide();
            facetSelect.attr("visible", "invisible");
            $(".pv-toolbarpanel-sort option").remove();
            for (var i = 0; i < event.visibleCategories.length; i++) {
                var category = PivotCollection.FacetCategories[event.visibleCategories[i]];
                facetSelect.eq(category.visIndex).show();
                facetSelect.eq(category.visIndex).attr("visible", "visible");
                sortSelect.append("<option value='" + i + "' search='" + CleanName(category.Name.toLowerCase()) + "'>" + category.Name + "</option>");
            }
            FilterFacets(facetSelect.eq(selCategory.visIndex));
            $('.pv-filterpanel-accordion').accordion('option', 'active', selCategory.visIndex);
            $("#pv-primsort").trigger("change");
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

            facets[i + 1] = "<h3 class='pv-facet' style='display:inherit' facet='" + CleanName(category.Name.toLowerCase());
            facets[i + 1] += "'><a href='#' title='" + category.Name + "'>" + category.Name;
            facets[i + 1] += "</a><div class='pv-filterpanel-accordion-heading-clear' facetType='" + category.Type + "'>&nbsp;</div></h3>";
            facets[i + 1] += "<div style='display:'inherit' style='height:30%' id='pv-cat-" + CleanName(category.Name) + "'></div>";
            sort[i] = "<option value='" + i + "' search='" + CleanName(category.Name.toLowerCase()) + "'>" + category.Name + "</option>";
        }
        facets[facets.length] = "</div>";
        $(".pv-filterpanel").append(facets.join(''));

        // Minus an extra 25 to leave room for the version number to be added underneath
        $(".pv-filterpanel-accordion").css('height', ($(".pv-filterpanel").height() - $(".pv-filterpanel-search").height() - 75) + "px");

        $(".pv-filterpanel-accordion").accordion({ icons: false});
        $('#pv-primsortcontrols').append('<select id="pv-primsort" class="pv-toolbarpanel-sort">' + sort.join('') + '</select>');

        $(".pv-filterpanel-accordion").accordion("option", "active", activeNumber);
        
        var viewPanel = $('.pv-viewpanel');
        var width = _self.width();
        var height = $('.pv-mainpanel').height();
        var offsetX = $('.pv-filterpanel').width() + 18;
        var offsetY = 4;

        //Create instances of all the views
        _views.push(new PivotViewer.Views.GridView());
        _views.push(new PivotViewer.Views.BucketView());
        _views.push(new PivotViewer.Views.CrosstabView());
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

        //Set the width for displaying breadcrumbs as we now know the control sizes 
        //Hardcoding the value for the width of the viewcontrols images (145=29*5) as the webkit browsers 
        //do not know the size of the images at this point.
        var controlsWidth = $('.pv-toolbarpanel').innerWidth() - ($('.pv-toolbarpanel-brandimage').outerWidth(true) + 25 + $('.pv-toolbarpanel-name').outerWidth(true) + 30 + $('.pv-toolbarpanel-zoomcontrols').outerWidth(true) + _views.length * 29 + 2 * $('.pv-toolbarpanel-sortcontrols').outerWidth(true));
        $('.pv-toolbarpanel-facetbreadcrumb').css('width', controlsWidth + 'px');

        var filterPanel = $('.pv-filterpanel');
        filterPanel.append("<div class='pv-filterpanel-version'><a href='#pv-open-version'>About</a>&nbsp<a href='#pv-open-settings'>Settings</a></div>");
        filterPanel.append("<div id='pv-open-version' class='pv-modal-dialog'><div><a href='#pv-modal-dialog-close' title='Close' class='pv-modal-dialog-close'>X</a><h2>HTML5 PivotViewer</h2><p>Version: " + $(PivotViewer)[0].Version + "</p><p>The sources are available on <a href=\"https://github.com/openlink/html5pivotviewer\" target='_blank'>github</a></p></div></div>");
        filterPanel.append("<div id='pv-open-settings' class='pv-modal-dialog modal-xl'><div><h2>Settings</h2><div id='pv-options-text'>&nbsp;</div></div></div>");
        var html = "<input type='checkbox' id='show-missing'" + (settings.showMissing ? " checked" : "") + "> Display missing values<p><h3>Visible Variables (Double-click to select)</h3><p>";
        html += "<table><tr><td>All Variables:</th><td>Variables to Display:</th><tr><td><select id='pv-all-columns' multiple style='width:250px' size=20>";
        for (var i = 0; i < PivotCollection.FacetCategories.length; i++) {
            var category = PivotCollection.FacetCategories[i];
            if(category.IsFilterVisible) html += "<option value=" + i + " search='" + CleanName(category.Name.toLowerCase()) + "'>" + category.Name + "</option>";
        }
        html += "</select></td><td><select id='pv-column-select' multiple style='width:250px' size=20>";
        if (settings.visibleCategories.length == 0) html += "<option value='-1'>Select Variables...</option>";
        else {
            for (var i = 0; i < settings.visibleCategories.length; i++) {
                var category = PivotCollection.FacetCategories[settings.visibleCategories[i]];
                html += "<option value=" + settings.visibleCategories[i] + " search='" + CleanName(category.Name.toLowerCase()) + "'>" + category.Name + "</option>";
            }
        }
        html += "</select></td><td width=200><input id='pv-column-search' placeholder='Search For Variable...' type='text' size=20><div " +
            "class='pv-search-clear' id='pv-column-search-clear'>&nbsp;</div><p><button id='pv-column-select-all'>Select All</button><p><button " +
            "id='pv-column-deselect-all'>Deselect All</button><p><button id='pv-settings-submit'>Submit</button><p><button " +
            "id='pv-settings-cancel'>Cancel</button></td></table>";
        $("#pv-options-text").html(html);
        $("#pv-all-columns").dblclick(function (e) {
            if ($("#pv-all-columns option[value='-1']").length > 0) return;
            var value = parseFloat($("#pv-all-columns").val()), category = PivotCollection.FacetCategories[value];
            if ($("#pv-column-select option[value='-1']").length > 0) { $("#pv-column-select option[value='-1']").remove();}
            var selectList = $("#pv-column-select option");
            for (var i = 0; i < selectList.length; i++) {
                if (parseFloat(selectList[i].value) == value) break;
                else if (parseFloat(selectList[i].value) > value) {
                    $(selectList[i]).before($("<option></option>").attr("search", CleanName(category.Name.toLowerCase())).val(value).html(category.Name));
                    break;
                }
            }
            if (i == selectList.length) $("#pv-column-select").append("<option value=" + value + " search='" + CleanName(category.Name.toLowerCase()) + "'>" + category.Name + "</option>");
        });
        $("#pv-column-select").dblclick(function (e) {
            if ($("#pv-column-select option[value='-1']").length > 0) return;
            var value = parseFloat($("#pv-column-select").val()), category = PivotCollection.FacetCategories[value];
            $("#pv-column-select option[value='" + value + "']").remove();
            if ($("#pv-column-select option").length == 0) $("#pv-column-select").append("<option value='-1'>Select Variables...</option>");
        });
        $("#pv-column-select-all").click(function (e) {
            var selectList = $("#pv-all-columns option"), selectList2 = $("#pv-column-select option");
            if (selectList.eq(0).val() == -1) return;
            if (selectList2.eq(0).val() == -1) $("#pv-column-select option").remove();
            for (var i = 0, j = 0; i < selectList.length;) {
                var value = parseFloat(selectList.eq(i).val()), category = PivotCollection.FacetCategories[value];
                if (j == selectList2.length) {
                    $("#pv-column-select").append($("<option></option>").attr("search", CleanName(category.Name.toLowerCase())).val(value).html(category.Name));
                    i++;
                }
                else if (value == parseFloat(selectList2[j].value)) { i++; j++; }
                else if (parseFloat(selectList2[j].value) > value) {
                    $(selectList2[j]).before($("<option></option>").attr("search", CleanName(category.Name.toLowerCase())).val(value).html(category.Name));
                    i++;
                }
                else j++;
            }
        });
        $("#pv-column-deselect-all").click(function (e) {
            $("#pv-column-select option").remove();
            $("#pv-column-select").append("<option value='-1'>Select Variables...</option>");
        });
        $("#pv-settings-submit").click(function (e) {
            settings.visibleCategories = [];
            var selectList = $("#pv-column-select option");
            for (var i = 0; i < selectList.length; i++) {
                settings.visibleCategories.push(selectList[i].value);
            }
            settings.showMissing = $("#show-missing").prop("checked");

            var store = Lawnchair({ name: PivotCollection.CollectionName });
            store.save({ key: "settings", value: settings });

            $.publish("/PivotViewer/Settings/Changed", [settings]);
            window.open("#pv-modal-dialog-close", "_self");

            _currentSort = $('#pv-primsort option').eq(0).html();
            var category = PivotCollection.GetFacetCategoryByName(_currentSort);
            if (!category.uiInit) InitUIFacet(category);

            LoadSem.acquire(function (release) {
                _tiles.sort(tile_sort_by(_currentSort, false, _stringFacets));
                _filterList = [];
                for (var i = 0; i < _tiles.length; i++) {
                    var tile = _tiles[i];
                    tile.missing = !settings.showMissing && tile.facetItem.FacetByName[category.Name] == undefined;
                    if (tile.filtered && !tile.missing) _filterList.push(_tiles[i]);
                }
                $.publish("/PivotViewer/Views/Filtered", [{ tiles: _tiles, filter: _filterList, sort: _currentSort }]);
                release();
            });

        });

        $("#pv-settings-cancel").click(function (e) {
            window.open("#pv-modal-dialog-close", "_self");
            $("#show-missing").prop("checked", settings.showMissing);
            if ($("#pv-all-columns option").eq(0).val() == -1) $("#pv-all-columns option").remove();
            InitAllSelect("#pv-all-columns");
            if ($("#pv-column-select option").eq(0).val() == -1) $("#pv-column-select option").remove();
            InitVisibleSelect("#pv-column-select");
            $("#pv-column-search").val("");
            $('#pv-column-search-clear').css("visibility", "hidden");
        });

        $("#pv-column-search").on("keyup", function (e) {
            var input = e.target.value.toLowerCase();
            if (input != "") {
                if ($("#pv-all-columns option").eq(0).val() == -1) $("#pv-all-columns option").remove();
                InitAllSelect("#pv-all-columns", input);
                $("#pv-column-search-clear").css("visibility", "visible");
                if ($("#pv-all-columns option").length == 0)
                        $("#pv-all-columns").append("<option value='-1' css:'display: block'>No matching variables.</option>");
            }
            else {
                $("#pv-column-search-clear").css("visibility", "hidden");
                InitAllSelect("#pv-all-columns");
            }          
        });

        $('#pv-column-search-clear').click(function (e) {
            $("#pv-column-search").val("");
            $('#pv-column-search-clear').css("visibility", "hidden");
            if ($("#pv-all-columns option").eq(0).val() == -1) $("#pv-all-columns option").remove();
            InitAllSelect("#pv-all-columns");
        });

        $('.pv-toolbarpanel-view').click(function (e) {
            var viewId = this.id.substring(this.id.lastIndexOf('-') + 1, this.id.length);
            if (viewId != null) SelectView(parseInt(viewId));
        });
        $('#pv-primsort').on('change', function (e) {
            _currentSort = $('#pv-primsort option:selected').html();
            var category = PivotCollection.GetFacetCategoryByName(_currentSort);
            if (!category.uiInit) InitUIFacet(category);
            LoadSem.acquire(function (release) {
                _tiles.sort(tile_sort_by(_currentSort, false, _stringFacets));
                _filterList = [];
                for (var i = 0; i < _tiles.length; i++) {
                    var tile = _tiles[i];
                    tile.missing = !settings.showMissing && tile.facetItem.FacetByName[_currentSort] == undefined;
                    if (tile.filtered && !tile.missing) _filterList.push(_tiles[i]);
                }
                $.publish("/PivotViewer/Views/Filtered", [{ tiles: _tiles, filter: _filterList, sort: _currentSort }]);
                release();
            });
        });

        $(".pv-facet").click(function (e) { FilterFacets($(this)); });

        $('.pv-filterpanel-clearall').click(function (e) {
            //deselect all String Facets
            var checked = $('.pv-facet-facetitem:checked');
            checked.prop("checked", false);
            for (var i = 0; i < checked.length; i++) {
                if (checked.eq(i).attr('itemvalue') == "CustomRange")
                    HideCustomDateRange($(checked[i]).attr('itemfacet'));
            }
            //Reset all Numeric Facets
            var sliders = $('.pv-filterpanel-numericslider');
            for (var i = 0; i < sliders.length; i++) {
                var slider = sliders.eq(i), thisMin = slider.slider('option', 'min'), thisMax = slider.slider('option', 'max');
                slider.slider('values', 0, thisMin);
                slider.slider('values', 1, thisMax);
                slider.prev().prev().html('&nbsp;');
            }
            //turn off clear buttons
            $('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
            FilterCollection();
        });

        $('.pv-filterpanel-accordion-heading-clear').click( function (e) {
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

        $('.pv-facet-customrange').on('change', function (e) { CustomRangeChanged(this); });
        $('.pv-infopanel-details').on("click", '.detail-item-value-filter', function (e) {
            $.publish("/PivotViewer/Views/Item/Filtered", [{ Facet: $(this).parent().children().attr('pv-detail-item-title'), Item: this.getAttribute('pv-detail-item-value'), Values: null}]);
            return false;
        });
        $('.pv-infopanel-details').on("click", '.pv-infopanel-detail-description-more', function (e) {
            var that = $(this);
            var details = that.prev();
            if (that.text() == "More") { details.css('height', ''); that.text('Less'); }
            else { details.css('height', '100px'); that.text('More'); }
        });
        $('.pv-infopanel-controls-navleft').click(function (e) {
            for (var i = 1; i < _filterList.length; i++) {
                if (_filterList[i].facetItem.Id == _selectedItem.facetItem.Id) {
                    var tile = _filterList[i - 1];
                    $.publish("/PivotViewer/Views/Item/Selected", [{ item: tile}]);
                    _views[_currentView].CenterOnTile(tile);
                    break;
                }
            }
        });
        $('.pv-infopanel-controls-navright').click(function (e) {
            for (var i = 0; i < _filterList.length - 1; i++) {
                if (_filterList[i].facetItem.Id == _selectedItem.facetItem.Id) {
                    var tile = _filterList[i + 1];
                    $.publish("/PivotViewer/Views/Item/Selected", [{ item: tile, bkt: 0 }]);
                    _views[_currentView].CenterOnTile(tile);
                    break;
                }
            }
        });
        //Search
        $('.pv-filterpanel-search').on('keyup', function (e) {
            var input = CleanName(e.target.value.toLowerCase());
            if (!input == "") {
                var category = PivotCollection.GetFacetCategoryByName(_nameMapping[$(".pv-facet").eq( $('.pv-filterpanel-accordion').accordion('option', 'active')).attr("facet")]), search1 = [];
                if (category.Type == PivotViewer.Models.FacetType.String && category.Name.toLowerCase().indexOf(input) == -1) {
                    search1 = $('.pv-filterpanel-accordion-facet-list-item[id^="pv-facet-item-' + CleanName(category.Name) + '"]');
                    search1.hide();
                    search1 = search1.filter(function () {
                        return CleanName($(this).children().eq(0).attr('itemvalue').toLowerCase()).indexOf(input) >= 0 && $(this).children().eq(2).html() > 0;
                    });
                    search1.show();
                }
                var search2 = $(".pv-facet[facet*='" + input + "'][visible='visible']");
                search2.show();
                InitVisibleSelect(".pv-toolbarpanel-sort", input);
                $(".pv-facet:not([facet*='" + input + "'][visible='visible'])").hide();
                if (search1.length > 0) $(".pv-facet").eq($('.pv-filterpanel-accordion').accordion('option', 'active')).show();
                $("#pv-filterpanel-search-clear").css("visibility", "visible");
                if (search1.length > 0 || category.Name.toLowerCase().indexOf(input) != -1) return;
                else if (search2.length > 0) {
                    var category = PivotCollection.GetFacetCategoryByName(_nameMapping[search2.eq(0).attr("facet")]);
                    if (!category.uiInit) InitUIFacet(category);
                    LoadSem.acquire(function (release) {
                        $(".pv-filterpanel-accordion").accordion("option", "collapsible", false);
                        $('.pv-filterpanel-accordion').accordion('option', 'active', category.visIndex);
                        FilterFacets(search2.eq(0));
                        release();
                    });
                }
                else {
                    $(".pv-filterpanel-accordion").accordion("option", "collapsible", true);
                    $('.pv-filterpanel-accordion').accordion('option', 'active', false);
                }
            }
            else {
                $(".pv-facet[visible='visible']").show();
                $('.pv-filterpanel-accordion-facet-list-item').show();
                InitVisibleSelect(".pv-toolbarpanel-sort");
                $(".pv-filterpanel-accordion").accordion("option", "collapsible", false);
                $("#pv-filterpanel-search-clear").css("visibility", "hidden");
            }
        });

        $('#pv-filterpanel-search-clear').click(function (e) {
            $(".pv-filterpanel-search").val("");
            InitVisibleSelect(".pv-toolbarpanel-sort");
            $('#pv-filterpanel-search-clear').css("visibility", "hidden");
            $(".pv-filterpanel-accordion").accordion("option", "collapsible", false);
            $(".pv-facet[visible='visible']").show();
            $('.pv-filterpanel-accordion-facet-list-item').filter(function () {
                return $(this).children().eq(2).html() > 0;
            }).show();
        });

        var canvas = $('.pv-canvas');
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

            if (_mouseDrag == null) $.publish("/PivotViewer/Views/Canvas/Hover", [{ x: offsetX, y: offsetY }]);
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

            var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
            if (delta > 0) { value = (value < 5) ? 5 : value + 5; }
            else if (delta < 0) { value = value - 5; }
            value = Math.max(0, Math.min(100, value));
            Zoom(value, offsetX, offsetY);
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
                    for (var i = 0; i < orig.touches.length; i++) {
                        if (orig.touches[i].pageX < minX) minX = orig.touches[i].pageX;
                        if (orig.touches[i].pageX > maxX) maxX = orig.touches[i].pageX;
                        if (orig.touches[i].pageY < minY) minY = orig.touches[i].pageY;
                        if (orig.touches[i].pageY > maxY) maxY = orig.touches[i].pageY;
                    }
                    var avgX = (minX + maxX) / 2;
                    var avgY = (minY + maxY) / 2;
                    TileController.SetLinearEasingBoth();
                    $.publish("/PivotViewer/Views/Canvas/Zoom", [{ x: avgX, y: avgY, scale: orig.scale }]);
                    return;
                }
                else {
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

        _currentSort = $('#pv-primsort option').eq(0).html();
        var category = PivotCollection.GetFacetCategoryByName(_currentSort);
        if (!category.uiInit) InitUIFacet(category);

        LoadSem.acquire(function (release) {
            _tiles.sort(tile_sort_by(_currentSort, false, _stringFacets));

            FilterCollection();

            if (settings.visibleCategories.length < PivotCollection.FacetCategories.length)
                $.publish("/PivotViewer/Settings/Changed", [settings]);
            else $(".pv-facet").attr("visible", "visible");

            if (_options.View != undefined) SelectView(_options.View);
            else SelectView(0);
            TileController.BeginAnimation();
            release();
        });
    });

    var oldValue = 0;
    Zoom = function (value, x, y) {
        if (x == undefined) x = $('.pv-canvas').width() / 2;
        if (y == undefined) y = $('.pv-canvas').height() / 2;
        $('.pv-toolbarpanel-zoomslider').slider('option', 'value', value);
        $.publish("/PivotViewer/Views/Canvas/Zoom", [{ x: x, y: y, delta: (0.5 * (value - oldValue)) }]);
        oldValue = value;
    }

    InitAllSelect = function (id, search) { //hack to avoid .hide() in IE
        if (search == undefined) search = "";
        var select = $(id);
        for (var i = 0; i < select.length; i++) {
            var selValue = select.eq(i).val();
            select.eq(i).children().remove();
            for (var j = 0; j < PivotCollection.FacetCategories.length; j++) {
                var category = PivotCollection.FacetCategories[j];
                if (j == selValue || category.Name.toLowerCase().indexOf(search) != -1)
                    select.eq(i).append("<option value=" + j + " search='" + CleanName(category.Name.toLowerCase()) + "'>" + category.Name + "</option>");
            }
            select.eq(i).val(selValue);
        }
    }

    InitVisibleSelect = function (id, search) { //hack to avoid .hide() in IE
        if (search == undefined) search = "";
        var select = $(id);
        for (var i = 0; i < select.length; i++) {
            var selValue = select.eq(i).val();
            select.eq(i).children().remove();
            for (var j = 0; j < settings.visibleCategories.length; j++) {
                var index = settings.visibleCategories[j], category = PivotCollection.FacetCategories[index];   
                if (index == selValue || category.Name.toLowerCase().indexOf(search) != -1) 
                    select.eq(i).append("<option value=" + settings.visibleCategories[j] + " search='" + CleanName(category.Name.toLowerCase()) + "'>" + category.Name + "</option>");
            }
            select.eq(i).val(selValue);
       }
    }

    //Show the info panel
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

            _views[_currentView].SetSelected(_selectedItem); 
        }

    });

    $.subscribe("/PivotViewer/Views/Item/Filtered", function (evt) {
        if (evt == undefined || evt == null) return;

        var facetFilters = [];
        if (evt.length != undefined) facetFilters = evt;
        else facetFilters.push(evt);

        for (var i = 0; i < facetFilters.length; i++) {
            var facetFilter = facetFilters[i];

            var category = PivotCollection.GetFacetCategoryByName(facetFilter.Facet);
            if (!category.uiInit) InitUIFacet(category);
            LoadSem.acquire(function (release) {
                if (category.Type == PivotViewer.Models.FacetType.String) {
                    $('.pv-facet-facetitem[itemfacet="' + CleanName(facetFilter.Facet) + '"]:checked').prop('checked', false);
                    if (facetFilter.Values) {
                        if (facetFilter.Values.length == 1) {
                            var cb = $(PivotViewer.Utils.EscapeMetaChars("#pv-facet-item-" + CleanName(facetFilter.Facet) + "__" + CleanName(facetFilter.Values[0].toString())) + " input");
                            cb.prop('checked', true);
                            if(facetFilters.length == 1) FacetItemClick(cb[0]);
                        }
                        else {
                            for (var j = 0; j < facetFilter.Values.length; j++) {
                                $(PivotViewer.Utils.EscapeMetaChars("#pv-facet-item-" + CleanName(facetFilter.Facet) + "__" + CleanName(facetFilter.Values[j].toString())) + " input").prop('checked', true);
                            }
                            $($(PivotViewer.Utils.EscapeMetaChars("#pv-facet-item-" + CleanName(facetFilter.Facet) + "__" + CleanName(facetFilter.Values[0].toString())) + " input")[0].parentElement.parentElement.parentElement).prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
                            if (facetFilters.length == 1) FilterCollection();
                        }
                    }
                    else {
                        var cb = $(PivotViewer.Utils.EscapeMetaChars("#pv-facet-item-" + CleanName(facetFilter.Facet) + "__" + CleanName(facetFilter.Item.toString())) + " input");
                        cb.prop('checked', true);
                        if (facetFilters.length == 1) FacetItemClick(cb[0]);
                    }
                }
                else if (category.Type == PivotViewer.Models.FacetType.Number || category.Type == PivotViewer.Models.FacetType.Ordinal) {
                    var s = $('#pv-filterpanel-numericslider-' + PivotViewer.Utils.EscapeMetaChars(CleanName(facetFilter.Facet)));
                    if (facetFilter.MaxRange == undefined) facetFilter.MaxRange = facetFilter.Item;
                    FacetSliderDrag(s, facetFilter.Item, facetFilter.MaxRange, facetFilters.length == 1);
                }
                else if (category.Type == PivotViewer.Models.FacetType.DateTime) {
                    $('#pv-facet-item-' + category.Name + '___CustomRange')[0].firstElementChild.checked = true;
                    GetCustomDateRange(category.Name);
                    var textbox1 = $('#pv-custom-range-' + CleanName(category.Name) + '__StartDate'),
                        textbox2 = $('#pv-custom-range-' + CleanName(category.Name) + '__FinishDate');
                    var minDate = new Date(facetFilter.Item), maxDate = new Date(facetFilter.MaxRange);
                    textbox1[0].value = (minDate.getMonth() + 1) + "/" + minDate.getDate() + "/" + minDate.getFullYear();
                    textbox2[0].value = (maxDate.getMonth() + 1) + "/" + maxDate.getDate() + "/" + maxDate.getFullYear();
                    textbox1.datepicker("option", "minDate", minDate);
                    textbox2.datepicker("option", "maxDate", maxDate);

                    // Clear any filters already set for this facet
                    var checked = $(textbox1[0].parentElement.parentElement.parentElement.parentElement.children).next().find('.pv-facet-facetitem:checked');
                    for (var j = 0; j < checked.length; j++) {
                        if ($(checked[j]).attr('itemvalue') != 'CustomRange') $(checked[j]).prop('checked', false);
                    }
                    $(checked[0].parentElement.parentElement.parentElement).prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
                    if (facetFilters.length == 1) FilterCollection();
                }
                release();
            });
        }
        if (facetFilters.length > 1) FilterCollection();
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

    FacetSliderDrag = function (slider, min, max, doFilter) {
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
        if(doFilter != false) FilterCollection();
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