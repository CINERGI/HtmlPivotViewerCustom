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
var Settings = { showMissing: false, visibleCategories: undefined };

(function ($) {
    var _views = [],
        _itemTotals = [], //used to store the counts of all the string facets - used when resetting the filters
        _facetNumericItemTotals = [], //used to store the counts of all the numeric facets - used when resetting the filters
        _facetOrdinalItemTotals = [],
        _longStringFacet = null,
        _longStringCategories = [];
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
        _nameMapping = [],
        _options = {};
        
    var methods = {
        // PivotViewer can be initialised with these options:
        // Loader: a loader that inherits from ICollectionLoader must be specified. It takes the URL of the collection as a parameter.
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
                        initCollectionLoader(options);
                        window.open("#pv-modal-dialog-close", "_self");
                    });

                    $('.pv-load-file').on('change', function (e) {
                        var fileInput = $("#pv-load-file")[0];
                        Loader = new PivotViewer.Models.Loaders.LocalCSVLoader(fileInput.files[0]);
                        initCollectionLoader(options);
                    });
                }
                else {
                    Loader = options.Loader;
                    initCollectionLoader(options);
                }

                window.open("#pv-file-selection", "_self");
            })
            .fail (function (jqxhr, textStatus, error) {
                var err = textStatus + ", " + error;
                Debug.log ("Getting defaults file failed: " + err);
            });
        }
    };

    initCollectionLoader = function (options) {
        PV = this;
        _self.append("<div class='pv-loading'><img src='images/loading.gif' alt='Loading' /><span>Loading...</span></div>");
        $('.pv-loading').css('top', ($('.pv-wrapper').height() / 2) - 33 + 'px');
        $('.pv-loading').css('left', ($('.pv-wrapper').width() / 2) - 43 + 'px');

        if (Loader == undefined) throw "Collection loader is undefined.";
        if (Loader instanceof PivotViewer.Models.Loaders.ICollectionLoader)
            Loader.loadCollection(PivotCollection);
        else throw "Collection loader does not inherit from PivotViewer.Models.Loaders.ICollectionLoader.";
    };

    /// Create the individual controls for the facet
    bucketizeDateTimeFacet = function (facetName, array1, array2) {
        var facetControls = ["<ul class='pv-filterpanel-accordion-facet-list'>"];

        // deal with array1
        if (array1) {
            for (var i = 0; i < array1.length; i++) {
                var index = i + 1;
                facetControls[index] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-item-" + cleanName(facetName) + "__" + cleanName(array1[i].name.toString()) + "'>";
                facetControls[index] += "<input itemvalue='" + cleanName(array1[i].name.toString()) + "' itemfacet='" + cleanName(facetName.toString()) + "' startdate='" + array1[i].start.toISOString() + "' enddate='" + array1[i].end.toISOString() + "' class='pv-facet-facetitem' type='checkbox' />"
                //facetControls[index] += "<label for "
                facetControls[index] += "<span class='pv-facet-facetitem-label'>" +  array1[i].name + "</span>";
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
                facetControls[index] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-item-" + cleanName(facetName) + "__" + cleanName(array2[i].name.toString()) + "'>";
                facetControls[index] += "<input itemvalue='" + cleanName(array2[i].name.toString()) + "' itemfacet='" + cleanName(facetName.toString()) + "' startdate='" + array2[i].start.toISOString() + "' enddate='" + array2[i].end.toISOString() +  "' class='pv-facet-facetitem' type='checkbox' />"
                facetControls[index] += "<span class='pv-facet-facetitem-label'>" +  array2[i].name + "</span>";
                facetControls[index] += "<span class='pv-facet-facetitem-count'>0</span>"
                facetControls[index] += "</li>";
            }
        }
        facetControls[array1.length + array2.length + 4] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-item-LineBreak2' style='border-bottom:thin solid #E2E2E2;'></li>";
        facetControls[array1.length + array2.length + 5] = "</ul>";
        return facetControls.join('');
    };

    createCustomRange = function (facetName) {
        var facetControls = ["<ul class='pv-filterpanel-accordion-facet-list'>"];
        facetControls[1] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-item-" + cleanName(facetName) + "__" + "_CustomRange'>";
        facetControls[1] += "<input itemvalue='CustomRange' itemfacet='" + cleanName(facetName) + "' class='pv-facet-facetitem' type='checkbox' />"
        facetControls[1] += "<span class='pv-facet-facetitem-label'>Custom Range</span>";
        facetControls[1] += "</li>";
        facetControls[1] += "<ul class='pv-filterpanel-accordion-facet-list'>"
        facetControls[1] += "<li class='pv-filterpanel-accordion-facet-list-item' id='pv-custom-range-" + cleanName(facetName) + "__Start' style='visibility:hidden;float:right'>"
        facetControls[1] += "<span class='pv-facet-customrange-label'>Start:</span>"
        facetControls[1] += "<input itemvalue='CustomRangeStart' itemfacet='" + cleanName(facetName) + "' id='pv-custom-range-" + cleanName(facetName) + "__StartDate' class='pv-facet-customrange' type='text'/>"
        facetControls[1] += "</li>";
        facetControls[1] += "<li class='pv-filterpanel-accordion-facet-list-item' id='pv-custom-range-" + cleanName(facetName) + "__Finish' style='visibility:hidden;float:right'>"
        facetControls[1] += "<span class='pv-facet-customrange-label'>End:</span>"
        facetControls[1] += "<input itemvalue='CustomRangeFinish' itemfacet='" + cleanName(facetName) + "' id='pv-custom-range-" + cleanName(facetName) + "__FinishDate' class='pv-facet-customrange' type='text'/>"
        facetControls[1] += "</li>";
        facetControls[facetControls.length] = "</ul>";
        return facetControls.join('');
    };

    createDatetimeNoInfoFacet = function (facetName) {
        var values = _itemTotals[facetName];
        if (values == undefined) return "";
        var total = values["(no info)"];
        var facetControls = "<ul class='pv-filterpanel-accordion-facet-list'>";
        if(total != undefined) {
            facetControls += "<li class='pv-filterpanel-accordion-facet-list-item'  id='" + total.id + "'>";
            facetControls += "<input itemvalue='" + cleanName(total.value) + "' itemfacet='" + cleanName(facetName) + "' class='pv-facet-facetitem' type='checkbox' />"
            facetControls += "<span class='pv-facet-facetitem-label'>" + total.value + "</span>";
            facetControls += "<span class='pv-facet-facetitem-count'>0</span>"
            facetControls += "</li>";
        }
        facetControls += "<li class='pv-filterpanel-accordion-facet-list-item'  style='border-bottom:thin solid #E2E2E2;'></li>";
        facetControls += "</ul>";
        return facetControls;
    };

    createStringFacet = function (facetName) {
        var facetControls = ["<ul class='pv-filterpanel-accordion-facet-list'>"];
        var values = _itemTotals[facetName];
        var i = 1;
        for (var value in values.values) {
            var total = values.values[value];
            facetControls[i] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='" + total.id + "'>";
            facetControls[i] += "<input itemvalue='" + cleanName(total.value) + "' itemfacet='" + cleanName(facetName) + "' class='pv-facet-facetitem' type='checkbox' />"
            facetControls[i] += "<span class='pv-facet-facetitem-label'>" + total.value + "</span>";
            facetControls[i] += "<span class='pv-facet-facetitem-count'>0</span>"
            facetControls[i++] += "</li>";
        }
        facetControls[facetControls.length] = "</ul>";
        return facetControls.join('');
    };

    createNumberFacet = function (category, values) {createHistogram(category, PivotViewer.Utils.getHistogram(values));}

    createOrdinalFacet = function (category, values) {createHistogram(category, PivotViewer.Utils.getOrdinalHistogram(values));}

    createHistogram = function (category, histogram) {
        var w = 165, h = 80, name = cleanName(category.name);

        var chartWrapper = $("#pv-filterpanel-category-numberitem-" + PivotViewer.Utils.escapeMetaChars(name));
        chartWrapper.empty();
        chartWrapper.append("<span class='pv-filterpanel-numericslider-range-val'>&nbsp;</span>");
        var chart = "<svg class='pv-filterpanel-accordion-facet-chart' width='" + w + "' height='" + h + "'>";
       
        //work out column width based on chart width
        var columnWidth = (0.5 + (w / histogram.histogram.length)) | 0;
        //get the largest count from the histogram. This is used to scale the heights
        var maxCount = histogram.histogram.length > 1 ? Math.max.apply(null, histogram.histogram) : 1;
        //draw the bars
        for (var i = 0; i < histogram.histogram.length; i++) {
            var barHeight = (0.5 + (h / maxCount * histogram.histogram[i]));
            var barX = (0.5 + (columnWidth * i)) | 0;
            chart += "<rect x='" + barX + "' y='" + (h - barHeight) + "' width='" + columnWidth + "' height='" + barHeight + "'></rect>";
        }
        chartWrapper.append(chart + "</svg>");
        //add the extra controls
        var p = $("#pv-filterpanel-category-numberitem-" + PivotViewer.Utils.escapeMetaChars(name));
        p.append('</span><div id="pv-filterpanel-numericslider-' + name + '" class="pv-filterpanel-numericslider"></div><span class="pv-filterpanel-numericslider-range-min">' + histogram.min + '</span><span class="pv-filterpanel-numericslider-range-max">' + histogram.max + '</span>');
        var s = $('#pv-filterpanel-numericslider-' + PivotViewer.Utils.escapeMetaChars(name));
        var range = histogram.max - histogram.min;
        s.slider({
            range: true,
            min: histogram.min,
            max: histogram.max,
            step: (range < 10 ? range / histogram.histogram.length : 1),
            values: [histogram.min, histogram.max],
            start: function(event, ui) {this.startMin = ui.values[0]; this.startMax = ui.values[1];},
            slide: function (event, ui) {
                $(this).parent().find('.pv-filterpanel-numericslider-range-val').text(ui.values[0] + " - " + ui.values[1]);
            },
            stop: function (event, ui) { sliderStop($('#pv-filterpanel-numericslider-' + name), category, event, ui);}
        });
    };

    sliderStop = function (s, category, event, ui) {
        var s = $('#pv-filterpanel-numericslider-' + cleanName(category.name));
        var min = s.slider('option', 'min'), max = s.slider('option', 'max');
        if (ui.values[0] > min || ui.values[1] < max)
            s.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
        else if (ui.values[0] == min && ui.values[1] == max)
            s.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
        filterCollection({ category: category, enlarge: s[0].startMin > ui.values[0] || s[0].startMax < ui.values[1], min: ui.values[0], max: ui.values[1], rangeMin: min, rangeMax: max });
    }

    /// Set the current view
    selectView = function (view) {
        var number;
        if (typeof view == 'string' || view instanceof String) {
            for (var i = 0; i < _views.length; i++) {
                if (_views[i].getViewName().toLowerCase().startsWith(view.toLowerCase())) {
                    number = i;
                    break;
                }
            }
        }
        else number = view;

        deselectInfoPanel();
        $('#pv-viewpanel-view-' + _currentView + '-image').attr('src', _views[_currentView].getButtonImage());
        _views[_currentView].deactivate();
 
        $('#pv-viewpanel-view-' + number + '-image').attr('src', _views[number].getButtonImageSelected());
        _views[number].activate();

        _currentView = number;

        $('.pv-viewpanel-view').hide();
        $('#pv-viewpanel-view-' + _currentView).show();
    };

    //Sorts the facet items based on a specific sort type
    sortFacetItems = function (facetName) {
        if (PivotCollection.getCategoryByName(facetName).type == PivotViewer.Models.FacetType.DateTime) return;
        //get facets
        var facetList = $("#pv-cat-" + PivotViewer.Utils.escapeMetaChars(cleanName(facetName)) + " ul");
        var sortType = facetList.prev().text().replace("Sort: ", "");
        var items = facetList.children("li").get();
        if (sortType == "A-Z") {
            items.sort(function (a, b) {
                var compA = $(a).children().first().attr("itemvalue");
                var compB = $(b).children().first().attr("itemvalue");
                return (compA < compB) ? 1 : (compA > compB) ? -1 : 0;
            });
        } 
        else if (sortType == "Quantity") {
            items.sort(function (a, b) {
                var compA = parseInt($(a).children(".pv-facet-facetitem-count").text());
                var compB = parseInt($(b).children(".pv-facet-facetitem-count").text());
                return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
            });
        } 
        else {
            var category = PivotCollection.getCategoryByName(facetName);
            if (category.customSort != undefined) {
                var sortList = [];
                for (var i = category.customSort.sortValues.length - 1; i >= 0; i--) {
                    for (var j = 0; j < items.length; j++) {
                        if (facet.customSort.sortValues[i] == $(items[j]).children(".pv-facet-facetitem-label").text())
                            sortList.push(items[j]);
                    }
                }
                items = sortList;
            }
        }
        for (var i = 0; i < items.length; i++) {
            facetList.prepend(items[i]);
        }
    };

    // Filters the collection of items and updates the views
    filterCollection = function (filterChange) {

        deselectInfoPanel();
        _selectedItem = null;

        var filterList = [], longStringFiltered = null, stringFacets, datetimeFacets, numericFacets, selectedFacets;
        if (filterChange == undefined) {

            if (_longStringFacet != null) {
                var count = 0; longStringFiltered = [];
                for (var i = 0, _iLen = _tiles.length; i < _iLen; i++) {
                    var facet = _tiles[i].item.getFacetByName(_longStringFacet.facet);
                    if (facet != undefined && facet.values[0].value.toLowerCase().indexOf(_longStringFacet.value) >= 0) {
                        longStringFiltered[i] = true;
                        count++
                    }
                    else longStringFiltered[i] = false;
                }
                if (count == 0) {
                    $("#pv-long-search").css("text-decoration", "line-through").css("color", "red");
                    return;
                }
            }

            var checked = $('.pv-facet-facetitem:checked');
            filterList = []; stringFacets = []; datetimeFacets = []; numericFacets = [], selectedFacets = [];

            //Filter String facet items
            //create an array of selected facets and values to compare to all items.
            for (var i = 0; i < checked.length; i++) {
                var facet = _nameMapping[$(checked[i]).attr('itemfacet')];
                var facetValue = _nameMapping[$(checked[i]).attr('itemvalue')];
                var category = PivotCollection.getCategoryByName(facet);

                if (category.type == PivotViewer.Models.FacetType.String) {
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
                else if (category.type == PivotViewer.Models.FacetType.DateTime) {
                    var start = $('#pv-custom-range-' + cleanName(facet) + '__StartDate')[0].value;
                    var end = $('#pv-custom-range-' + cleanName(facet) + '__FinishDate')[0].value;
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
            for (var i = 0, _iLen = PivotCollection.categories.length; i < _iLen; i++) {
                var facet = PivotCollection.categories[i].name;
                if (PivotCollection.categories[i].type == PivotViewer.Models.FacetType.Number ||
                    PivotCollection.categories[i].type == PivotViewer.Models.FacetType.Ordinal) {
                    var numbFacet = $('#pv-filterpanel-category-numberitem-' + cleanName(facet));
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
            filterList = [];
            stringFacets = _stringFacets; datetimeFacets = _datetimeFacets;
            numericFacets = _numericFacets; selectedFacets = _selectedFacets;
            var category = filterChange.category;
            if (category.type == PivotViewer.Models.FacetType.Number || category.type == PivotViewer.Models.FacetType.Ordinal) {
                numericFacet = numericFacets[category.name];
                if (numericFacet == undefined) {
                    numericFacet = {
                        facet: category.name, selectedMin: filterChange.min, selectedMax:
                            filterChange.max, rangeMin: filterChange.rangeMin, rangeMax: filterChange.rangeMax
                    };
                    numericFacets.push(numericFacet);
                    numericFacets[category.name] = numericFacet;
                }
                else {
                    numericFacet.selectedMin = filterChange.min;
                    numericFacet.selectedMax = filterChange.max;
                }
                selectedFacets[category.name] = true;
            }
            else if ((!filterChange.enlarge && selectedFacets[category.name] != undefined) || filterChange.clear) {
                if (category.type == PivotViewer.Models.FacetType.String) {
                    var stringFacet = stringFacets[category.name];
                    delete stringFacet.facetValue[filterChange.value + "a"];
                    stringFacet.facetValue.splice(stringFacet.facetValue.indexOf(filterChange.value), 1);
                    if (Object.keys(stringFacet.facetValue).length == 0) {
                        delete stringFacets[category.name];
                        stringFacets.splice(stringFacet.index, 1);
                        delete selectedFacets[category.name];
                    }
                }
                else {
                    datetimeFacet = datetimeFacets[category.name];
                    for (var v = 0; v < datetimeFacet.facetValue.length; v++) {
                        if (datetimeFacet.facetValue[v].facetValue == filterChange.value) {
                            datetimeFacet.facetValue.splice(v, 1);
                            if (datetimeFacet.facetValue.length == 0) {
                                delete datetimeFacets[category.name];
                                datetimeFacets.splice(datetimeFacet.index, 1);
                                delete selectedFacets[category.name];
                            }
                            break;
                        }
                    }
                }
            }
            else {
                if (category.type == PivotViewer.Models.FacetType.String) {
                    var stringFacet = stringFacets[category.name];
                    if (stringFacet != undefined) {
                        stringFacet.facetValue[filterChange.value + "a"] = true;
                        stringFacet.facetValue.push(filterChange.value);
                    }
                    else {
                        stringFacet = { facet: category.name, facetValue: [filterChange.value], index: i };
                        stringFacet.facetValue[filterChange.value + "a"] = true;
                        stringFacets.push(stringFacet);
                        stringFacets[category.name] = stringFacet;
                    }
                }
                else {
                    var datetimeValue = { facetValue: filterChange.value, startDate: filterChange.min, endDate: filterChange.max };
                    var datetimeFacet = datetimeFacets[category.name];
                    if (datetimeFacet != undefined) datetimeFacet.facetValue.push(datetimeValue);
                    else {
                        datetimeFacet = { facet: category.name, facetValue: [datetimeValue] };
                        datetimeFacets.push(datetimeFacet);
                        datetimeFacets[category.name] = datetimeFacet;
                    }
                }
                selectedFacets[category.name] = true;
            }
        }

        //Find matching facet values in items
        for (var i = 0, _iLen = _tiles.length; i < _iLen; i++) {
            var tile = _tiles[i];
            if (filterChange != undefined && (!filterChange.enlarge || tile.filtered)) {
                if (!filterChange.enlarge && !tile.filtered) continue;
                else if (filterChange.enlarge) { filterList.push(tile); continue; }
                if (filterChange.category.type == PivotViewer.Models.FacetType.String) {
                    var facet = tile.item.getFacetByName(filterChange.category.name);
                    if (facet == undefined) {
                        if ((filterChange.value == "(no info)") == filterChange.clear) { tile.filtered = false; continue; }
                    }
                    else {
                        for (var m = 0; m < facet.values.length; m++) {
                            if ((facet.values[m].value == filterChange.value) != filterChange.clear) break;
                        }
                        if (m == facet.values.length) { tile.filtered = false; continue; }
                    }
                }
                else if (filterChange.category.type == PivotViewer.Models.FacetType.Number ||
                    filterChange.category.type == PivotViewer.Models.FacetType.Ordinal) {
                    var facet = tile.item.getFacetByName(filterChange.category.name);
                    if (facet == undefined) { tile.filtered = false; continue; }
                    else {
                        var m, _mLen;
                        for (var m = 0, _mLen = facet.values.length; m < _mLen; m++) {
                            var parsed = parseFloat(facet.values[m].value);
                            facet = numericFacets[category.name];
                            if (!isNaN(parsed) && parsed >= facet.selectedMin && parsed <= facet.selectedMax)
                                break; // found                        
                        }
                        if (m == _mLen) { tile.filtered = false; continue; }
                    }
                }
                else {
                    var facet = tile.item.getFacetByName(filterChange.category.name);
                    var datetimeFacet = datetimeFacets[filterChange.category.name];
                    if (facet == undefined) {
                        if ((filterChange.value == "(no info)") == filterChange.clear) { tile.filtered = false; continue; }
                    }
                    else {
                        var m, _mLen;
                        for (var m = 0, _mLen = facet.values.length; m < _mLen; m++) {
                            var itemDate = new Date(facet.values[m].value)
                            for (var n = 0, _nLen = datetimeFacet.facetValue.length; n < _nLen; n++) {
                                var value = datetimeFacet.facetValue[n];
                                if ((itemDate >= value.startDate && itemDate <= value.endDate) == filterChange.clear) break;
                            }
                            if ((n == _nLen) != filterChange.clear) break;
                        }
                        if ((m == _mLen)) { tile.filtered = false; continue; }
                    }
                }
                filterList.push(tile);
                continue;
            }

            if (longStringFiltered != null) {
                if(!longStringFiltered[i]) {
                    tile.filtered = false;
                    continue;
                }
            }
            else if (_longStringFacet != null) {  //expand = true
                var facet = _tiles[i].item.getFacetByName(_longStringFacet.facet);
                if (facet == undefined || facet.values[0].value.toLowerCase().indexOf(_longStringFacet.value) < 0) {
                    tile.filtered = false;
                    continue;
                }
            }

            for (var k = 0, _kLen = stringFacets.length; k < _kLen; k++) {
                var facet = tile.item.getFacetByName(stringFacets[k].facet);
                if (facet == undefined) {
                    if (!stringFacets[k].facetValue["(no info)a"]) break;
                    else continue;
                }

                var m, _mLen;
                for (var m = 0, _mLen = facet.values.length; m < _mLen; m++) {
                    if (stringFacets[k].facetValue[facet.values[m].value + "a"]) break;
                }
                if (m == _mLen) break; //not found
            }
            if (k < _kLen) {
                tile.filtered = false;
                continue; //not found
            }

            for (var k = 0, _kLen = numericFacets.length; k < _kLen; k++) {
                var facet = tile.item.getFacetByName(numericFacets[k].facet);
                if (facet == undefined) {
                    if (numericFacets[k].selectedMin == "(no info)") continue; //found
                    else break; //not found
                }

                var m, _mLen;
                for (var m = 0, _mLen = facet.values.length; m < _mLen; m++) {
                    var parsed = parseFloat(facet.values[m].value);
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
                var facet = tile.item.getFacetByName(datetimeFacets[k].facet);
                if (facet == undefined) {
                    var n, _nLen;
                    for (var n = 0, _nLen = datetimeFacets[k].facetValue.length; n < _nLen; n++) {
                        if (datetimeFacets[k].facetValue[n].facetValue == "(no info)") break; //found
                    }
                    if (n == _nLen) break; //not found
                    else continue;
                }

                var m, _mLen;
                for (var m = 0, _mLen = facet.values.length; m < _mLen; m++) {
                    var itemDate = new Date(facet.values[m].value);
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
            filterList.push(tile);
        }

        _filterList = filterList;
	    _numericFacets = numericFacets;
	    _stringFacets = stringFacets;
	    _datetimeFacets = datetimeFacets;
	    _selectedFacets = selectedFacets

	    if (_longStringFacet !=null || _numericFacets.length != 0 || _stringFacets.length != 0 || _datetimeFacets.length != 0) $('.pv-filterpanel-clearall').css('visibility', 'visible');
	    else $('.pv-filterpanel-clearall').css('visibility', 'hidden');

	    for (var i = 0; i < PivotCollection.categories.length; i++) 
	        PivotCollection.categories[i].recount = true;

        //Filter the facet counts and remove empty facets
	    filterFacets($(".pv-facet").eq($(".pv-filterpanel-accordion").accordion("option", "active")));

	    $("#pv-toolbarpanel-countbox").html(_filterList.length);

        //Update breadcrumb
	    var bc = $('.pv-toolbarpanel-facetbreadcrumb');
	    bc.empty();

	    if (stringFacets.length > 0 || numericFacets.length > 0 || datetimeFacets.length > 0) {
	        var bcItems = "|";
	        for (var i = 0; i < stringFacets.length; i++) {
	            bcItems += "<span class='pv-toolbarpanel-facetbreadcrumb-facet'>" + stringFacets[i].facet + ":</span><span class='pv-toolbarpanel-facetbreadcrumb-values'>"
	            bcItems += stringFacets[i].facetValue.join(', ');
	            bcItems += "</span><span class='pv-toolbarpanel-facetbreadcrumb-separator'>&gt;</span>";
	        }

	        for (var i = 0; i < numericFacets.length; i++) {
	            bcItems += "<span class='pv-toolbarpanel-facetbreadcrumb-facet'>" + numericFacets[i].facet + ":</span><span class='pv-toolbarpanel-facetbreadcrumb-values'>"
	            if (numericFacets[i].selectedMin == numericFacets[i].rangeMin)
	                bcItems += "Under " + numericFacets[i].selectedMax;
	            else if (numericFacets[i].selectedMax == numericFacets[i].rangeMax)
	                bcItems += "Over " + numericFacets[i].selectedMin;
	            else if (numericFacets[i].selectedMin == numericFacets[i].selectedMax) bcItems += numericFacets[i].selectedMin;
	            else bcItems += numericFacets[i].selectedMin + " - " + numericFacets[i].selectedMax;
	            bcItems += "</span><span class='pv-toolbarpanel-facetbreadcrumb-separator'>&gt;</span>";
	        }

	        for (var i = 0; i < datetimeFacets.length; i++) {
	            for (var j = 0; j < datetimeFacets[i].facetValue.length; j++) {
	                bcItems += "<span class='pv-toolbarpanel-facetbreadcrumb-facet'>" + datetimeFacets[i].facet + ":</span><span class='pv-toolbarpanel-facetbreadcrumb-values'>"
	                if (datetimeFacets[i].facetValue[j].startDate != undefined && datetimeFacets[i].facetValue[j].endDate != undefined) {
	                    var minDate = new Date(datetimeFacets[i].facetValue[j].startDate), maxDate = new Date(datetimeFacets[i].facetValue[j].endDate);
	                    var labelF = PivotViewer.Utils.getTimeLabelFunction(minDate, maxDate);
	                    bcItems += labelF({ value: minDate }) + " - " + labelF({ value: maxDate });
	                }
	                else bcItems += datetimeFacets[i].facetValue[j].facetValue;
	                bcItems += "</span><span class='pv-toolbarpanel-facetbreadcrumb-separator'>&gt;</span>";
	            }
	        }
	        bc.append(bcItems);

	        //Filter view
	        TileController.setCircularEasingBoth();
	    }

        $.publish("/PivotViewer/Views/Filtered", [{tiles: _tiles, filterList: _filterList, sort: _currentSort, stringFacets: stringFacets}]);
    };

    initUIFacet = function (category) {
        Loader.loadColumn(category);
        LoadSem.acquire(function (release) {
            var uiFacet = $("#pv-cat-" + cleanName(category.name));
            if (category.type == PivotViewer.Models.FacetType.DateTime) {
                createDatetimeBuckets(category);
                uiFacet.append(bucketizeDateTimeFacet(category.name, category.datetimeBuckets[0], category.datetimeBuckets[1]));
                uiFacet.append(createDatetimeNoInfoFacet(category.name));
                uiFacet.append(createCustomRange(category.name));
                $("#pv-cat-" + cleanName(category.name) + " .pv-facet-customrange").on('change', function (e) { customRangeChanged(this); });
                $("#pv-cat-" + cleanName(category.name) + " .pv-facet-facetitem").click(function (e) { facetItemClick(this); });
                $("#pv-cat-" + cleanName(category.name) + " .pv-facet-facetitem-label").click(function (e) {
                    var cb = $(this).prev();
                    cb.prop("checked", !cb.prop("checked"));
                    facetItemClick(cb[0]);
                });
            }
            else if (category.type == PivotViewer.Models.FacetType.String) {
                for (var i = 0; i < PivotCollection.items.length; i++) {
                    var item = PivotCollection.items[i];
                    var facet = item.getFacetByName(category.name);
                    if (facet != undefined) {
                        for (var k = 0; k < facet.values.length; k++) {
                            var value = facet.values[k].value;
                            var id = "pv-facet-item-" + cleanName(facet.name) + "__" + cleanName(facet.values[k].value);
                            var values = _itemTotals[facet.name];
                            if (values == undefined) values = _itemTotals[facet.name] = { values: [], facet: facet.name, filtered: true };
                            var total = values.values[value];
                            if (total == undefined) 
                                values.values[value] = ({ id: id, value: value, count: 1 });
                            else total.count++;
                        }
                    }
                    else {
                        var id = "pv-facet-item-" + cleanName(category.name) + "__" + cleanName("(no info)");
                        var values = _itemTotals[category.name];
                        if (values == undefined) values = _itemTotals[category.name] = { values: [], facet: category.name, filtered: true };
                        var total = values.values["(no info)"];
                        if (total == undefined) values.values["(no info)"] = ({ id: id, value: "(no info)", count: 1 });
                        else total.count++;
                    }
                }
                uiFacet.append("<input class='pv-value-search' id='pv-value-search-" + cleanName(category.name) + "' type='text' placeholder='Search values...' size=15><div class='pv-search-clear' id='pv-value-search-clear-" + cleanName(category.name) + "'>&nbsp;</div><br>");
                if (category.customSort != undefined || category.customSort != null)
                    uiFacet.append("<span class='pv-filterpanel-accordion-facet-sort' customSort='" + category.customSort.name + "'>Sort: " + category.customSort.name + "</span>");
                else uiFacet.append("<span class='pv-filterpanel-accordion-facet-sort'>Sort: A-Z</span>");
                uiFacet.append(createStringFacet(category.name));
                var item = _itemTotals[category.name];
                for (value in item.values) {
                    total = item.values[value];
                    total.valueItem = $("#" + total.id);
                    total.itemCount = total.valueItem.find('span').last();
                }
                $("#pv-value-search-" + cleanName(category.name)).on('keyup', function (e) {
                    var clean = cleanName(category.name), input = cleanName(this.value.toLowerCase());
                    if (input != "") {
                        var search = [];
                        search = $('.pv-filterpanel-accordion-facet-list-item[id^="pv-facet-item-' + clean + '"]');
                        search.hide();
                        search.filter(function () {
                            return cleanName($(this).children().eq(0).attr('itemvalue').toLowerCase()).indexOf(input) >= 0 && $(this).children().eq(2).html() > 0;
                        }).show();
                        $("#pv-value-search-clear-" + clean).css("visibility", "visible");
                    }
                    else {
                        $('.pv-filterpanel-accordion-facet-list-item[id^="pv-facet-item-' + clean + '"]').show();
                        $("#pv-value-search-clear-" + clean).css("visibility", "hidden");
                    }
                });

                $("#pv-value-search-clear-" + cleanName(category.name)).click(function (e) {
                    var clean =  cleanName(category.name);
                    $("#pv-value-search-" + clean).val("");
                    $("#pv-value-search-clear-" + clean).css("visibility", "hidden");
                    $('.pv-filterpanel-accordion-facet-list-item[id^="pv-facet-item-' + clean + '"]').show();
                });


                $("#pv-cat-" + cleanName(category.name) + " .pv-facet-facetitem").click(function (e) { facetItemClick(this); });
                $("#pv-cat-" + cleanName(category.name) + " .pv-facet-facetitem-label").click(function (e) {
                    var cb = $(this).prev();
                    cb.prop("checked", !cb.prop("checked"));
                    facetItemClick(cb[0]);
                });
                $("#pv-cat-" + cleanName(category.name) + " .pv-filterpanel-accordion-facet-sort").click(function (e) {
                    var sortDiv = $(this), sortText = sortDiv.text(), facetName = sortDiv.parent().prev().children('a').text();
                    var customSort = sortDiv.attr("customSort");
                    if (sortText == "Sort: A-Z") $(this).text("Sort: Quantity");
                    else if (sortText == "Sort: Quantity" && customSort == undefined) $(this).text("Sort: A-Z");
                    else if (sortText == "Sort: Quantity") $(this).text("Sort: " + customSort);
                    else $(this).text("Sort: A-Z");
                    sortFacetItems(facetName);
                });
            }
            else if (category.type == PivotViewer.Models.FacetType.Number) {
                for (var i = 0; i < PivotCollection.items.length; i++) {
                    var item = PivotCollection.items[i];
                    var facet = item.getFacetByName(category.name);
                    if (facet != undefined) {
                        for (var k = 0; k < facet.values.length; k++) {
                            var value = facet.values[k].value, total = _facetNumericItemTotals[facet.name];
                            if (total != undefined) total.values.push(value);
                            else _facetNumericItemTotals[facet.name] = { facet: facet.name, values: [value], filtered: true };
                        }
                    }
                    else {
                        var id = "pv-facet-item-" + cleanName(category.name) + "__" + cleanName("(no info)");
                        var values = _itemTotals[category.name];
                        if (values == undefined) values = _itemTotals[category.name] = { values: [], facet: category.name, filtered: true };
                        var total = values.values["(no info)"];
                        if (total == undefined) values.values["(no info)"] = ({ id: id, value: "(no info)", count: 1 });
                        else total.count++;
                    }
                }
                uiFacet.append("<div id='pv-filterpanel-category-numberitem-" + cleanName(category.name) + "'></div>");
            }
            else if (category.type == PivotViewer.Models.FacetType.Ordinal) {
                for (var i = 0; i < PivotCollection.items.length; i++) {
                    var item = PivotCollection.items[i];
                    var facet = item.getFacetByName(category.name);
                    if (facet != undefined) {
                        for (var k = 0; k < facet.values.length; k++) {
                            var value = facet.values[k].value, total = _facetOrdinalItemTotals[facet.name];
                            if (total != undefined) total.values.push(value);
                            else _facetOrdinalItemTotals[facet.name] = { facet: facet.name, values: [value], filtered: true };
                        }
                    }
                    else {
                        var id = "pv-facet-item-" + cleanName(category.name) + "__" + cleanName("(no info)");
                        var values = _itemTotals[category.name];
                        if (values == undefined) values = _itemTotals[category.name] = { values: [], facet: category.name, filtered: true };
                        var total = values.values["(no info)"];
                        if (total == undefined) values.values["(no info)"] = ({ id: id, value: "(no info)", count: 1 });
                        else total.count++;
                    }
                }
                uiFacet.append("<div id='pv-filterpanel-category-numberitem-" + cleanName(category.name) + "'></div>");
            }

            category.uiInit = true;
            release();
        });
    }

    // Filters the facet panel items and updates the counts
    filterFacets = function (viewFacet) {
        var category = PivotCollection.getCategoryByName(viewFacet.children().html());
        if (!category.isFilterVisible || !category.recount) return;

        if (!category.uiInit) initUIFacet(category);
        
        LoadSem.acquire(function (release) {
            var checkList = [];
            if (_filterList.length * 2 < _tiles.length) checkList = _filterList;
            else {
                for (var i = 0; i < _tiles.length; i++) {
                    if (!_tiles[i].filtered) checkList.push(_tiles[i]);
                }
            }

            if (category.type == PivotViewer.Models.FacetType.String) {
                var filterList = [];
                var emptyItem = PivotViewer.Utils.escapeMetaChars('pv-facet-item-' + cleanName(category.name) + '__' + cleanName("(no info)"));
                for (var j = 0; j < checkList.length; j++) {
                    var facet = checkList[j].item.getFacetByName(category.name);
                    if (facet == undefined) {
                        var filteredItem = filterList[emptyItem];
                        if (filteredItem != undefined) filteredItem.count++;
                        else filterList[emptyItem] = { count: 1 };
                        continue;
                    }
                    for (var k = 0; k < facet.values.length ; k++) {
                        var item = PivotViewer.Utils.escapeMetaChars('pv-facet-item-' + cleanName(category.name) + '__' + cleanName(facet.values[k].value));
                        var filteredItem = filterList[item];
                        if (filteredItem != undefined) filteredItem.count++;
                        else filterList[item] = { count: 1 };
                    }
                }

                if (checkList == _filterList) {
                    var values = _itemTotals[category.name].values;
                    for (var value in values) {
                        var item = values[value];
                        if (filterList[item.id] == undefined) {
                            if (!_selectedFacets[category.name]) item.valueItem.hide();
                        }
                        else {
                            item.valueItem.show();
                            item.itemCount.text(filterList[item.id].count);
                        }
                    }
                }
                else {
                    var values = _itemTotals[category.name].values;
                    for (var value in values) {
                        var item = values[value];
                        var count;
                        if (filterList[item.id] == undefined) count = _itemTotals[category.name].values[value].count;
                        else count = _itemTotals[category.name].values[value].count - filterList[item.id].count;
                        if (count == 0) {
                            if (!_selectedFacets[category.name]) item.valueItem.hide();
                        }
                        else {
                            item.valueItem.show();
                            item.itemCount.text(count);
                        }
                    }
                }
                sortFacetItems(category.name);
            }
            else if (category.type == PivotViewer.Models.FacetType.DateTime) {
                var filterList = [];
                var emptyItem = PivotViewer.Utils.escapeMetaChars('#pv-facet-item-' + cleanName(category.name) + '__' + cleanName("(no info)"));
                for (var i = 0; i < checkList.length; i++) {
                    var facet = checkList[i].item.getFacetByName(category.name);
                    if (facet == undefined) {
                        var filteredItem = filterList[emptyItem];
                        if (filteredItem != undefined) filteredItem.count++;
                        else filterList[item] = { count: 1 };
                    }
                    else {
                        for (var j = 0; j < category.datetimeBuckets.length && j < 2; j++) {
                            var group = category.datetimeBuckets[j];
                            for (var k = 0; k < group.length; k++) {
                                if (group[k].items[checkList[i].item.id + "a"] == undefined) continue;
                                var item = PivotViewer.Utils.escapeMetaChars("#pv-facet-item-" + cleanName(category.name) + "__" + cleanName(group[k].name.toString()));
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
                            item = PivotViewer.Utils.escapeMetaChars("#pv-facet-item-" + cleanName(category.name) + "__" + cleanName(group[k].name.toString()));
                            if (filterList[item] == undefined) {
                                if (!_selectedFacets[category.name]) $(item).hide();
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
                            item = PivotViewer.Utils.escapeMetaChars("#pv-facet-item-" + cleanName(category.name) + "__" + cleanName(group[k].name.toString()));
                            var count;
                            if (filterList[item] == undefined) count = group[k].items.length;
                            else count = group[k].items.length - filterList[item].count;
                            if (count == 0) {
                                if (!_selectedFacets[category.name]) $(item).hide();
                            }
                            else {
                                $(item).show();
                                $(item).find('span').last().text(count);
                            }
                        }
                    }
                }
            }
            else if (category.type == PivotViewer.Models.FacetType.Number) {
                if (!_selectedFacets[category.name]) {
                    if (_filterList.length == _tiles.length)
                        createNumberFacet(category, _facetNumericItemTotals[category.name].values);
                    else {
                        var values = [];
                        for (var i = 0; i < _filterList.length; i++) {
                            var facet = _filterList[i].item.getFacetByName(category.name);
                            if (facet == undefined) continue;
                            for (var v = 0; v < facet.values.length; v++) {
                                values.push(facet.values[v].value);
                            }
                        }
                        createNumberFacet(category, values);
                    }
                }
            }
            else if (category.type == PivotViewer.Models.FacetType.Ordinal) {
                if (!_selectedFacets[category.name]) {
                    if (_filterList.length == _tiles.length)
                        createOrdinalFacet(category, _facetOrdinalItemTotals[category.name].values);
                    else {
                        var values = [];
                        for (var i = 0; i < _filterList.length; i++) {
                            var facet = _filterList[i].item.getFacetByName(category.name);
                            if (facet == undefined) continue;
                            for (var v = 0; v < facet.values.length; v++) {
                                values.push(facet.values[v].value);
                            }
                        }
                        createOrdinalFacet(category, values);
                    }
                }
            }

            if (Settings.showMissing) $('#pv-facet-item-' + cleanName(category.name) + '__' + cleanName("(no info)")).show();
            else $('#pv-facet-item-' + cleanName(category.name) + '__' + cleanName("(no info)")).hide();

            category.recount = false;
            release();
        });
    };

    deselectInfoPanel = function () {
        //de-select details
        $('.pv-infopanel').fadeOut();
        $('.pv-infopanel-heading').empty();
        $('.pv-infopanel-details').empty();
    };

    cleanName = function (uncleanName) {
        name = uncleanName.replace(/[^\w]/gi, '_');
        _nameMapping[name] = uncleanName;      
        return name;
    }

    //Events
    $.subscribe("/PivotViewer/Models/Collection/Loaded", function (event) {
        var store = Lawnchair({ name: PivotCollection.name });
        store.get("Settings", function (result) {
            if (result != null) {
                Settings = result.value;
                for (var i = 0; i < Settings.visibleCategories.length; i++)
                    Settings.visibleCategories[PivotCollection.categories[Settings.visibleCategories[i]].name] = true;
            }
            else {
                Settings.showMissing = false;
                Settings.visibleCategories = [];
                for (var i = 0; i < PivotCollection.categories.length; i++) {
                    Settings.visibleCategories.push(i);
                    Settings.visibleCategories[PivotCollection.categories[i].name] = true;
                }
            }
            $.publish("/PivotView/Models/Settings/Loaded");
        });
    });

    $.subscribe("/PivotView/Models/Settings/Loaded", function (event) {
        //toolbar
        var toolbarPanel = "<div class='pv-toolbarpanel'>";

        var brandImage = PivotCollection.brandImage;
        if (brandImage.length > 0) toolbarPanel += "<img class='pv-toolbarpanel-brandimage' src='" + brandImage + "'></img>";
        toolbarPanel += "<span class='pv-toolbarpanel-name'>" + PivotCollection.name + "</span>";
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
            stop: function (event, ui) {zoom(ui.value);}
        });

        //main panel
        _self.append("<div class='pv-mainpanel'></div>");
        var mainPanelHeight = $(window).height() - $('.pv-toolbarpanel').height() - 30;
        $('.pv-mainpanel').css('height', mainPanelHeight + 'px');
        $('.pv-mainpanel').append("<div class='pv-filterpanel'></div>");
        $('.pv-mainpanel').append("<div class='pv-viewpanel'><canvas class='pv-canvas' width='" + _self.width() + "' height='" + mainPanelHeight + "px'></canvas></div>");
        $('.pv-mainpanel').append("<div class='pv-infopanel'></div>");

        //filter panel
        var filterPanel = $('.pv-filterpanel');
        filterPanel.append("<div class='pv-filterpanel-clearall'>Clear All</div>")
            .append("<input class='pv-filterpanel-search' type='text' placeholder='Search variables...' /><div class='pv-search-clear' id='pv-filterpanel-search-clear'>&nbsp;</div>")
            .css('height', mainPanelHeight - 13 + 'px');
        $('.pv-filterpanel-search').css('width', filterPanel.width() - 15 + 'px');

        //info panel
        var infoPanel = $('.pv-infopanel');
        infoPanel.css('left', (($('.pv-mainpanel').offset().left + $('.pv-mainpanel').width()) - 205) + 'px').css('height', mainPanelHeight - 28 + 'px');
        infoPanel.append("<div class='pv-infopanel-controls'></div>");
        $('.pv-infopanel-controls').append("<div><div class='pv-infopanel-controls-navleft'></div><div class='pv-infopanel-controls-navleftdisabled'></div><div class='pv-infopanel-controls-navbar'></div><div class='pv-infopanel-controls-navright'></div><div class='pv-infopanel-controls-navrightdisabled'></div></div>");
        $('.pv-infopanel-controls-navleftdisabled').hide();
        $('.pv-infopanel-controls-navrightdisabled').hide();
        infoPanel.append("<div class='pv-infopanel-heading'></div>");
        infoPanel.append("<div class='pv-infopanel-details'></div>");
        if (PivotCollection.maxRelatedLinks > 0) infoPanel.append("<div class='pv-infopanel-related'></div>");
        if (PivotCollection.copyrightName != "")
            infoPanel.append("<div class='pv-infopanel-copyright'><a href=\"" + PivotCollection.copyrightHref + "\" target=\"_blank\">" + PivotCollection.copyrightName + "</a></div>");
        infoPanel.hide();

        //init DZ Controller
        var baseCollectionPath = PivotCollection.imageBase;
        if (!(baseCollectionPath.indexOf('http', 0) >= 0 || baseCollectionPath.indexOf('www.', 0) >= 0))
            baseCollectionPath = PivotCollection.base.substring(0, PivotCollection.base.lastIndexOf('/') + 1) + baseCollectionPath;
        var canvasContext = $('.pv-canvas')[0].getContext("2d");

        //Init Tile Controller and start animation loop
        TileController = new PivotViewer.Views.TileController(_imageController);
        _tiles = TileController.initTiles(PivotCollection.items, baseCollectionPath, canvasContext);
        //Init image controller
        _imageController.setup(baseCollectionPath.replace("\\", "/"));
    });

    $.subscribe("/PivotViewer/Settings/Changed", function (event) {
        var selCategory = PivotCollection.categories[event.visibleCategories[0]];
        if (!selCategory.uiInit) initUIFacet(selCategory);
        selectView(0);

        LoadSem.acquire(function (release) {
            var facetSelect = $(".pv-facet"), sortSelect = $(".pv-toolbarpanel-sort"), longSearchSelect = $("#pv-long-search-cat");
            facetSelect.hide();
            facetSelect.attr("visible", "invisible");
            $(".pv-toolbarpanel-sort option").remove();
            $("#pv-long-search-cat option").remove();
            _longStringCategories = [];

            for (var i = 0; i < event.visibleCategories.length; i++) {
                var category = PivotCollection.categories[event.visibleCategories[i]];
                if (!category.isFilterVisible) continue;
                if (category.type == PivotViewer.Models.FacetType.LongString) {
                    longSearchSelect.append("<option value='" + cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
                    _longStringCategories.push(category);
                }
                else {
                    category.recount = true;
                    facetSelect.eq(category.visIndex).show();
                    facetSelect.eq(category.visIndex).attr("visible", "visible");
                    sortSelect.append("<option value='" + i + "' search='" + cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
                }
            }
            if ($("#pv-long-search-cat option").length == 0) {
                longSearchSelect.hide();
                $("#pv-long-search").hide();
            }
            else {
                longSearchSelect.show();
                $("#pv-long-search").show();
            }
            filterFacets(facetSelect.eq(selCategory.visIndex));
            $('.pv-filterpanel-accordion').accordion('option', 'active', selCategory.visIndex);
            $("#pv-primsort").trigger("change");
            release();
        });
    });

    $.subscribe("/PivotViewer/ImageController/Collection/Loaded", function (event) {
        var facets = ["<div class='pv-filterpanel-accordion'>"];
        var longSearch = ["<div id='pv-long-search-box'><br><select id='pv-long-search-cat'>"];
        var sort = [], activeNumber = 0;
        for (var i = 0; i < PivotCollection.categories.length; i++) {
            var category = PivotCollection.categories[i];
            if (category.isFilterVisible) {
                if (category.type == PivotViewer.Models.FacetType.LongString) {
                    longSearch.push("<option value='" + cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
                    _longStringCategories.push(category);
                }
                else {
                    activeNumber++;
                    facets.push("<h3 class='pv-facet' style='display:inherit' facet='" + cleanName(category.name.toLowerCase()) + "'><a href='#' title='" + category.name + "'>" + category.name + "</a><div class='pv-filterpanel-accordion-heading-clear' facetType='" + category.type + "'>&nbsp;</div></h3><div style='display:'inherit' style='height:30%' id='pv-cat-" + cleanName(category.name) + "'></div>");
                    sort.push("<option value='" + i + "' search='" + cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
                }
            }
        }
        if (longSearch.length > 1) {
            longSearch.push("</div></select>");
            $(".pv-filterpanel").append(longSearch.join('') + "<span class='pv-search-clear' id='pv-long-search-clear'>&nbsp;</span><input type=text length=25 id='pv-long-search' placeholder='Search text...'>");
            $("#pv-long-search").on("keyup", function (e) {
                var input = this.value.toLowerCase();
                if (e.keyCode == 13) {
                    var category = PivotCollection.getCategoryByName([$("#pv-long-search-cat").val()]);
                    if(!category.uiInit) {
                        Loader.loadColumn(category);
                        category.uiInit = true;
                    }
                    LoadSem.acquire(function (release) {
                        if ($('#pv-long-search').val() != null && $('#pv-long-search').val() != "")
                            _longStringFacet = { facet: _nameMapping[$("#pv-long-search-cat").val()], value: $("#pv-long-search").val().toLowerCase() };
                        else _longStringFacet = null;
                        filterCollection();
                        release();
                    });
                }
                else $("#pv-long-search").css("text-decoration", "").css("color", "black");
                $("#pv-long-search-clear").css("visibility", "visible");
            });
            $("#pv-long-search-clear").click(function (e) {
                $("#pv-long-search").val("");
                $("#pv-long-search-clear").css("visibility", "hidden");
                if (_longStringFacet != null) {
                    _longStringFacet = null;
                    filterCollection();
                }
            });
            $("#pv-long-search-cat").on("mousedown", function (e) {
                if ($(this).attr("dirty") == 1) {
                    $("#pv-long-search-cat option").remove();
                    var search = $('.pv-filterpanel-search').val();
                    for (var i = 0; i < _longStringCategories.length; i++) {
                        var category = _longStringCategories[i], clean = cleanName(category.name.toLowerCase());
                        if (search != "" && clean.indexOf(search) < 0) continue;
                        $("#pv-long-search-cat").append("<option value='" + cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
                    }
                }
                $(this).attr("dirty", 0);
            });
        }
        facets.push("</div>");
        $(".pv-filterpanel").append(facets.join(''));

        // Minus an extra 25 to leave room for the version number to be added underneath
        $(".pv-filterpanel-accordion").css('height', ($(".pv-filterpanel").height() - $(".pv-filterpanel-search").height() - 75) -
            $("#pv-long-search-box").height() + "px");

        $(".pv-filterpanel-accordion").accordion({ icons: false});
        $('#pv-primsortcontrols').append('<select id="pv-primsort" class="pv-toolbarpanel-sort">' + sort.join('') + '</select>');

        $(".pv-filterpanel-accordion").accordion("option", "active", activeNumber);
        
        var viewPanel = $('.pv-viewpanel');
        var width = _self.width();
        var height = $('.pv-mainpanel').height();
        var offsetX = $('.pv-filterpanel').width() + 18;
        var offsetY = 4;

        if (PivotCollection.config == undefined) PivotCollection.config = [];
        if (PivotCollection.config.views == undefined) PivotCollection.config.views = ["grid", "bucket", "crosstab"];
        if (_options.View != undefined && PivotCollection.config.views.indexOf(_options.View) < 0) PivotCollection.config.views.push(_options.View)
        for (var i = 0; i < PivotCollection.config.views.length; i++) {
            var viewName = PivotCollection.config.views[i];
            PivotViewer.Utils.loadScript("src/views/" + viewName.toLowerCase() + "view.js");
            eval("var view = new PivotViewer.Views." + viewName.charAt(0).toUpperCase() + viewName.substring(1) + "View()");
            view.setOptions(_options);
            _views.push(view);

        }

        for (var i = 0; i < _views.length; i++) {
            if (_views[i] instanceof PivotViewer.Views.IPivotViewerView) {
                _views[i].setup(width, height, offsetX, offsetY, TileController.getMaxTileRatio());
                viewPanel.append("<div class='pv-viewpanel-view' id='pv-viewpanel-view-" + i + "'>" + _views[i].getUI() + "</div>");
                $('.pv-toolbarpanel-viewcontrols').append("<div class='pv-toolbarpanel-view' id='pv-toolbarpanel-view-" + i + "' title='" + _views[i].getViewName() + "'><img id='pv-viewpanel-view-" + i + "-image' src='" + _views[i].getButtonImage() + "' alt='" + _views[i].getViewName() + "' /></div>");
            }
        }

        //loading completed
        $('.pv-loading').remove();

        //Set the width for displaying breadcrumbs as we now know the control sizes 
        var controlsWidth = $('.pv-toolbarpanel').innerWidth() - ($('.pv-toolbarpanel-brandimage').outerWidth(true) + 25 + $('.pv-toolbarpanel-name').outerWidth(true) + 30 + $('.pv-toolbarpanel-zoomcontrols').outerWidth(true) + _views.length * 29 + 2 * $('.pv-toolbarpanel-sortcontrols').outerWidth(true));
        $('.pv-toolbarpanel-facetbreadcrumb').css('width', controlsWidth + 'px');

        var filterPanel = $('.pv-filterpanel');
        filterPanel.append("<div class='pv-filterpanel-version'><a href='#pv-open-version'>About</a>&nbsp<a href='#pv-open-Settings'>Settings</a></div>");
        filterPanel.append("<div id='pv-open-version' class='pv-modal-dialog'><div><a href='#pv-modal-dialog-close' title='Close' class='pv-modal-dialog-close'>X</a><h2>SuAVE: <u>Su</u>rvey <u>A</u>nalysis <u>V</u>isualization and <u>E</u>xploration</h2><p>This app was designed and developed at the <a href='www.sdsc.edu'>San Diego Supercomputer Center</a> for the purpose of enabling innovative visualization of common analytical and statistical techniques with the particular application to education.<p>Project Leads:<br>Ilya Zaslavsky, SDSC (<a href='mailto:zaslavsk@sdsc.edu'>zaslavsk@sdsc.edu</a>)<br>Prof. Akos Rona-Tas, UCSD Sociology (<a href='mailto:aronatas@ucsd.edu'>aronatas@ucsd.edu</a>)<br>Prof. Kevin Lewis, UCSD Sociology (<a href='mailto:lewis@ucsd.edu'>lewis@ucsd.edu</a>)<p>Lead Programmer:<br>Ren&eacute; Patnode, UCSD Sociology (<a href='mailto:rpatnode@ucsd.edu'>rpatnode@ucsd.edu</a>)<p>Funded by <a href='http://www.nsf.gov/awardsearch/showAward?AWD_ID=1443082'>NSF Grant ACI-1443082</a>.</div></div>");
        filterPanel.append("<div id='pv-open-Settings' class='pv-modal-dialog modal-xl'><div><h2>Settings</h2><div id='pv-options-text'>&nbsp;</div></div></div>");
        var html = "<input type='checkbox' id='show-missing'" + (Settings.showMissing ? " checked" : "") + "> Display missing values<p><h3>Visible Variables (Double-click to select)</h3><p>";
        html += "<table><tr><th>All Variables:</th><th>Variables to Display:</th><tr><td><select id='pv-all-columns' multiple style='width:250px' size=20>";
        for (var i = 0; i < PivotCollection.categories.length; i++) {
            var category = PivotCollection.categories[i];
            html += "<option value=" + i + " search='" + cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>";
        }
        html += "</select></td><td><select id='pv-column-select' multiple style='width:250px' size=20>";
        if (Settings.visibleCategories.length == 0) html += "<option value='-1'>Select Variables...</option>";
        else {
            for (var i = 0; i < Settings.visibleCategories.length; i++) {
                var category = PivotCollection.categories[Settings.visibleCategories[i]];
                html += "<option value=" + Settings.visibleCategories[i] + " search='" + cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>";
            }
        }
        html += "</select></td><td width=200><input id='pv-column-search' placeholder='Search For Variable...' type='text' size=20><div " +
            "class='pv-search-clear' id='pv-column-search-clear'>&nbsp;</div><p><button id='pv-column-select-all'>Select All</button><p><button " +
            "id='pv-column-deselect-all'>Deselect All</button><p><button id='pv-settings-submit'>Submit</button><p><button " +
            "id='pv-Settings-cancel'>Cancel</button></td></table>";
        $("#pv-options-text").html(html);
        $("#pv-all-columns").dblclick(function (e) {
            if ($("#pv-all-columns option[value='-1']").length > 0) return;
            var value = parseFloat($("#pv-all-columns").val()), category = PivotCollection.categories[value];
            if ($("#pv-column-select option[value='-1']").length > 0) { $("#pv-column-select option[value='-1']").remove();}
            var selectList = $("#pv-column-select option");
            for (var i = 0; i < selectList.length; i++) {
                if (parseFloat(selectList[i].value) == value) break;
                else if (parseFloat(selectList[i].value) > value) {
                    $(selectList[i]).before($("<option></option>").attr("search", cleanName(category.name.toLowerCase())).val(value).html(category.name));
                    break;
                }
            }
            if (i == selectList.length) $("#pv-column-select").append("<option value=" + value + " search='" + cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
        });
        $("#pv-column-select").dblclick(function (e) {
            if ($("#pv-column-select option[value='-1']").length > 0) return;
            var value = parseFloat($("#pv-column-select").val()), category = PivotCollection.categories[value];
            $("#pv-column-select option[value='" + value + "']").remove();
            if ($("#pv-column-select option").length == 0) $("#pv-column-select").append("<option value='-1'>Select Variables...</option>");
        });
        $("#pv-column-select-all").click(function (e) {
            var selectList = $("#pv-all-columns option"), selectList2 = $("#pv-column-select option");
            if (selectList.eq(0).val() == -1) return;
            if (selectList2.eq(0).val() == -1) $("#pv-column-select option").remove();
            for (var i = 0, j = 0; i < selectList.length;) {
                var value = parseFloat(selectList.eq(i).val()), category = PivotCollection.categories[value];
                if (j == selectList2.length) {
                    $("#pv-column-select").append($("<option></option>").attr("search", cleanName(category.name.toLowerCase())).val(value).html(category.name));
                    i++;
                }
                else if (value == parseFloat(selectList2[j].value)) { i++; j++; }
                else if (parseFloat(selectList2[j].value) > value) {
                    $(selectList2[j]).before($("<option></option>").attr("search", cleanName(category.name.toLowerCase())).val(value).html(category.name));
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
            Settings.visibleCategories = [];
            var selectList = $("#pv-column-select option");
            for (var i = 0; i < selectList.length; i++) {
                Settings.visibleCategories.push(selectList[i].value);
                Settings.visibleCategories[selectList[i].innerHTML] = true;
            }
            Settings.showMissing = $("#show-missing").prop("checked");

            var store = Lawnchair({ name: PivotCollection.name });
            store.save({ key: "Settings", value: Settings });

            $.publish("/PivotViewer/Settings/Changed", [Settings]);
            window.open("#pv-modal-dialog-close", "_self");

            _currentSort = $('#pv-primsort option').eq(0).html();
            var category = PivotCollection.getCategoryByName(_currentSort);
            if (!category.uiInit) initUIFacet(category);

            LoadSem.acquire(function (release) {
                _tiles.sort(tileSortBy(_currentSort, false, _stringFacets));
                _filterList = [];
                for (var i = 0; i < _tiles.length; i++) {
                    var tile = _tiles[i];
                    tile.missing = !Settings.showMissing && tile.item.getFacetByName(category.name) == undefined;
                    if (tile.filtered) _filterList.push(_tiles[i]);
                }
                $.publish("/PivotViewer/Views/Filtered", [{ tiles: _tiles, filterList: _filterList, sort: _currentSort }]);
                release();
            });

        });

        $("#pv-Settings-cancel").click(function (e) {
            window.open("#pv-modal-dialog-close", "_self");
            $("#show-missing").prop("checked", Settings.showMissing);
            if ($("#pv-all-columns option").eq(0).val() == -1) $("#pv-all-columns option").remove();
            initAllSelect("#pv-all-columns");
            if ($("#pv-column-select option").eq(0).val() == -1) $("#pv-column-select option").remove();
            initVisibleSelect("#pv-column-select", true);
            $("#pv-column-search").val("");
            $('#pv-column-search-clear').css("visibility", "hidden");
        });

        $("#pv-column-search").on("keyup", function (e) {
            var input = this.value.toLowerCase();
            if (input != "") {
                if ($("#pv-all-columns option").eq(0).val() == -1) $("#pv-all-columns option").remove();
                initAllSelect("#pv-all-columns", input);
                $("#pv-column-search-clear").css("visibility", "visible");
                if ($("#pv-all-columns option").length == 0)
                    $("#pv-all-columns").append("<option value='-1' css:'display: block'>No matching variables.</option>");
            }
            else {
                $("#pv-column-search-clear").css("visibility", "hidden");
                initAllSelect("#pv-all-columns");
            }          
        });

        $('#pv-column-search-clear').click(function (e) {
            $("#pv-column-search").val("");
            $('#pv-column-search-clear').css("visibility", "hidden");
            if ($("#pv-all-columns option").eq(0).val() == -1) $("#pv-all-columns option").remove();
            initAllSelect("#pv-all-columns");
        });

        $('.pv-toolbarpanel-view').click(function (e) {
            var viewId = this.id.substring(this.id.lastIndexOf('-') + 1, this.id.length);
            if (viewId != null) selectView(parseInt(viewId));
        });
        $('#pv-primsort').on('change', function (e) {
            _currentSort = $('#pv-primsort option:selected').html();
            var category = PivotCollection.getCategoryByName(_currentSort);
            if (!category.uiInit) initUIFacet(category);
            LoadSem.acquire(function (release) {
                _tiles.sort(tileSortBy(_currentSort, false, _stringFacets));
                _filterList = [];
                for (var i = 0; i < _tiles.length; i++) {
                    var tile = _tiles[i];
                    tile.missing = !Settings.showMissing && tile.item.getFacetByName(_currentSort) == undefined;
                    if (tile.filtered) _filterList.push(_tiles[i]);
                }
                $.publish("/PivotViewer/Views/Filtered", [{ tiles: _tiles, filterList: _filterList, sort: _currentSort }]);
                release();
            });
        });

        $(".pv-facet").click(function (e) { filterFacets($(this)); });

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
                var slider = sliders.eq(i);
                slider.slider('values', 0, slider.slider('option', 'min'));
                slider.slider('values', 1, slider.slider('option', 'max'));
                slider.prev().prev().html('&nbsp;');
            }
            //turn off clear buttons
            $('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
            $("#pv-long-search-clear").css("visibility", "hidden");
            $("#pv-long-search").val("");
            _longStringFacet = null;
            filterCollection();
        });

        $('.pv-filterpanel-accordion-heading-clear').click( function (e) {
            //Get facet type
            var facetType = this.attributes['facetType'].value;
            if (facetType == "DateTime") {
                //get selected items in current group
                var checked = $(this).parent().next().find('.pv-facet-facetitem:checked');
                checked.prop('checked', false);
                for (var i = 0; i < checked.length; i++) HideCustomDateRange($(checked[i]).attr('itemfacet'));
            }
            else if (facetType == "String") $(this).parent().next().find('.pv-facet-facetitem:checked').prop("checked", false);
            else if (facetType == "Number" || facetType == "Ordinal") {
                //reset range
                var slider = $(this).parent().next().find('.pv-filterpanel-numericslider');
                slider.slider('values', 0, slider.slider('option', 'min'));
                slider.slider('values', 1, slider.slider('option', 'max'));
                slider.prev().prev().html('&nbsp;');
            }
            filterCollection();
            $(this).css('visibility', 'hidden');
        });

        $('.pv-facet-customrange').on('change', function (e) { customRangeChanged(this); });
        $('.pv-infopanel-details').on("click", '.detail-item-value-filter', function (e) {
            $.publish("/PivotViewer/Views/Item/Filtered", [{
                Facet: $(this).parent().children().attr('pv-detail-item-title'),
                Item: this.getAttribute('pv-detail-item-value'), Values: null
            }]);
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
                if (_filterList[i].item.id == _selectedItem.item.id) {
                    var tile = _filterList[i - 1];
                    $.publish("/PivotViewer/Views/Item/Selected", [{ item: tile}]);
                    _views[_currentView].centerOnTile(tile);
                    break;
                }
            }
        });
        $('.pv-infopanel-controls-navright').click(function (e) {
            for (var i = 0; i < _filterList.length - 1; i++) {
                if (_filterList[i].item.id == _selectedItem.item.id) {
                    var tile = _filterList[i + 1];
                    $.publish("/PivotViewer/Views/Item/Selected", [{ item: tile, bkt: 0 }]);
                    _views[_currentView].centerOnTile(tile);
                    break;
                }
            }
        });

        $(".pv-toolbarpanel-sort").on("mousedown", function (e) {
            if ($(this).attr("dirty") == 1) initVisibleSelect("#" + $(this).attr("id"), false, cleanName($('.pv-filterpanel-search').val().toLowerCase()));
            $(this).attr("dirty", 0);
        });

        $('.pv-value-search').on('keyup', function (e) {
            var input = cleanName(this.value.toLowerCase());
            if (input != "") {
                var category = PivotCollection.getCategoryByName(_nameMapping[$(".pv-facet").eq($('.pv-filterpanel-accordion').accordion('option', 'active')).attr("facet")]), search = [];
                if (category.type == PivotViewer.Models.FacetType.String && category.name.toLowerCase().indexOf(input) == -1) {
                    search = $('.pv-filterpanel-accordion-facet-list-item[id^="pv-facet-item-' + cleanName(category.name) + '"]');
                    search.hide();
                    search = search.filter(function () {
                        return cleanName($(this).children().eq(0).attr('itemvalue').toLowerCase()).indexOf(input) >= 0 && $(this).children().eq(2).html() > 0;
                    });
                    search.show();
                    
                }
            }
            else $('.pv-filterpanel-accordion-facet-list-item').show();
        });

        $('#pv-value-search-clear').click(function (e) {
            $(".pv-value-search").val("");
            $('#pv-value-search-clear').css("visibility", "hidden");
            $(".pv-filterpanel-accordion").accordion("option", "collapsible", false);
            $(".pv-filterpanel-accordion-facet-list-item").show();
        });

        $('.pv-filterpanel-search').on('keyup', function (e) {
            var input = cleanName(this.value.toLowerCase());
            if (input != "") {
                var search = $(".pv-facet[facet*='" + input + "'][visible='visible']");
                search.show();
                $(".pv-toolbarpanel-sort").attr("dirty", 1);
                $("#pv-long-search-cat").attr("dirty", 1);
                $("#pv-long-search-cat").val($("#pv-long-search-cat option[value*='" + input + "']").eq(0).val());

                $(".pv-facet:not([facet*='" + input + "'][visible='visible'])").hide();            
                $("#pv-filterpanel-search-clear").css("visibility", "visible");
                if (search.length > 0) {
                    var category = PivotCollection.getCategoryByName(_nameMapping[search.eq(0).attr("facet")]);
                    if (!category.uiInit) initUIFacet(category);
                    LoadSem.acquire(function (release) {
                        $(".pv-filterpanel-accordion").accordion("option", "collapsible", false);
                        $('.pv-filterpanel-accordion').accordion('option', 'active', category.visIndex);
                        filterFacets(search.eq(0));
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
                $(".pv-toolbarpanel-sort").attr("dirty", 1);
                $("#pv-long-search-cat").attr("dirty", 1);
                $(".pv-filterpanel-accordion").accordion("option", "collapsible", false);
                $("#pv-filterpanel-search-clear").css("visibility", "hidden");
            }
        });

        $('#pv-filterpanel-search-clear').click(function (e) {
            $(".pv-filterpanel-search").val("");
            $(".pv-toolbarpanel-sort").attr("dirty", 1);
            $("#pv-long-search-cat").attr("dirty", 1);
            $('#pv-filterpanel-search-clear').css("visibility", "hidden");
            $(".pv-filterpanel-accordion").accordion("option", "collapsible", false);
            $(".pv-facet[visible='visible']").show();
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
            TileController.setQuarticEasingOut();

            var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
            if (delta > 0) { value = (value < 5) ? 5 : value + 5; }
            else if (delta < 0) { value = value - 5; }
            value = Math.max(0, Math.min(100, value));
            zoom(value, offsetX, offsetY);
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
                    TileController.setLinearEasingBoth();
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
            catch (err) { Debug.log(err.message); }
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
        var category = PivotCollection.getCategoryByName(_currentSort);
        if (!category.uiInit) initUIFacet(category);

        LoadSem.acquire(function (release) {
            _tiles.sort(tileSortBy(_currentSort, false, _stringFacets));

            for (var i = 0; i < _tiles.length; i++) {
                var tile = _tiles[i];
                tile.missing = !Settings.showMissing && tile.item.getFacetByName(_currentSort) == undefined;
            }

            filterCollection();

            if (Settings.visibleCategories.length < PivotCollection.categories.length)
                $.publish("/PivotViewer/Settings/Changed", [Settings]);
            else $(".pv-facet").attr("visible", "visible");

            if (_options.View != undefined) selectView(_options.View);
            else selectView(0);
            TileController.beginAnimation();
            release();
        });
    });

    var oldValue = 0;
    zoom = function (value, x, y) {
        if (x == undefined) x = $('.pv-canvas').width() / 2;
        if (y == undefined) y = $('.pv-canvas').height() / 2;
        $('.pv-toolbarpanel-zoomslider').slider('option', 'value', value);
        $.publish("/PivotViewer/Views/Canvas/Zoom", [{ x: x, y: y, delta: (0.5 * (value - oldValue)) }]);
        oldValue = value;
    }

    initAllSelect = function (id, search) { //hack to avoid .hide() in IE
        if (search == undefined) search = "";
        var select = $(id);
        for (var i = 0; i < select.length; i++) {
            var selValue = select.eq(i).val();
            select.eq(i).children().remove();
            for (var j = 0; j < PivotCollection.categories.length; j++) {
                var category = PivotCollection.categories[j];
                if (j == selValue || category.name.toLowerCase().indexOf(search) != -1)
                    select.eq(i).append("<option value=" + j + " search='" + cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
            }
            select.eq(i).val(selValue);
        }
    }

    initVisibleSelect = function (id, showFilterInvisible, search) { //hack to avoid .hide() in IE
        if (search == undefined) search = "";
        if (showFilterInvisible == undefined) showFilterInvisible = false;
        var select = $(id);
        for (var i = 0; i < select.length; i++) {
            var selValue = select.eq(i).val();
            select.eq(i).children().remove();
            for (var j = 0; j < Settings.visibleCategories.length; j++) {
                var index = Settings.visibleCategories[j], category = PivotCollection.categories[index];   
                if (((category.isFilterVisible && category.type != PivotViewer.Models.FacetType.LongString) || showFilterInvisible) &&
                    (index == selValue || cleanName(category.name).toLowerCase().indexOf(search) != -1))
                    select.eq(i).append("<option value=" + Settings.visibleCategories[j] + " search='" + cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
            }
            select.eq(i).val(selValue);
       }
    }

    //Show the info panel
    $.subscribe("/PivotViewer/Views/Item/Selected", function (evt) {
        if (evt.item === undefined || evt.item == null) {
            deselectInfoPanel();
            if (_selectedItem != null) _selectedItem.Selected(false);
            _views[_currentView].setSelected(null);
            return;
        }

        var selectedItem = evt.item;
        if (selectedItem != null) {
            var alternate = true;
            $('.pv-infopanel-heading').empty();
            $('.pv-infopanel-heading').append("<a href=\"" + selectedItem.item.href + "\" target=\"_blank\">" + selectedItem.item.name + "</a></div>");
            var infopanelDetails = $('.pv-infopanel-details');
            infopanelDetails.empty();
            if (selectedItem.item.description != undefined && selectedItem.item.description.length > 0) {
                infopanelDetails.append("<div class='pv-infopanel-detail-description' style='height:100px;'>" + selectedItem.item.description + "</div><div class='pv-infopanel-detail-description-more'>More</div>");
            }
            // nav arrows...
            if (selectedItem.item.id == _filterList[0].id) {
                $('.pv-infopanel-controls-navleft').hide();
                $('.pv-infopanel-controls-navleftdisabled').show();
            }
            else {
                $('.pv-infopanel-controls-navleft').show();
                $('.pv-infopanel-controls-navleftdisabled').hide();
            }
            if (selectedItem.item.id == _filterList[_filterList.length - 1].id) {
                $('.pv-infopanel-controls-navright').hide();
                $('.pv-infopanel-controls-navrightdisabled').show();
            }
            else {
                $('.pv-infopanel-controls-navright').show();
                $('.pv-infopanel-controls-navrightdisabled').hide();
            }

            var detailDOM = [];
            var detailDOMIndex = 0;

            var facets = Loader.getRow(selectedItem.item.id);
            for (var i = 0, k = 0; i < facets.length; i++) {
                var category = PivotCollection.getCategoryByName(facets[i].name);
                if (!Settings.visibleCategories[category.name]) continue;

                detailDOM[detailDOMIndex] = "<div class='pv-infopanel-detail " + (alternate ? "detail-dark" : "detail-light") + "'><div class='pv-infopanel-detail-item detail-item-title' pv-detail-item-title='" + category.name + "'>" + category.name + "</div>";
                for (var j = 0; j < facets[i].values.length; j++) {
                    var value = facets[i].values[j];
                    detailDOM[detailDOMIndex] += "<div pv-detail-item-value='" + value.value/*(typeof value.value == "string" ? cleanName(value.value) : value.value) */+ 
                        "' class='pv-infopanel-detail-item detail-item-value" + (category.isFilterVisible ? " detail-item-value-filter" : "") + "'>";
                    if (value.href != null && value.href != "")
                        detailDOM[detailDOMIndex] += "<a class='detail-item-link' href='" + value.href + "'>" + value.label + "</a>";
                    else detailDOM[detailDOMIndex] += value.label;
                    detailDOM[detailDOMIndex] += "</div>";
                }
                detailDOM[detailDOMIndex] += "</div>";
                detailDOMIndex++;
                alternate = !alternate;
            }
            if (selectedItem.item.links.length > 0) {
                $('.pv-infopanel-related').empty();
                for (var k = 0; k < selectedItem.item.links.length; k++) {
                    $('.pv-infopanel-related').append("<a href='" + selectedItem.item.links[k].href + "'>" + selectedItem.item.links[k].name + "</a><br>");
                }
            }
            infopanelDetails.append(detailDOM.join(''));
            $('.pv-infopanel').fadeIn();
            infopanelDetails.css('height', ($('.pv-infopanel').height() - ($('.pv-infopanel-controls').height() + $('.pv-infopanel-heading').height() + $('.pv-infopanel-copyright').height() + $('.pv-infopanel-related').height()) - 20) + 'px');

            if(_selectedItem != null) _selectedItem.Selected(false);
            selectedItem.Selected(true);

            _selectedItem = selectedItem;

            _views[_currentView].setSelected(_selectedItem); 
        }

    });

    $.subscribe("/PivotViewer/Views/Item/Filtered", function (evt) {
        if (evt == undefined || evt == null) return;

        var facetFilters = [];
        if (evt.length != undefined) facetFilters = evt;
        else facetFilters.push(evt);

        for (var i = 0; i < facetFilters.length; i++) {
            var facetFilter = facetFilters[i];

            var category = PivotCollection.getCategoryByName(facetFilter.Facet);
            if (!category.uiInit) {
                initUIFacet(category);
                if (category.type == PivotViewer.Models.FacetType.Number)
                    createNumberFacet(category, _facetNumericItemTotals[category.name].values);
                else if(category.type == PivotViewer.Models.FacetType.Ordinal)
                    createOrdinalFacet(category, _facetOrdinalItemTotals[category.name].values);
            }
            LoadSem.acquire(function (release) {
                if (category.type == PivotViewer.Models.FacetType.String) {
                    $('.pv-facet-facetitem[itemfacet="' + PV.cleanName(facetFilter.Facet) + '"]:checked').prop('checked', false);
                    if (facetFilter.values) {
                        if (facetFilter.values.length == 1) {
                            var cb = $(PivotViewer.Utils.escapeMetaChars("#pv-facet-item-" + PV.cleanName(facetFilter.Facet) + "__" + PV.cleanName(facetFilter.values[0].toString())) + " input");
                            cb.prop('checked', true);
                            if(facetFilters.length == 1) facetItemClick(cb[0]);
                        }
                        else {
                            for (var j = 0; j < facetFilter.values.length; j++) {
                                $(PivotViewer.Utils.escapeMetaChars("#pv-facet-item-" + PV.cleanName(facetFilter.Facet) + "__" + PV.cleanName(facetFilter.values[j].toString())) + " input").prop('checked', true);
                            }
                            $(PivotViewer.Utils.escapeMetaChars("#pv-facet-item-" + PV.cleanName(facetFilter.Facet) + "__" + PV.cleanName(facetFilter.values[0].toString())) + " input").parent().parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
                            if (facetFilters.length == 1) filterCollection();
                        }
                    }
                    else {
                        var cb = $(PivotViewer.Utils.escapeMetaChars("#pv-facet-item-" + PV.cleanName(facetFilter.Facet) + "__" + PV.cleanName(facetFilter.Item.toString())) + " input");
                        cb.prop('checked', true);
                        if (facetFilters.length == 1) facetItemClick(cb[0]);
                    }
                }
                else if (category.type == PivotViewer.Models.FacetType.Number || category.type == PivotViewer.Models.FacetType.Ordinal) {
                    var s = $('#pv-filterpanel-numericslider-' + PivotViewer.Utils.escapeMetaChars(PV.cleanName(facetFilter.Facet)));
                    if (facetFilter.MaxRange == undefined) facetFilter.MaxRange = facetFilter.Item;
                    facetSliderDrag(s, facetFilter.Item, facetFilter.MaxRange, facetFilters.length == 1);
                }
                else if (category.type == PivotViewer.Models.FacetType.DateTime) {
                    var name = PV.cleanName(category.name);
                    $('#pv-facet-item-' + name + '___CustomRange')[0].firstElementChild.checked = true;
                    getCustomDateRange(name);
                    var textbox1 = $('#pv-custom-range-' + name + '__StartDate'),
                        textbox2 = $('#pv-custom-range-' + name + '__FinishDate');
                    var minDate = new Date(facetFilter.Item), maxDate = new Date(facetFilter.MaxRange);
                    textbox1[0].value = (minDate.getMonth() + 1) + "/" + minDate.getDate() + "/" + minDate.getFullYear();
                    textbox2[0].value = (maxDate.getMonth() + 1) + "/" + maxDate.getDate() + "/" + maxDate.getFullYear();
                    textbox1.datepicker("option", "minDate", minDate);
                    textbox2.datepicker("option", "maxDate", maxDate);

                    // Clear any filters already set for this facet
                    var checked = $(textbox1).parent().parent().parent().parent().children().next().find('.pv-facet-facetitem:checked');
                    for (var j = 0; j < checked.length; j++) {
                        if ($(checked).eq(j).attr('itemvalue') != 'CustomRange') $(checked).eq(j).prop('checked', false);
                    }
                    $(checked).parent().parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
                    if (facetFilters.length == 1) filterCollection();
                }
                release();
            });
        }
        if (facetFilters.length > 1) filterCollection();
    });

    facetItemClick = function (checkbox) {
        var category = PivotCollection.getCategoryByName(_nameMapping[$(checkbox).attr('itemfacet')]);
        var value = _nameMapping[$(checkbox).attr('itemvalue')], enlarge, clear; 
        if ($(checkbox).prop('checked')) {
            $(checkbox).parent().parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
            if ($(checkbox).attr('itemvalue') == "CustomRange"){
                getCustomDateRange($(checkbox).attr('itemfacet'));
                return;
            }
            enlarge = ($("input[itemfacet|='" + $(checkbox).attr("itemfacet") + "']:checked").length > 1);
            clear = false;
        }
        else if (!$(checkbox).prop('checked')) {
            if ($(checkbox).attr('itemvalue') == "CustomRange") HideCustomDateRange($(checkbox).attr('itemfacet'));
            if ($("input[itemfacet|='" + $(checkbox).attr("itemfacet") + "']:checked").length == 0) {
                enlarge = true;
                $(checkbox).parent().parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
            }
            else enlarge = false;
            clear = true;
        }
        if (category.type == PivotViewer.Models.FacetType.String) filterCollection({ category: category, enlarge: enlarge, clear: clear, value: value });
        else {
            start = $(checkbox).attr('startdate');
            end = $(checkbox).attr('enddate');
            filterCollection({ category: category, enlarge: enlarge, clear: clear, value: value, min: new Date(start), max: new Date(end) })
        }

    };

    facetSliderDrag = function (slider, min, max, doFilter) {
        var that = $(slider);
        var thisMin = that.slider('option', 'min'), thisMax = that.slider('option', 'max');
        if (min == "(no info)") min = 0;
        if (min > thisMin || max < thisMax) {
            that.parent().find('.pv-filterpanel-numericslider-range-val').text(min + " - " + max);
            that.slider('values', 0, min);
            that.slider('values', 1, max);
            that.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
        }
        else if (min == thisMin && max == thisMax)
            that.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
        if(doFilter != false) filterCollection();
    }

    bucketize = function (bucketGroups, index, bucketName, id, date) {
        if (bucketGroups[index] == undefined) bucketGroups[index] = [];
        var group = bucketGroups[index], bucket = group[bucketName + "a"];
        if (bucket != undefined) {
            bucket.items[id + "a"] = id;
            bucket.items.push(id);
            if (bucket.start > date) bucket.start = date;
            else if (bucket.end < date) bucket.end = date;
        }
        else {
            bucket = new PivotViewer.Models.DateTimeInfo(bucketName, date, date);
            bucket.items[id + "a"] = id; //needs to be a string
            bucket.items.push(id);
            group.push(bucket);
            group[bucketName + "a"] = bucket;
        }
    };

    createDatetimeBuckets = function (category) {
        var min = new Date(8640000000000000), max = new Date(-8640000000000000);

        var hasHours = false, hasMinutes = false, hasSeconds = false;
        for (var j = 0; j < PivotCollection.items.length; j++) {
            var item = PivotCollection.items[j], facet = item.getFacetByName(category.name);
            if (facet == undefined) continue;
            var date = new Date(facet.values[0].value);
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

        for (var j = 0; j < PivotCollection.items.length; j++) {
            var item = PivotCollection.items[j], facet = item.getFacetByName(category.name);
            if (facet == undefined) continue;
            var date = new Date(facet.values[0].value);

            var k = 0, year = date.getFullYear(), decade = year - (year % 10);

            if (hasDecades) bucketize(category.datetimeBuckets, k++, decade + "s", item.id, date);
            if (hasYears) bucketize(category.datetimeBuckets, k++, year, item.id, date);
            var month = PivotViewer.Utils.getMonthName(date);
            if (hasMonths) bucketize(category.datetimeBuckets, k++, month + ", " + year, item.id, date);
            var day = date.getDate();
            if (hasDays) bucketize(category.datetimeBuckets, k++, month + " " + day + ", " + year, item.id, date);
            var hours = PivotViewer.Utils.getHour(date), meridian = PivotViewer.Utils.getMeridian(date);
            if (hasHours) bucketize(category.datetimeBuckets, k++, month + " " + day + ", " + year + " " + hours + " " + meridian, item.id, date);
            var mins = PivotViewer.Utils.getMinutes(date);
            if (hasMinutes) bucketize(category.datetimeBuckets, k++, month + " " + day + ", " + year + " " + hours + ":" + mins + " " + meridian, item.id, date);
            var secs = PivotViewer.Utils.getSeconds(date);
            if (hasSeconds) bucketize(category.datetimeBuckets, k, month + " " + day + ", " + year + " " + hours + ":" + mins + ":" + secs + " " + meridian, item.id, date);
        }
        for (var j = 0; j < category.datetimeBuckets.length; j++) {
            category.datetimeBuckets[j].sort(function (a, b) { return a.start - b.start });
        }
        var k = 0;
        if (hasDecades) category.datetimeBuckets["decade"] = category.datetimeBuckets[k++];
        if (hasYears) category.datetimeBuckets["year"] = category.datetimeBuckets[k++];
        if (hasMonths) category.datetimeBuckets["month"] = category.datetimeBuckets[k++];
        if (hasDays) category.datetimeBuckets["day"] = category.datetimeBuckets[k++];
        if (hasHours) category.datetimeBuckets["hour"] = category.datetimeBuckets[k++];
        if (hasMinutes) category.datetimeBuckets["minute"] = category.datetimeBuckets[k++];
        if (hasSeconds) category.datetimeBuckets["second"] = category.datetimeBuckets[k];
        
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

    getCustomDateRange = function (facetName) {
        var facet = _nameMapping[facetName];
        var category = PivotCollection.getCategoryByName(facet);
        var maxYear, minYear, maxDate, minDate;
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

    customRangeChanged = function (textbox) {
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
            var checked = $(textbox).parent().parent().parent().parent().children().next().find('.pv-facet-facetitem:checked');
            for (var i = 0; i < checked.length; i++) {
                if ($(checked[i]).attr('itemvalue') != 'CustomRange')
                    $(checked[i]).prop('checked', false);
            }
            filterCollection();
        }
    };

    //Constructor
    $.fn.PivotViewer = function (method) {
        if (methods[method]) return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        else if (typeof method === 'object' || !method) return methods.init.apply(this, arguments);
        else $.error('Method ' + method + ' does not exist on jQuery.PivotViewer');
    };
})(jQuery);