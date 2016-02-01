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
var PV = {};
var PivotCollection = new PivotViewer.Models.Collection();
var TileController = null;
var Loader = null;
var LoadSem = new Semaphore(1);
var Settings = { showMissing: false, visibleCategories: undefined };

(function ($) {
    var _views = [],
        _itemTotals = [], //used to store the counts of all the string facets - used when resetting the filters
        _numericItemTotals = [], //used to store the counts of all the numeric facets - used when resetting the filters
        _ordinalItemTotals = [],
        _longstringFilters = null,
        _longStringCategories = [];
	    _stringFilters = [],
	    _numericFilters = [],
	    _datetimeFilters = [],
        _selectedFilters = [],
        _currentView = 0,
        _sortCategory = null;
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
        // PivotViewer can be initialized with these options:
        // Loader: a loader that inherits from ICollectionLoader must be specified. It takes the URL of the collection as a parameter.
        // ImageController: defaults to the DeepZoom image controller.
        init: function (options) {
            _self = this;
            _self.addClass('pv-wrapper');

            $(document).on("contextmenu", function () { return false; })

            _options = options;

            $.getJSON("defaults.json").always(function (defaultOptions) {

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
                        _initCollectionLoader(options);
                        window.open("#pv-modal-dialog-close", "_self");
                    });

                    $('.pv-load-file').on('change', function (e) {
                        var fileInput = $("#pv-load-file")[0];
                        Loader = new PivotViewer.Models.Loaders.LocalCSVLoader(fileInput.files[0]);
                        _initCollectionLoader(options);
                    });

                    window.open("#pv-file-selection", "_self");
                }
                else {
                    Loader = options.Loader;
                    _initCollectionLoader(options);
                }

            }).fail (function (jqxhr, textStatus, error) {
                var err = textStatus + ", " + error;
                Debug.log ("Getting defaults file failed: " + err);
            });
        }
    };



     var _initCollectionLoader = function (options) {
        //PV = this;
        _self.append("<div class='pv-loading'><img src='images/loading.gif' alt='Loading' /><span>Loading...</span></div>");
        $('.pv-loading').css('top', ($('.pv-wrapper').height() / 2) - 33 + 'px');
        $('.pv-loading').css('left', ($('.pv-wrapper').width() / 2) - 43 + 'px');

        if (Loader == undefined) throw "Collection loader is undefined.";
        if (Loader instanceof PivotViewer.Models.Loaders.ICollectionLoader) Loader.loadCollection(PivotCollection);
        else throw "Collection loader does not inherit from PivotViewer.Models.Loaders.ICollectionLoader.";
    };

    /// Create the individual controls for the facet
    var _bucketizeDateTimeFacet = function (facetName, array1, array2) {
        var facetControls = ["<ul class='pv-filterpanel-accordion-facet-list'>"];

        // deal with array1
        if (array1) {
            for (var i = 0; i < array1.length; i++) {
                var index = i + 1;
                facetControls[index] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-value-" + PV.cleanName(facetName) + "__" + PV.cleanName(array1[i].name.toString()) + "'>";
                facetControls[index] += "<input itemvalue='" + PV.cleanName(array1[i].name.toString()) + "' itemfacet='" + PV.cleanName(facetName.toString()) + "' startdate='" + array1[i].start.toISOString() + "' enddate='" + array1[i].end.toISOString() + "' class='pv-facet-value' type='checkbox' />"
                facetControls[index] += "<span class='pv-facet-value-label'>" +  array1[i].name + "</span>";
                facetControls[index] += "<span class='pv-facet-value-count'>0</span>"
                facetControls[index] += "</li>";
            }
        }
        facetControls[array1.length + 1] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-value-LineBreak' style='border-bottom:thin solid #E2E2E2;'></li>";
        facetControls[array1.length + 2] = "</ul>";
        facetControls[array1.length + 3] = "<ul class='pv-filterpanel-accordion-facet-list'>";

        // deal with array2
        if (array2) {
            for (var i = 0; i < array2.length; i++) {
                var index = i + 4 + array1.length;
                facetControls[index] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-value-" + PV.cleanName(facetName) + "__" + PV.cleanName(array2[i].name.toString()) + "'>";
                facetControls[index] += "<input itemvalue='" + PV.cleanName(array2[i].name.toString()) + "' itemfacet='" + PV.cleanName(facetName.toString()) + "' startdate='" + array2[i].start.toISOString() + "' enddate='" + array2[i].end.toISOString() +  "' class='pv-facet-value' type='checkbox' />"
                facetControls[index] += "<span class='pv-facet-value-label'>" +  array2[i].name + "</span>";
                facetControls[index] += "<span class='pv-facet-value-count'>0</span>"
                facetControls[index] += "</li>";
            }
        }
        facetControls[array1.length + array2.length + 4] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-value-LineBreak2' style='border-bottom:thin solid #E2E2E2;'></li>";
        facetControls[array1.length + array2.length + 5] = "</ul>";
        return facetControls.join('');
    };

    var _createCustomRange = function (facetName) {
        var facetControls = ["<ul class='pv-filterpanel-accordion-facet-list'>"];
        facetControls[1] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='pv-facet-value-" + PV.cleanName(facetName) + "__CustomRange'>";
        facetControls[1] += "<input itemvalue='CustomRange' itemfacet='" + PV.cleanName(facetName) + "' class='pv-facet-value' type='checkbox' />"
        facetControls[1] += "<span class='pv-facet-value-label'>Custom Range</span>";
        facetControls[1] += "</li>";
        facetControls[1] += "<ul class='pv-filterpanel-accordion-facet-list'>"
        facetControls[1] += "<li class='pv-filterpanel-accordion-facet-list-item' id='pv-custom-range-" + PV.cleanName(facetName) + "__Start' style='visibility:hidden;float:right'>"
        facetControls[1] += "<span class='pv-facet-customrange-label'>Start:</span>"
        facetControls[1] += "<input itemvalue='CustomRangeStart' itemfacet='" + PV.cleanName(facetName) + "' id='pv-custom-range-" + PV.cleanName(facetName) + "__StartDate' class='pv-facet-customrange' type='text'/>"
        facetControls[1] += "</li>";
        facetControls[1] += "<li class='pv-filterpanel-accordion-facet-list-item' id='pv-custom-range-" + PV.cleanName(facetName) + "__Finish' style='visibility:hidden;float:right'>"
        facetControls[1] += "<span class='pv-facet-customrange-label'>End:</span>"
        facetControls[1] += "<input itemvalue='CustomRangeFinish' itemfacet='" + PV.cleanName(facetName) + "' id='pv-custom-range-" + PV.cleanName(facetName) + "__FinishDate' class='pv-facet-customrange' type='text'/>"
        facetControls[1] += "</li>";
        facetControls[facetControls.length] = "</ul>";
        return facetControls.join('');
    };

    var _createDatetimeNoInfoFacet = function (facetName) {
        var values = _itemTotals[facetName];
        if (values == undefined) return "";
        var total = values["(no info)"];
        var facetControls = "<ul class='pv-filterpanel-accordion-facet-list'>";
        if(total != undefined) {
            facetControls += "<li class='pv-filterpanel-accordion-facet-list-item'  id='" + total.id + "'>";
            facetControls += "<input itemvalue='" + PV.cleanName(total.value) + "' itemfacet='" + PV.cleanName(facetName) + "' class='pv-facet-value' type='checkbox' />"
            facetControls += "<span class='pv-facet-value-label'>" + total.value + "</span>";
            facetControls += "<span class='pv-facet-value-count'>0</span>"
            facetControls += "</li>";
        }
        facetControls += "<li class='pv-filterpanel-accordion-facet-list-item'  style='border-bottom:thin solid #E2E2E2;'></li>";
        facetControls += "</ul>";
        return facetControls;
    };

    var _createStringFilters = function (facetName) {
        var facetControls = ["<ul class='pv-filterpanel-accordion-facet-list'>"];
        var values = _itemTotals[facetName];
        var i = 1;
        for (var value in values.values) {
            var total = values.values[value];
            facetControls[i] = "<li class='pv-filterpanel-accordion-facet-list-item'  id='" + total.id + "'>";
            facetControls[i] += "<input itemvalue='" + PV.cleanName(total.value) + "' itemfacet='" + PV.cleanName(facetName) + "' class='pv-facet-value' type='checkbox' />"
            facetControls[i] += "<span class='pv-facet-value-label'>" + total.value + "</span>";
            facetControls[i] += "<span class='pv-facet-value-count'>0</span>"
            facetControls[i++] += "</li>";
        }
        facetControls[facetControls.length] = "</ul>";
        return facetControls.join('');
    };

    var _refreshSliderWidget = function (category, values, histogramFn) {
        var name = PivotViewer.Utils.escapeMetaChars(PV.cleanName(category.name));
        var p = $("#pv-filterpanel-category-numberitem-" + name);
        var create = p.attr("created") == undefined;
        if (create) p.append("<span class='pv-facet-numericslider-range-val'>&nbsp;</span><br>");

        p.find("svg").remove();
        var histogram = histogramFn(values);
        var chart = "<svg class='pv-filterpanel-accordion-facet-chart' width='" + 165 + "' height='" + 80 + "'>";

        var columnWidth = (0.5 + (165 / histogram.histogram.length)) | 0;
        var maxCount = histogram.histogram.length > 1 ? Math.max.apply(null, histogram.histogram) : 1;
        //draw the bars
        for (var i = 0; i < histogram.histogram.length; i++) {
            var barHeight = (0.5 + (80 / maxCount * histogram.histogram[i]));
            var barX = (0.5 + (columnWidth * i)) | 0;
            chart += "<rect x='" + barX + "' y='" + (80 - barHeight) + "' width='" + columnWidth + "' height='" + barHeight + "'></rect>";
        }
        p.find("br").after(chart + "</svg>");

        if (create) {
            var label1 = category.getValueLabel(histogram.min), label2 = category.getValueLabel(histogram.max);
            p.append("<div id='pv-facet-numericslider-" + name + "' class='pv-facet-numericslider'></div><table width=100%><tr><td class='pv-facet-numericslider-range-min'>" + label1 + "</td><td align=right class='pv-facet-numericslider-range-max'>" + label2 + "</td></tr></table>");
            p.attr("created", 1);
        }
        var s = $("#pv-facet-numericslider-" + name);
        var range = histogram.max - histogram.min;
        if (create) { s.modSlider({ values: [histogram.min, histogram.max] }); }
        s.modSlider("option", "min", histogram.min);
        s.modSlider("option", "max", histogram.max);
        s.modSlider("option", "step", (range < 10 && !category.integer? range / histogram.histogram.length : 1));
        if (create) {
            s.modSlider("option", "range", true);
            s.modSlider("option", "start", function (event, ui) { this.startMin = ui.values[0]; this.startMax = ui.values[ui.values.length - 1];});
            s.modSlider("option", "slide", function (event, ui) {
                var label1 = category.getValueLabel(ui.values[0]), label2 = category.getValueLabel(ui.values[ui.values.length - 1]);
                $(this).parent().find('.pv-facet-numericslider-range-val').text(label1 + " - " + label2);
            });
            s.modSlider("option", "stop", function (event, ui) { PV._stopSlider($('#pv-facet-numericslider-' + name), category, event, ui); });
        }
    }

    var _refreshNumberWidget = function (category, values) {_refreshSliderWidget(category, values, PivotViewer.Utils.getHistogram);}
    var _refreshOrdinalWidget = function (category, values) {_refreshSliderWidget(category, values, PivotViewer.Utils.getOrdinalHistogram);}

    PV._stopSlider = function (s, category, event, ui) {
        var s = $('#pv-facet-numericslider-' + PV.cleanName(category.name));
        var min = s.modSlider('option', 'min'), max = s.modSlider('option', 'max');
        if (ui.values[0] > min || ui.values[ui.values.length - 1] < max) s.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
        else if (ui.values[0] == min && ui.values[ui.values.length - 1] == max) {
            s.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
            if (_numericFilters[category.name] == undefined) return;
        }
        PV.filterCollection({ category: category, enlarge: s[0].startMin > ui.values[0] || s[0].startMax < ui.values[ui.values.length - 1], min: ui.values[0], max: ui.values[ui.values.length - 1], rangeMin: min, rangeMax: max });
    }

    /// Set the current view
    PV.selectView = function (view) {
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

        //keep info panel selected
        //PV.deselectInfoPanel();
        $('#pv-viewpanel-view-' + _currentView + '-image').attr('src', _views[_currentView].getButtonImage());
        _views[_currentView].deactivate();

        $('#pv-viewpanel-view-' + number + '-image').attr('src', _views[number].getButtonImageSelected());
        _views[number].activate();

        _currentView = number;
    };

    PV.getCurrentView = function () { return _views[_currentView]; }


    PV.filterViews = function () {
      console.log(_stringFilters);
      console.log(_numericFilters);
      getRuleFilters();
      for (var i = 0; i < _views.length; i++) { _views[i].handleFilter(_tiles, _filterList, _sortCategory); }
      console.log(PivotCollection.items);
      console.log(_sortCategory);


    }


    //get C intervals
    var bucketRules = [];
    function getBucketFilters(){
      bucketRules = []
      var type;
      if(PivotCollection.getCategoryByName(_sortCategory).type == PivotViewer.Models.FacetType.String){
        type = "string";
      }else{
        type = "nonstring";
      }
      var buckets = _views[1].buckets;
      for(var i = 0; i < buckets.length; i++){
        if(type == "string"){
          var value = buckets[i].startRange;
          bucketRules.push({name:_sortCategory, type:type, value:[value]});
        }else{
          var value = [buckets[i].startRange, buckets[i].endRange];
          bucketRules.push({name:_sortCategory, type:type, value:value});
        }
      }
      console.log(bucketRules);
      if(bucketRules != undefined) getBucketsCount();
    }

    //get C
    function getBucketsCount(){
      Cs = [];
      for(var j = 0; j < bucketRules.length; j++){
        Cs[j] = [];
        for (var i = 0; i < PivotCollection.items.length; i++) {
          var facet = PivotCollection.items[i].getFacetByName(bucketRules[j].name);
          if(bucketRules[j].type == "string"){
            if(facet != undefined && bucketRules[j].value[0] == facet.values[0].value){
              Cs[j].push(PivotCollection.items[i]);
            }
          }else if(bucketRules[j].type = "nonstring"){
            if(facet != undefined && bucketRules[j].value[0] <= facet.values[0].value
             && bucketRules[j].value[1] >= facet.values[0].value){
               Cs[j].push(PivotCollection.items[i]);
             }
          }
        }
      }
      console.log(Cs);
      getAllTable();
    }

    //get ACs BCs ABCs
    function getAllTable(){
      console.log(A);
      console.log(B);
      //Count B filter
      for(var j = 0; j < Cs.length; j++){
        ACs[j] = [];
        BCs[j] = [];
        ABCs[j] = [];
        //AC
        for(var i = 0; i < A.length; i++){
          var facet = A[i].getFacetByName(bucketRules[j].name);
          if(facet == undefined){
            continue;
          }
          if(bucketRules[j].type == "string"){
            if(facet.values[0].value == bucketRules[j].value[0]){
              ACs[j].push(A[i]);
            }
          }else if(bucketRules[j].type = "nonstring"){
            if(bucketRules[j].value[0] <= facet.values[0].value
             && bucketRules[j].value[1] >= facet.values[0].value){
              ACs[j].push(A[i]);
            }
          }
        }

        //AB
        for(var i = 0; i < B.length; i++){
          var facet = B[i].getFacetByName(bucketRules[j].name);
          if(facet == undefined){
            continue;
          }
          if(bucketRules[j].type == "string"){
            if(facet.values[0].value == bucketRules[j].value[0]){
              BCs[j].push(B[i]);
            }
          }else if(bucketRules[j].type = "nonstring"){
            if(bucketRules[j].value[0] <= facet.values[0].value
             && bucketRules[j].value[1] >= facet.values[0].value){
              BCs[j].push(B[i]);
            }
          }
        }

        //ABCs
        for(var i = 0; i < AB.length; i++){
          var facet = AB[i].getFacetByName(bucketRules[j].name);
          if(facet == undefined){
            continue;
          }
          if(bucketRules[j].type == "string"){
            if(facet.values[0].value == bucketRules[j].value[0]){
              ABCs[j].push(AB[i]);
            }
          }else if(bucketRules[j].type = "nonstring"){
            if(bucketRules[j].value[0] <= facet.values[0].value
             && bucketRules[j].value[1] >= facet.values[0].value){
              ABCs[j].push(AB[i]);
            }
          }
        }

      }
      console.log(ACs);
      console.log(BCs);
      console.log(ABCs);
    }


    var A = [];
    var B = [];
    var AB = [];
    var Cs = [];
    var ACs = [];
    var BCs = [];
    var ABCs = [];

    //set up rule filters
    var ruleFilters = [];
    var ruleNums = 0;

    function getRuleFilters(){
      ruleFilters = [];
      ruleNums = 0;
      for (var i = 0; i < _stringFilters.length; i++) {
          ruleNums++;
          var name = _stringFilters[i].facet;
          var type = "string";
          var value = _stringFilters[i].value.join(', ');
          ruleFilters.push({name: name, type: type, value: [value]});
      }
      for (var i = 0; i < _numericFilters.length; i++) {
          ruleNums++;
          var name = _numericFilters[i].facet;
          var type = "nonstring"
          var selectedMax = _numericFilters[i].selectedMax;
          var selectedMin = _numericFilters[i].selectedMin;
          ruleFilters.push({name:name, type: type, value:[selectedMin, selectedMax]});
      }
      console.log(ruleFilters);
      ruleCount();
    }


    function ruleCount(){
      if(ruleNums == 0 || ruleNums > 2){
        return;
      }
      A = [];
      B = [];
      AB = [];

      //Count A filter
      for (var i = 0; i < PivotCollection.items.length; i++) {
        if(ruleFilters[0].type == "string"){
          var facet = PivotCollection.items[i].getFacetByName(ruleFilters[0].name);
          if(facet != undefined && ruleFilters[0].value[0] == facet.values[0].value){
            A.push(PivotCollection.items[i]);
          }
        }else if(ruleFilters[0].type = "nonstring"){
          var facet = PivotCollection.items[i].getFacetByName(ruleFilters[0].name);
          if(facet != undefined && ruleFilters[0].value[0] <= facet.values[0].value
           && ruleFilters[0].value[1] >= facet.values[0].value){
             A.push(PivotCollection.items[i]);
           }
        }
        if(ruleNums == 1){
          continue;
        }
        if(ruleFilters[1].type == "string"){
          var facet = PivotCollection.items[i].getFacetByName(ruleFilters[1].name);
          if(facet != undefined && ruleFilters[1].value[0] == facet.values[0].value){
            B.push(PivotCollection.items[i]);
          }
        }else if(ruleFilters[1].type = "nonstring"){
          var facet = PivotCollection.items[i].getFacetByName(ruleFilters[1].name);
          if(facet != undefined && ruleFilters[1].value[0] <= facet.values[0].value
           && ruleFilters[1].value[1] >= facet.values[0].value){
             B.push(PivotCollection.items[i]);
           }
        }
      }
      if(ruleNums == 1){
        getBucketFilters();
        return;
      }
      //Count B filter
      for(var i = 0; i < A.length; i++){
        var facet = A[i].getFacetByName(ruleFilters[1].name);
        if(facet == undefined){
          continue;
        }
        if(ruleFilters[1].type == "string"){
          if(facet.values[0].value == ruleFilters[1].value[0]){
            AB.push(A[i]);
          }
        }else if(ruleFilters[1].type = "nonstring"){
          if(ruleFilters[1].value[0] <= facet.values[0].value
           && ruleFilters[1].value[1] >= facet.values[0].value){
            AB.push(A[i]);
          }
        }
      }
      getBucketFilters();
    }


    //Sorts the facet values based on a specific sort type
    var _sortStringValues = function (facetName) {
        if (PivotCollection.getCategoryByName(facetName).type == PivotViewer.Models.FacetType.DateTime) return;
        //get facets
        var facetList = $("#pv-cat-" + PivotViewer.Utils.escapeMetaChars(PV.cleanName(facetName)) + " ul");
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
                var compA = parseInt($(a).children(".pv-facet-value-count").text());
                var compB = parseInt($(b).children(".pv-facet-value-count").text());
                return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
            });
        }
        else {
            var category = PivotCollection.getCategoryByName(facetName);
            if (category.customSort != undefined) {
                var sortList = [];
                for (var i = category.customSort.sortValues.length - 1; i >= 0; i--) {
                    for (var j = 0; j < items.length; j++) {
                        if (facet.customSort.sortValues[i] == $(items[j]).children(".pv-facet-value-label").text())
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
    PV.filterCollection = function (filterChange) {

        PV.deselectInfoPanel();
        _selectedItem = null;

        var filterList = [], longStringFiltered = null, stringFilters, datetimeFilters, numericFilters, selectedFilters;
        if (filterChange == undefined) {
            if (_longstringFilters != null) {
                var count = 0; longStringFiltered = [];
                for (var i = 0, _iLen = _tiles.length; i < _iLen; i++) {
                    var facet = _tiles[i].item.getFacetByName(_longstringFilters.facet);
                    if (facet != undefined && facet.values[0].value.toLowerCase().indexOf(_longstringFilters.value) >= 0) {
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

            var checked = $('.pv-facet-value:checked');
            filterList = []; stringFilters = []; datetimeFilters = []; numericFilters = [], selectedFilters = [];

            //Filter String facet items
            //create an array of selected facets and values to compare to all items.
            for (var i = 0; i < checked.length; i++) {
                var name = _nameMapping[$(checked[i]).attr('itemfacet')];
                var value = _nameMapping[$(checked[i]).attr('itemvalue')];
                var category = PivotCollection.getCategoryByName(name);

                if (!category.doFilter) continue;
                if (category.isString()) {
                    var stringFilter = stringFilters[name];
                    if (stringFilter != undefined) stringFilter.value[value + "a"] = true;
                    else {
                        stringFilter = { facet: name, value: [], index: i };
                        stringFilter.value[value + "a"] = true;
                        stringFilters.push(stringFilter);
                        stringFilters[name] = stringFilter;
                        selectedFilters[name] = true;
                    }
                }
                else if (category.isDateTime()) {
                    var start = $('#pv-custom-range-' + PV.cleanName(name) + '__StartDate')[0].value;
                    var end = $('#pv-custom-range-' + PV.cleanName(name) + '__FinishDate')[0].value;
                    var datetimeValue;
                    if (start && end) datetimeValue = { value: value, startDate: new Date(start), endDate: new Date(end) };
                    else {
                        start = $(checked[i]).attr('startdate');
                        end = $(checked[i]).attr('enddate');
                        datetimeValue = { value: value, startDate: new Date(start), endDate: new Date(end) };
                    }
                    var datetimeFilter = datetimeFilters[name];
                    if (datetimeFilter != undefined) datetimeFilter.value.push(datetimeValue);
                    else {
                        datetimeFilter = { facet: name, value: [datetimeValue]};
                        datetimeFilters.push(datetimeFilter);
                        datetimeFilters[name] = datetimeFilter;
                        selectedFilters[name] = true;
                    }
                }
            }
            //Numeric facet items. Find all numeric types that have been filtered
            for (var i = 0, _iLen = PivotCollection.categories.length; i < _iLen; i++) {
                var category = PivotCollection.categories[i];
                if (!category.doFilter) continue;
                var name = category.name;
                if (PivotCollection.categories[i].type == PivotViewer.Models.FacetType.Number ||
                    PivotCollection.categories[i].type == PivotViewer.Models.FacetType.Ordinal) {
                    var s = $('#pv-filterpanel-category-numberitem-' + PV.cleanName(name)).find('.pv-facet-numericslider');
                    if (s.length > 0) {
                        var values = s.modSlider("values");
                        var max = s.modSlider('option', 'max'), min = s.modSlider('option', 'min');
                        if (values[0] != min || values[values.length - 1] != max) {
                            numericFilters.push({ facet: name, selectedMin: values[0], selectedMax: values[values.length - 1], rangeMin: min, rangeMax: max});
                            numericFilters[name] = numericFilters[i];
                            selectedFilters[name] = true;
                        }
                    }
                }
            }
        }
        else {
            filterList = [];
            stringFilters = _stringFilters; datetimeFilters = _datetimeFilters;
            numericFilters = _numericFilters; selectedFilters = _selectedFilters;
            var category = filterChange.category;
            if (!category.doFilter) return;
            if (category.isNumber() || category.isOrdinal()) {
                numericFilter = numericFilters[category.name];
                if (numericFilter == undefined) {
                    numericFilter = {
                        facet: category.name, selectedMin: filterChange.min, selectedMax:
                            filterChange.max, rangeMin: filterChange.rangeMin, rangeMax: filterChange.rangeMax
                    };
                    numericFilters.push(numericFilter);
                    numericFilters[category.name] = numericFilter;
                }
                else {
                    numericFilter.selectedMin = filterChange.min;
                    numericFilter.selectedMax = filterChange.max;
                }
                selectedFilters[category.name] = true;
            }
            else if ((!filterChange.enlarge && selectedFilters[category.name] != undefined) || filterChange.clear) {
                if (category.isString()) {
                    var stringFilter = stringFilters[category.name];
                    delete stringFilter.value[filterChange.value + "a"];
                    stringFilter.value.splice(stringFilter.value.indexOf(filterChange.value), 1);
                    if (Object.keys(stringFilter.value).length == 0) {
                        delete stringFilters[category.name];
                        stringFilters.splice(stringFilter.index, 1);
                        delete selectedFilters[category.name];
                    }
                }
                else {
                    datetimeFilter = datetimeFilters[category.name];
                    for (var v = 0; v < datetimeFilter.value.length; v++) {
                        if (datetimeFilter.value[v].value == filterChange.value) {
                            datetimeFilter.value.splice(v, 1);
                            if (datetimeFilter.value.length == 0) {
                                delete datetimeFilters[category.name];
                                datetimeFilters.splice(datetimeFilter.index, 1);
                                delete selectedFilters[category.name];
                            }
                            break;
                        }
                    }
                }
            }
            else {
                if (category.isString()) {
                    var stringFilter = stringFilters[category.name];
                    if (stringFilter != undefined) {
                        stringFilter.value[filterChange.value + "a"] = true;
                        stringFilter.value.push(filterChange.value);
                    }
                    else {
                        stringFilter = { facet: category.name, value: [filterChange.value], index: i };
                        stringFilter.value[filterChange.value + "a"] = true;
                        stringFilters.push(stringFilter);
                        stringFilters[category.name] = stringFilter;
                    }
                }
                else {
                    var datetimeValue = { value: filterChange.value, startDate: filterChange.min, endDate: filterChange.max };
                    var datetimeFilter = datetimeFilters[category.name];
                    if (datetimeFilter != undefined) datetimeFilter.value.push(datetimeValue);
                    else {
                        datetimeFilter = { facet: category.name, value: [datetimeValue] };
                        datetimeFilters.push(datetimeFilter);
                        datetimeFilters[category.name] = datetimeFilter;
                    }
                }
                selectedFilters[category.name] = true;
            }
        }

        //Find matching facet values in items
        for (var i = 0, _iLen = _tiles.length; i < _iLen; i++) {
            var tile = _tiles[i];
            if (filterChange != undefined && (!filterChange.enlarge || tile.filtered)) {
                if (!filterChange.enlarge && !tile.filtered) continue;
                else if (filterChange.enlarge) { filterList.push(tile); continue; }
                if (filterChange.category.isString()) {
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
                else if (filterChange.category.isNumber() || filterChange.category.isOrdinal()) {
                    var facet = tile.item.getFacetByName(filterChange.category.name);
                    if (facet == undefined) { tile.filtered = false; continue; }
                    else {
                        var m, _mLen;
                        for (var m = 0, _mLen = facet.values.length; m < _mLen; m++) {
                            var parsed = parseFloat(facet.values[m].value);
                            facet = numericFilters[category.name];
                            if (!isNaN(parsed) && parsed >= facet.selectedMin && parsed <= facet.selectedMax)
                                break; // found
                        }
                        if (m == _mLen) { tile.filtered = false; continue; }
                    }
                }
                else {
                    var facet = tile.item.getFacetByName(filterChange.category.name);
                    var filter = datetimeFilters[filterChange.category.name];
                    if (facet == undefined) {
                        if ((filterChange.value == "(no info)") == filterChange.clear) { tile.filtered = false; continue; }
                    }
                    else {
                        var m, _mLen;
                        for (var m = 0, _mLen = facet.values.length; m < _mLen; m++) {
                            var itemDate = new Date(facet.values[m].value)
                            for (var n = 0, _nLen = filter.value.length; n < _nLen; n++) {
                                var value = filter.value[n];
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
            else if (_longstringFilters != null) {  //expand = true
                var facet = _tiles[i].item.getFacetByName(_longstringFilters.facet);
                if (facet == undefined || facet.values[0].value.toLowerCase().indexOf(_longstringFilters.value) < 0) {
                    tile.filtered = false;
                    continue;
                }
            }

            for (var k = 0, _kLen = stringFilters.length; k < _kLen; k++) {
                var facet = tile.item.getFacetByName(stringFilters[k].facet);
                if (facet == undefined) {
                    if (!stringFilters[k].value["(no info)a"]) break;
                    else continue;
                }

                var m, _mLen;
                for (var m = 0, _mLen = facet.values.length; m < _mLen; m++) {
                    if (stringFilters[k].value[facet.values[m].value + "a"]) break;
                }
                if (m == _mLen) break; //not found
            }
            if (k < _kLen) {
                tile.filtered = false;
                continue; //not found
            }

            for (var k = 0, _kLen = numericFilters.length; k < _kLen; k++) {
                var facet = tile.item.getFacetByName(numericFilters[k].facet);
                if (facet == undefined) {
                    if (numericFilters[k].selectedMin == "(no info)") continue; //found
                    else break; //not found
                }

                var m, _mLen;
                for (var m = 0, _mLen = facet.values.length; m < _mLen; m++) {
                    var parsed = parseFloat(facet.values[m].value);
                    if (!isNaN(parsed) && parsed >= numericFilters[k].selectedMin && parsed <= numericFilters[k].selectedMax)
                        break; // found
                }
                if (m == _mLen) break; //not found
            }
            if (k < _kLen) {
                tile.filtered = false;
                continue; //not found
            }

            for (var k = 0, _kLen = datetimeFilters.length; k < _kLen; k++) {
                var facet = tile.item.getFacetByName(datetimeFilters[k].facet);
                if (facet == undefined) {
                    var n, _nLen;
                    for (var n = 0, _nLen = datetimeFilters[k].value.length; n < _nLen; n++) {
                        if (datetimeFilters[k].value[n].value == "(no info)") break; //found
                    }
                    if (n == _nLen) break; //not found
                    else continue;
                }

                var m, _mLen;
                for (var m = 0, _mLen = facet.values.length; m < _mLen; m++) {
                    var itemDate = new Date(facet.values[m].value);
                    for (var n = 0, _nLen = datetimeFilters[k].value.length; n < _nLen; n++) {
                        var value = datetimeFilters[k].value[n];
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
	    _numericFilters = numericFilters;
	    _stringFilters = stringFilters;
	    _datetimeFilters = datetimeFilters;
	    _selectedFilters = selectedFilters

	    if (_longstringFilters !=null || _numericFilters.length != 0 || _stringFilters.length != 0 || _datetimeFilters.length != 0) $('.pv-filterpanel-clearall').css('visibility', 'visible');
	    else $('.pv-filterpanel-clearall').css('visibility', 'hidden');

	    for (var i = 0; i < PivotCollection.categories.length; i++)
	        PivotCollection.categories[i].recount = true;

        //Filter the facet counts and remove empty facets
	    _filterCategory($(".pv-facet").eq($(".pv-filterpanel-accordion").accordion("option", "active")));

	    $("#pv-toolbarpanel-countbox").html(_filterList.length);

        //Update breadcrumb
	    var bc = $('.pv-toolbarpanel-breadcrumb');
	    bc.empty();

	    if (stringFilters.length > 0 || numericFilters.length > 0 || datetimeFilters.length > 0) {
	        var bcItems = "|";
	        for (var i = 0; i < stringFilters.length; i++) {
	            bcItems += "<span class='pv-toolbarpanel-breadcrumb-facet'>" + stringFilters[i].facet + ":</span><span class='pv-toolbarpanel-breadcrumb-values'>"
	            bcItems += stringFilters[i].value.join(', ');
	            bcItems += "</span><span class='pv-toolbarpanel-breadcrumb-separator'>&gt;</span>";
	        }

	        for (var i = 0; i < numericFilters.length; i++) {
	            bcItems += "<span class='pv-toolbarpanel-breadcrumb-facet'>" + numericFilters[i].facet + ":</span><span class='pv-toolbarpanel-breadcrumb-values'>"
	            if (numericFilters[i].selectedMin == numericFilters[i].rangeMin)
	                bcItems += "Under " + numericFilters[i].selectedMax;
	            else if (numericFilters[i].selectedMax == numericFilters[i].rangeMax)
	                bcItems += "Over " + numericFilters[i].selectedMin;
	            else if (numericFilters[i].selectedMin == numericFilters[i].selectedMax) bcItems += numericFilters[i].selectedMin;
	            else bcItems += numericFilters[i].selectedMin + " - " + numericFilters[i].selectedMax;
	            bcItems += "</span><span class='pv-toolbarpanel-breadcrumb-separator'>&gt;</span>";
	        }

	        for (var i = 0; i < datetimeFilters.length; i++) {
	            for (var j = 0; j < datetimeFilters[i].value.length; j++) {
	                bcItems += "<span class='pv-toolbarpanel-breadcrumb-facet'>" + datetimeFilters[i].facet + ":</span><span class='pv-toolbarpanel-breadcrumb-values'>"
	                if (datetimeFilters[i].value[j].startDate != undefined && datetimeFilters[i].value[j].endDate != undefined) {
	                    var minDate = new Date(datetimeFilters[i].value[j].startDate), maxDate = new Date(datetimeFilters[i].value[j].endDate);
	                    var labelF = PivotViewer.Utils.getTimeLabelFn(minDate, maxDate);
	                    bcItems += labelF({ value: minDate }) + " - " + labelF({ value: maxDate });
	                }
	                else bcItems += datetimeFilters[i].value[j].value;
	                bcItems += "</span><span class='pv-toolbarpanel-breadcrumb-separator'>&gt;</span>";
	            }
	        }
	        bc.append(bcItems);

	        //Filter view
	        TileController.setCircularEasingBoth();
	    }

	    PV.filterViews();
    };

    PV.initUICategory = function (category) {
        Loader.loadColumn(category);
        LoadSem.acquire(function (release) {
            var uiFacet = $("#pv-cat-" + PV.cleanName(category.name));
            if (category.isDateTime()) {
                _createDatetimeBuckets(category);
                uiFacet.append(_bucketizeDateTimeFacet(category.name, category.datetimeBuckets[0], category.datetimeBuckets[1]));
                uiFacet.append(_createDatetimeNoInfoFacet(category.name));
                uiFacet.append(_createCustomRange(category.name));
                $("#pv-cat-" + PV.cleanName(category.name) + " .pv-facet-customrange").on("change", function (e) { _changeCustomRange(this); });
                $("#pv-cat-" + PV.cleanName(category.name) + " .pv-facet-value").on("click.pv", function (e) { PV.clickValue(this); });
                $("#pv-cat-" + PV.cleanName(category.name) + " .pv-facet-value-label").on("click.pv", function (e) {
                    var cb = $(this).prev();
                    cb.prop("checked", !cb.prop("checked"));
                    PV.clickValue(cb[0]);
                });
            }
            else if (category.isString()) {
                for (var i = 0; i < PivotCollection.items.length; i++) {
                    var item = PivotCollection.items[i];
                    var facet = item.getFacetByName(category.name);
                    if (facet != undefined) {
                        for (var k = 0; k < facet.values.length; k++) {
                            var value = facet.values[k].value;
                            var id = "pv-facet-value-" + PV.cleanName(facet.name) + "__" + PV.cleanName(facet.values[k].value);
                            var values = _itemTotals[facet.name];
                            if (values == undefined) values = _itemTotals[facet.name] = { values: [], facet: facet.name, filtered: true };
                            var total = values.values[value];
                            if (total == undefined)
                                values.values[value] = ({ id: id, value: value, count: 1 });
                            else total.count++;
                        }
                    }
                    else {
                        var id = "pv-facet-value-" + PV.cleanName(category.name) + "__" + PV.cleanName("(no info)");
                        var values = _itemTotals[category.name];
                        if (values == undefined) values = _itemTotals[category.name] = { values: [], facet: category.name, filtered: true };
                        var total = values.values["(no info)"];
                        if (total == undefined) values.values["(no info)"] = ({ id: id, value: "(no info)", count: 1 });
                        else total.count++;
                    }
                }
                uiFacet.append("<input class='pv-value-search' id='pv-value-search-" + PV.cleanName(category.name) + "' type='text' placeholder='Search values...' size=15><div class='pv-search-clear' id='pv-value-search-clear-" + PV.cleanName(category.name) + "'>&nbsp;</div><br>");
                if (category.customSort != undefined || category.customSort != null)
                    uiFacet.append("<span class='pv-filterpanel-accordion-facet-sort' customSort='" + category.customSort.name + "'>Sort: " + category.customSort.name + "</span>");
                else uiFacet.append("<span class='pv-filterpanel-accordion-facet-sort'>Sort: A-Z</span>");
                uiFacet.append(_createStringFilters(category.name));

                var item = _itemTotals[category.name];
                for (value in item.values) {
                    total = item.values[value];
                    total.valueItem = $("#" + total.id);
                    total.itemCount = total.valueItem.find('span').last();
                }
                $("#pv-value-search-" + PV.cleanName(category.name)).on('keyup', function (e) {
                    var clean = PV.cleanName(category.name), input = PV.cleanName(this.value.toLowerCase());
                    if (input != "") {
                        var search = [];
                        search = $('.pv-filterpanel-accordion-facet-list-item[id^="pv-facet-value-' + clean + '"]');
                        search.hide();
                        search.filter(function () {
                            return PV.cleanName($(this).children().eq(0).attr('itemvalue').toLowerCase()).indexOf(input) >= 0 && $(this).children().eq(2).html() > 0;
                        }).show();
                        $("#pv-value-search-clear-" + clean).css("visibility", "visible");
                    }
                    else {
                        $('.pv-filterpanel-accordion-facet-list-item[id^="pv-facet-value-' + clean + '"]').show();
                        $("#pv-value-search-clear-" + clean).css("visibility", "hidden");
                    }
                });

                $("#pv-value-search-clear-" + PV.cleanName(category.name)).click(function (e) {
                    var clean =  PV.cleanName(category.name);
                    $("#pv-value-search-" + clean).val("");
                    $("#pv-value-search-clear-" + clean).css("visibility", "hidden");
                    $('.pv-filterpanel-accordion-facet-list-item[id^="pv-facet-value-' + clean + '"]').show();
                });


                $("#pv-cat-" + PV.cleanName(category.name) + " .pv-facet-value").click(function (e) { PV.clickValue(this); });
                $("#pv-cat-" + PV.cleanName(category.name) + " .pv-facet-value-label").click(function (e) {
                    var cb = $(this).prev();
                    cb.prop("checked", !cb.prop("checked"));
                    PV.clickValue(cb[0]);
                });
                $("#pv-cat-" + PV.cleanName(category.name) + " .pv-filterpanel-accordion-facet-sort").click(function (e) {
                    var sortDiv = $(this), sortText = sortDiv.text(), facetName = sortDiv.parent().prev().children('a').text();
                    var customSort = sortDiv.attr("customSort");
                    if (sortText == "Sort: A-Z") $(this).text("Sort: Quantity");
                    else if (sortText == "Sort: Quantity" && customSort == undefined) $(this).text("Sort: A-Z");
                    else if (sortText == "Sort: Quantity") $(this).text("Sort: " + customSort);
                    else $(this).text("Sort: A-Z");
                    _sortStringValues(facetName);
                });
            }
            else if (category.isNumber()) {
                for (var i = 0; i < PivotCollection.items.length; i++) {
                    var item = PivotCollection.items[i];
                    var facet = item.getFacetByName(category.name);
                    if (facet != undefined) {
                        for (var k = 0; k < facet.values.length; k++) {
                            var value = facet.values[k].value, total = _numericItemTotals[facet.name];
                            if (total != undefined) total.values.push(value);
                            else _numericItemTotals[facet.name] = { facet: facet.name, values: [value], filtered: true };
                        }
                    }
                    else {
                        var id = "pv-facet-value-" + PV.cleanName(category.name) + "__" + PV.cleanName("(no info)");
                        var values = _itemTotals[category.name];
                        if (values == undefined) values = _itemTotals[category.name] = { values: [], facet: category.name, filtered: true };
                        var total = values.values["(no info)"];
                        if (total == undefined) values.values["(no info)"] = ({ id: id, value: "(no info)", count: 1 });
                        else total.count++;
                    }
                }
                uiFacet.append("<div id='pv-filterpanel-category-numberitem-" + PV.cleanName(category.name) + "'></div>");
            }
            else if (category.isOrdinal()) {
              for (var i = 0; i < PivotCollection.items.length; i++) {
                    var item = PivotCollection.items[i];
                    var facet = item.getFacetByName(category.name);
                    if (facet != undefined) {
                        for (var k = 0; k < facet.values.length; k++) {
                            var value = facet.values[k].value, total = _ordinalItemTotals[facet.name];
                            if (total != undefined) total.values.push(value);
                            else _ordinalItemTotals[facet.name] = { facet: facet.name, values: [value], filtered: true };
                        }
                    }
                    else {
                        var id = "pv-facet-value-" + PV.cleanName(category.name) + "__" + PV.cleanName("(no info)");
                        var values = _itemTotals[category.name];
                        if (values == undefined) values = _itemTotals[category.name] = { values: [], facet: category.name, filtered: true };
                        var total = values.values["(no info)"];
                        if (total == undefined) values.values["(no info)"] = ({ id: id, value: "(no info)", count: 1 });
                        else total.count++;
                    }
                }
                uiFacet.append("<div id='pv-filterpanel-category-numberitem-" + PV.cleanName(category.name) + "'></div>");
            }

            category.uiInit = true;
            release();
        });
    }

    // Filters the facet panel items and updates the counts
    var _filterCategory = function (name) {
        var category = PivotCollection.getCategoryByName(_nameMapping[name.attr("facet")]);
        if (!category.isFilterVisible || !category.recount) return;

        if (!category.uiInit) PV.initUICategory(category);

        LoadSem.acquire(function (release) {
            var checkList = [];
            if (_filterList.length * 2 < _tiles.length) checkList = _filterList;
            else {
                for (var i = 0; i < _tiles.length; i++) {
                    if (!_tiles[i].filtered) checkList.push(_tiles[i]);
                }
            }

            if (category.isString()) {
                var filterList = [];
                var emptyItem = PivotViewer.Utils.escapeMetaChars('pv-facet-value-' + PV.cleanName(category.name) + '__' + PV.cleanName("(no info)"));
                for (var j = 0; j < checkList.length; j++) {
                    var facet = checkList[j].item.getFacetByName(category.name);
                    if (facet == undefined) {
                        var filteredItem = filterList[emptyItem];
                        if (filteredItem != undefined) filteredItem.count++;
                        else filterList[emptyItem] = { count: 1 };
                        continue;
                    }
                    for (var k = 0; k < facet.values.length ; k++) {
                        var item = PivotViewer.Utils.escapeMetaChars('pv-facet-value-' + PV.cleanName(category.name) + '__' + PV.cleanName(facet.values[k].value));
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
                            if (!_selectedFilters[category.name]) item.valueItem.hide();
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
                            if (!_selectedFilters[category.name]) item.valueItem.hide();
                        }
                        else {
                            item.valueItem.show();
                            item.itemCount.text(count);
                        }
                    }
                }
                _sortStringValues(category.name);
            }
            else if (category.isDateTime()) {
                var filterList = [];
                var emptyItem = PivotViewer.Utils.escapeMetaChars('#pv-facet-value-' + PV.cleanName(category.name) + '__' + PV.cleanName("(no info)"));
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
                                var item = PivotViewer.Utils.escapeMetaChars("#pv-facet-value-" + PV.cleanName(category.name) + "__" + PV.cleanName(group[k].name.toString()));
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
                            item = PivotViewer.Utils.escapeMetaChars("#pv-facet-value-" + PV.cleanName(category.name) + "__" + PV.cleanName(group[k].name.toString()));
                            if (filterList[item] == undefined) {
                                if (!_selectedFilters[category.name]) $(item).hide();
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
                            item = PivotViewer.Utils.escapeMetaChars("#pv-facet-value-" + PV.cleanName(category.name) + "__" + PV.cleanName(group[k].name.toString()));
                            var count;
                            if (filterList[item] == undefined) count = group[k].items.length;
                            else count = group[k].items.length - filterList[item].count;
                            if (count == 0) {
                                if (!_selectedFilters[category.name]) $(item).hide();
                            }
                            else {
                                $(item).show();
                                $(item).find('span').last().text(count);
                            }
                        }
                    }
                }
            }
            else if (category.isNumber()) {
                if (!_selectedFilters[category.name]) {
                    if (_filterList.length == _tiles.length)
                        _refreshNumberWidget(category, _numericItemTotals[category.name].values);
                    else {
                        var values = [];
                        for (var i = 0; i < _filterList.length; i++) {
                            var facet = _filterList[i].item.getFacetByName(category.name);
                            if (facet == undefined) continue;
                            for (var v = 0; v < facet.values.length; v++) {
                                values.push(facet.values[v].value);
                            }
                        }
                        _refreshNumberWidget(category, values);
                    }
                }
            }
            else if (category.isOrdinal()) {
                if (!_selectedFilters[category.name]) {
                    if (_filterList.length == _tiles.length)
                        _refreshOrdinalWidget(category, _ordinalItemTotals[category.name].values);
                    else {
                        var values = [];
                        for (var i = 0; i < _filterList.length; i++) {
                            var facet = _filterList[i].item.getFacetByName(category.name);
                            if (facet == undefined) continue;
                            for (var v = 0; v < facet.values.length; v++) {
                                values.push(facet.values[v].value);
                            }
                        }
                        _refreshOrdinalWidget(category, values);
                    }
                }
            }

            if (Settings.showMissing) $('#pv-facet-value-' + PV.cleanName(category.name) + '__' + PV.cleanName("(no info)")).show();
            else $('#pv-facet-value-' + PV.cleanName(category.name) + '__' + PV.cleanName("(no info)")).hide();

            category.recount = false;
            release();
        });
    };

    PV.deselectInfoPanel = function () {
        //de-select details
        $('.pv-infopanel').fadeOut();
        $('.pv-infopanel-heading').empty();
        $('.pv-infopanel-details').empty();
    };

    PV.cleanName = function (uncleanName) {
        var name = uncleanName.replace(/[^\w]/gi, '_');
        _nameMapping[name] = uncleanName;
        return name;
    }

    PV.uncleanName = function (uncleanName) { return _nameMapping[uncleanName]; }

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
        toolbarPanel += "<div class='pv-toolbarpanel-breadcrumb'></div>";
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
            stop: function (event, ui) {PV.zoom(ui.value);}
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
        if (!selCategory.uiInit) PV.initUICategory(selCategory);
        PV.selectView(0);

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
                if (category.isLongString()) {
                    longSearchSelect.append("<option value='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
                    _longStringCategories.push(category);
                }
                else {
                    category.recount = true;
                    facetSelect.eq(category.visIndex).show();
                    facetSelect.eq(category.visIndex).attr("visible", "visible");
                    sortSelect.append("<option value='" + i + "' search='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
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
            _filterCategory(facetSelect.eq(selCategory.visIndex));
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
                if (category.isLongString()) {
                    longSearch.push("<option value='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
                    _longStringCategories.push(category);
                }
                else {
                    activeNumber++;
                    facets.push("<h3 class='pv-facet' style='display:inherit' facet='" + PV.cleanName(category.name.toLowerCase()) + "'><a href='#' title='" + category.name + "'>" + category.name + "</a><div class='pv-filterpanel-accordion-heading-clear' facetType='" + category.type + "'>&nbsp;</div></h3><div style='display:'inherit' style='height:30%' id='pv-cat-" + PV.cleanName(category.name) + "'></div>");
                    sort.push("<option value='" + i + "' search='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
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
                            _longstringFilters = { facet: _nameMapping[$("#pv-long-search-cat").val()], value: $("#pv-long-search").val().toLowerCase() };
                        else _longstringFilters = null;
                        PV.filterCollection();
                        release();
                    });
                }
                else $("#pv-long-search").css("text-decoration", "").css("color", "black");
                $("#pv-long-search-clear").css("visibility", "visible");
            });
            $("#pv-long-search-clear").click(function (e) {
                $("#pv-long-search").val("");
                $("#pv-long-search-clear").css("visibility", "hidden");
                if (_longstringFilters != null) {
                    _longstringFilters = null;
                    PV.filterCollection();
                }
            });
            $("#pv-long-search-cat").on("mousedown", function (e) {
                if ($(this).attr("dirty") == 1) {
                    $("#pv-long-search-cat option").remove();
                    var search = $('.pv-filterpanel-search').val();
                    for (var i = 0; i < _longStringCategories.length; i++) {
                        var category = _longStringCategories[i], clean = PV.cleanName(category.name.toLowerCase());
                        if (search != "" && clean.indexOf(search) < 0) continue;
                        $("#pv-long-search-cat").append("<option value='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
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
            PivotViewer.Utils.loadScript("src/views/" + viewName.toLowerCase() + "view.min.js");
            eval("var view = new PivotViewer.Views." + viewName.charAt(0).toUpperCase() + viewName.substring(1) + "View()");
            view.setOptions(_options);
            _views.push(view);

        }

        viewPanel.append("<div class='pv-viewpanel-view'></div>");
        for (var i = 0; i < _views.length; i++) {
            if (_views[i] instanceof PivotViewer.Views.IPivotViewerView) {
                _views[i].setup(width, height, offsetX, offsetY, TileController.getMaxTileRatio());
                $('.pv-toolbarpanel-viewcontrols').append("<div class='pv-toolbarpanel-view' id='pv-toolbarpanel-view-" + i + "' title='" + _views[i].getViewName() + "'><img id='pv-viewpanel-view-" + i + "-image' src='" + _views[i].getButtonImage() + "' alt='" + _views[i].getViewName() + "' /></div>");
            }
        }

        //add model view
        $('.pv-toolbarpanel-viewcontrols').append("<div class='pv-toolbarpanel-view'id='pv-toolbarpanel-view-10' title='Statistical Model'><a href='#pv-open-Model'> <img id='pv-toolbarpanel-view-10-image' src='images/modelView.png'></a></div>");
        $('.pv-toolbarpanel-viewcontrols').append(
        '<div class="modal fade" id="myModal" role="dialog" style="z-index:100000;"><div class="modal-dialog"><div class="modal-content"><div class="modal-header">'+
        '<h4 class="modal-title">R result</h4></div>'+
        '<div class="modal-body" ><code><pre id="pv-model-result" style="position: relative; \
        "></pre></code></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>');
        //loading completed
        $('.pv-toolbarpanel-viewcontrols').append("<div id='pv-open-Model' class='pv-modal-dialog modal-xl'><div><h2>Statistical Model</h2><div id='pv-model-text'>&nbsp;</div></div></div>");

        $('.pv-loading').remove();

        //Set the width for displaying breadcrumbs as we now know the control sizes
        var controlsWidth = $('.pv-toolbarpanel').innerWidth() - ($('.pv-toolbarpanel-brandimage').outerWidth(true) + 25 + $('.pv-toolbarpanel-name').outerWidth(true) + 30 + $('.pv-toolbarpanel-zoomcontrols').outerWidth(true) + _views.length * 29 + 2 * $('.pv-toolbarpanel-sortcontrols').outerWidth(true));
        $('.pv-toolbarpanel-breadcrumb').css('width', controlsWidth + 'px');

        var filterPanel = $('.pv-filterpanel');
        filterPanel.append("<div class='pv-filterpanel-version'><a href='#pv-open-version'>About</a>&nbsp;<a href='#pv-open-Settings'>Settings</a></div>");
        filterPanel.append("<div id='pv-open-version' class='pv-modal-dialog'><div><a href='#pv-modal-dialog-close' title='Close' class='pv-modal-dialog-close'>X</a><h2>SuAVE: <u>Su</u>rvey <u>A</u>nalysis <u>V</u>isualization and <u>E</u>xploration</h2><p>This app was designed and developed at the <a href='www.sdsc.edu'>San Diego Supercomputer Center</a> for the purpose of enabling innovative visualization of common analytical and statistical techniques with the particular application to education.<p>Project Leads:<br>Ilya Zaslavsky, SDSC (<a href='mailto:zaslavsk@sdsc.edu'>zaslavsk@sdsc.edu</a>)<br>Prof. Akos Rona-Tas, UCSD Sociology (<a href='mailto:aronatas@ucsd.edu'>aronatas@ucsd.edu</a>)<br>Prof. Kevin Lewis, UCSD Sociology (<a href='mailto:lewis@ucsd.edu'>lewis@ucsd.edu</a>)<p>Lead Programmer:<br>Ren&eacute; Patnode, UCSD Sociology (<a href='mailto:rpatnode@ucsd.edu'>rpatnode@ucsd.edu</a>)<p>Funded by <a href='http://www.nsf.gov/awardsearch/showAward?AWD_ID=1443082'>NSF Grant ACI-1443082</a>.</div></div>");
        filterPanel.append("<div id='pv-open-Settings' class='pv-modal-dialog modal-xl'><div><h2>Settings</h2><div id='pv-options-text'>&nbsp;</div></div></div>");
        var html = "<input type='checkbox' id='show-missing'" + (Settings.showMissing ? " checked" : "") + "> Display missing values<p><h3>Visible Variables (Double-click to select)</h3><p>";
        html += "<table><tr><th>All Variables:</th><th>Variables to Display:</th><tr><td><select id='pv-all-columns' multiple style='width:250px' size=20>";
        for (var i = 0; i < PivotCollection.categories.length; i++) {
            var category = PivotCollection.categories[i];
            html += "<option value=" + i + " search='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>";
        }
        html += "</select></td><td><select id='pv-column-select' multiple style='width:250px' size=20>";
        if (Settings.visibleCategories.length == 0) html += "<option value='-1'>Select Variables...</option>";
        else {
            for (var i = 0; i < Settings.visibleCategories.length; i++) {
                var category = PivotCollection.categories[Settings.visibleCategories[i]];
                html += "<option value=" + Settings.visibleCategories[i] + " search='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>";
            }
        }
        html += "</select></td><td width=200><input id='pv-column-search' placeholder='Search For Variable...' type='text' size=20><div " +
            "class='pv-search-clear' id='pv-column-search-clear'>&nbsp;</div><p><button id='pv-column-select-all'>Select All</button><p><button " +
            "id='pv-column-deselect-all'>Deselect All</button><p><button id='pv-settings-submit'>Submit</button><p><button " +
            "id='pv-Settings-cancel'>Cancel</button></td></table>";
        $("#pv-options-text").html(html);

        //inflate model select view
        var modelHtml = "<p><h3>Press ctrl(Windows)/command(Mac) to select independent variables</h3><p>";
        modelHtml += "<table><tr><th>Dependent Variable:</th><th>Independent Variables:</th><tr><td><select id='pv-all-variables1' style='width:250px' size=20>";
        for (var i = 0; i < PivotCollection.categories.length; i++) {
            var category = PivotCollection.categories[i];
            modelHtml += "<option value=" + i + " search='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>";
        }
        modelHtml += "</select></td><td><select id='pv-all-variables2' multiple style='width:250px' size=20>";
        for (var i = 0; i < PivotCollection.categories.length; i++) {
            var category = PivotCollection.categories[i];
            modelHtml += "<option value=" + i + " search='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>";
        }

        modelHtml += "</select></td><td width=200><p><select id='pv-select-model'><option>Select Model</option><option>Logit</option><option>Probit</option><option>Log Linear</option></select><p>"+
            "<input id='pv-variables-search' placeholder='Search For Variable...' type='text' size=20><div " +
            "class='pv-search-clear' id='pv-variables-search-clear'>&nbsp;</div><p><button id='pv-model-submit'>Submit</button></p><p><button " +
            "id='pv-model-cancel'>Cancel</button></td></table>";
        $("#pv-model-text").html(modelHtml);


        $("#pv-all-columns").dblclick(function (e) {
            if ($("#pv-all-columns option[value='-1']").length > 0) return;
            var value = parseFloat($("#pv-all-columns").val()), category = PivotCollection.categories[value];
            if ($("#pv-column-select option[value='-1']").length > 0) { $("#pv-column-select option[value='-1']").remove();}
            var selectList = $("#pv-column-select option");
            for (var i = 0; i < selectList.length; i++) {
                if (parseFloat(selectList[i].value) == value) break;
                else if (parseFloat(selectList[i].value) > value) {
                    $(selectList[i]).before($("<option></option>").attr("search", PV.cleanName(category.name.toLowerCase())).val(value).html(category.name));
                    break;
                }
            }
            if (i == selectList.length) $("#pv-column-select").append("<option value=" + value + " search='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
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
                    $("#pv-column-select").append($("<option></option>").attr("search", PV.cleanName(category.name.toLowerCase())).val(value).html(category.name));
                    i++;
                }
                else if (value == parseFloat(selectList2[j].value)) { i++; j++; }
                else if (parseFloat(selectList2[j].value) > value) {
                    $(selectList2[j]).before($("<option></option>").attr("search", PV.cleanName(category.name.toLowerCase())).val(value).html(category.name));
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

            _sortCategory = $('#pv-primsort option').eq(0).html();
            var category = PivotCollection.getCategoryByName(_sortCategory);
            if (!category.uiInit) PV.initUICategory(category);

            LoadSem.acquire(function (release) {
                _tiles.sort(tileSortBy(_sortCategory, false, _stringFilters));
                _filterList = [];
                for (var i = 0; i < _tiles.length; i++) {
                    var tile = _tiles[i];
                    tile.missing = !Settings.showMissing && tile.item.getFacetByName(category.name) == undefined;
                    if (tile.filtered) _filterList.push(_tiles[i]);
                }
                PV.filterViews();
                release();
            });

        });

        $("#pv-Settings-cancel").click(function (e) {
            window.open("#pv-modal-dialog-close", "_self");
            $("#show-missing").prop("checked", Settings.showMissing);
            if ($("#pv-all-columns option").eq(0).val() == -1) $("#pv-all-columns option").remove();
            _initAllSelect("#pv-all-columns");
            if ($("#pv-column-select option").eq(0).val() == -1) $("#pv-column-select option").remove();
            _initVisibleSelect("#pv-column-select", true);
            $("#pv-column-search").val("");
            $('#pv-column-search-clear').css("visibility", "hidden");
        });

        $("#pv-model-submit").click(function (e) {
          $("#myModal").modal('toggle');
          var iv = $('#pv-all-variables2').val();
          var dv = $('#pv-all-variables1').val();
          if(iv == undefined || dv == undefined){
            alert("Please select at least one dependent variable, and one independent variable");
          }
          var formulaStr = "V"+dv+"~"
          var length = iv.length;
          for(var i = 0; i < length; i++){
              if(i != 0){
                formulaStr = formulaStr + "+";
              }
              formulaStr = formulaStr + "V" + iv[i];
          }
          var model = $('#pv-select-model').val();
          if(model == "Select Model"){
            alert("Please select a statistical model");
          }
          getModel(model, formulaStr);
        });

        $("#pv-model-cancel").click(function (e) {
            window.open("#pv-modal-dialog-close", "_self");
            //$("#show-missing").prop("checked", settings.showMissing);
            if ($("#pv-all-variables1 option").eq(0).val() == -1) $("#pv-all-variables1 option").remove();
            _initAllSelect("#pv-all-variables1");
            if ($("#pv-all-variables2 option").eq(0).val() == -1) $("#pv-all-variables2 option").remove();
            _initAllSelect("#pv-all-variables2");
            $("#pv-variables-search").val("");
            $('#pv-variables-search-clear').css("visibility", "hidden");
        });

        $("#pv-column-search").on("keyup", function (e) {
            var input = this.value.toLowerCase();
            if (input != "") {
                if ($("#pv-all-columns option").eq(0).val() == -1) $("#pv-all-columns option").remove();
                _initAllSelect("#pv-all-columns", input);
                $("#pv-column-search-clear").css("visibility", "visible");
                if ($("#pv-all-columns option").length == 0)
                    $("#pv-all-columns").append("<option value='-1' css:'display: block'>No matching variables.</option>");
            }
            else {
                $("#pv-column-search-clear").css("visibility", "hidden");
                _initAllSelect("#pv-all-columns");
            }
        });

        $('#pv-column-search-clear').click(function (e) {
            $("#pv-column-search").val("");
            $('#pv-column-search-clear').css("visibility", "hidden");
            if ($("#pv-all-columns option").eq(0).val() == -1) $("#pv-all-columns option").remove();
            _initAllSelect("#pv-all-columns");
        });

        //Statistical model search
        $("#pv-variables-search").on("keyup", function (e) {
            //var input = this.value.toLowerCase();
            var input = e.target.value.toLowerCase();
            if (input != "") {
                if ($("#pv-all-variables1 option").eq(0).val() == -1) $("#pv-all-variables1 option").remove();
                _initAllSelect("#pv-all-variables1", input);
                if ($("#pv-all-variables2 option").eq(0).val() == -1) $("#pv-all-variables2 option").remove();
                _initAllSelect("#pv-all-variables2", input);
                $("#pv-variables-search-clear").css("visibility", "visible");
                if ($("#pv-all-variables1 option").length == 0)
                    $("#pv-all-variables1").append("<option value='-1' css:'display: block'>No matching variables.</option>");
                if ($("#pv-all-variables2 option").length == 0)
                    $("#pv-all-variables2").append("<option value='-1' css:'display: block'>No matching variables.</option>");
            }
            else {
                $("#pv-variables-search-clear").css("visibility", "hidden");
                _initAllSelect("#pv-all-variables1");
                _initAllSelect("#pv-all-variables2");
            }
        });

        $('#pv-variables-search-clear').click(function (e) {
            $("#pv-variables-search").val("");
            $('#pv-variables-search-clear').css("visibility", "hidden");
            if ($("#pv-all-variables1 option").eq(0).val() == -1) $("#pv-all-variables1 option").remove();
            _initAllSelect("#pv-all-variables1");
            if ($("#pv-all-variables2 option").eq(0).val() == -1) $("#pv-all-variables2 option").remove();
            _initAllSelect("#pv-all-variables2");
        });


        $('.pv-toolbarpanel-view').click(function (e) {
            var viewId = this.id.substring(this.id.lastIndexOf('-') + 1, this.id.length);
            if (viewId != null && viewId != 10)
                PV.selectView(parseInt(viewId));
        });

        $('#pv-primsort').on('change', function (e) {
            _sortCategory = $('#pv-primsort option:selected').html();
            var category = PivotCollection.getCategoryByName(_sortCategory);
            if (!category.uiInit) PV.initUICategory(category);
            LoadSem.acquire(function (release) {
                _tiles.sort(tileSortBy(_sortCategory, false, _stringFilters));
                _filterList = [];
                for (var i = 0; i < _tiles.length; i++) {
                    var tile = _tiles[i];
                    tile.missing = !Settings.showMissing && tile.item.getFacetByName(_sortCategory) == undefined;
                    if (tile.filtered)
                      _filterList.push(_tiles[i]);

                }

                PV.filterViews();
                release();
            });
        });

        $(".pv-facet").click(function (e) { _filterCategory($(this)); });

        $(".pv-filterpanel-clearall").click(function (e) {
            //deselect all String Facets
            var checked = $(".pv-facet-value:checked");
            checked.prop("checked", false);
            for (var i = 0; i < checked.length; i++) {
                if (checked.eq(i).attr('itemvalue') == "CustomRange")
                    _hideCustomDateRange($(checked[i]).attr('itemfacet'));
            }
            //Reset all Numeric Facets
            var sliders = $(".pv-facet-numericslider");
            sliders.modSlider("clearValues");
            sliders.siblings(".pv-facet-numericslider-range-val").html("&nbsp;");
            //turn off clear buttons
            $(".pv-filterpanel-accordion-heading-clear").css("visibility", "hidden");
            $("#pv-long-search-clear").css("visibility", "hidden");
            $("#pv-long-search").val("");
            _longstringFilters = null;
            PV.filterCollection();
        });

        $('.pv-filterpanel-accordion-heading-clear').click( function (e) {
            var facetType = this.attributes['facetType'].value;
            if (facetType == "DateTime") {
                //get selected items in current group
                var checked = $(this).parent().next().find('.pv-facet-value:checked');
                checked.prop('checked', false);
                for (var i = 0; i < checked.length; i++) _hideCustomDateRange($(checked[i]).attr('itemfacet'));
            }
            else if (facetType == "String") $(this).parent().next().find('.pv-facet-value:checked').prop("checked", false);
            else if (facetType == "Number" || facetType == "Ordinal") {
                //reset range
                var slider = $(this).parent().next().find('.pv-facet-numericslider');
                slider.modSlider("clearValues");
                slider.siblings(".pv-facet-numericslider-range-val").html("&nbsp;");
            }
            PV.filterCollection();
            $(this).css('visibility', 'hidden');
        });

        $('.pv-facet-customrange').on('change', function (e) { _changeCustomRange(this); });
        $('.pv-infopanel-details').on("click", '.detail-item-value-filter', function (e) {
            $.publish("/PivotViewer/Views/Item/Filtered", [{category: $(this).parent().children().attr('pv-detail-item-title'), min: $(this).attr('pv-detail-item-value'), values: null}]);
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
                    $.publish("/PivotViewer/Views/Item/Selected", [{ item: tile }]);
                    _views[_currentView].centerOnTile(tile);
                    break;
                }
            }
        });

        $(".pv-toolbarpanel-sort").on("mousedown", function (e) {
            if ($(this).attr("dirty") == 1) _initVisibleSelect("#" + $(this).attr("id"), false, PV.cleanName($('.pv-filterpanel-search').val().toLowerCase()));
            $(this).attr("dirty", 0);
        });

        $('.pv-value-search').on('keyup', function (e) {
            var input = PV.cleanName(this.value.toLowerCase());
            if (input != "") {
                var category = PivotCollection.getCategoryByName(_nameMapping[$(".pv-facet").eq($('.pv-filterpanel-accordion').accordion('option', 'active')).attr("facet")]), search = [];
                if (category.isString() && category.name.toLowerCase().indexOf(input) == -1) {
                    search = $('.pv-filterpanel-accordion-facet-list-item[id^="pv-facet-value-' + PV.cleanName(category.name) + '"]');
                    search.hide();
                    search = search.filter(function () {
                        return PV.cleanName($(this).children().eq(0).attr('itemvalue').toLowerCase()).indexOf(input) >= 0 && $(this).children().eq(2).html() > 0;
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
            var input = PV.cleanName(this.value.toLowerCase());
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
                    if (!category.uiInit) PV.initUICategory(category);
                    LoadSem.acquire(function (release) {
                        $(".pv-filterpanel-accordion").accordion("option", "collapsible", false);
                        $('.pv-filterpanel-accordion').accordion('option', 'active', category.visIndex);
                        _filterCategory(search.eq(0));
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
        canvas.mouseup(function (evt) {
            if (evt.which != 1) return false;
            var offset = $(this).offset();
            if (!_mouseMove || (_mouseMove.x == 0 && _mouseMove.y == 0)) PV.getCurrentView().handleClick({ x: evt.pageX - offset.left, y: evt.pageY - offset.top});
            _mouseDrag = null;
            _mouseMove = false;
        });
        canvas.mouseout(function (evt) {
            _mouseDrag = null;
            _mouseMove = false;
        });
        //mousedown - used to detect drag
        canvas.mousedown(function (evt) {
            if (evt.which != 1) return false;
            var offset = $(this).offset();
            var offsetX = evt.pageX - offset.left;
            var offsetY = evt.pageY - offset.top;
            _mouseDrag = { x: offsetX, y: offsetY };
        });
        //mousemove - used to detect drag
        canvas.mousemove(function (evt) {
            var offset = $(this).offset();
            var offsetX = evt.pageX - offset.left, offsetY = evt.pageY - offset.top;

            if (_mouseDrag == null) PV.getCurrentView().handleHover({ x: offsetX, y: offsetY });
            else {
                _mouseMove = { x: offsetX - _mouseDrag.x, y: offsetY - _mouseDrag.y };
                _mouseDrag = { x: offsetX, y: offsetY };
                $.publish("/PivotViewer/Views/Canvas/Drag", [_mouseMove]);
            }
        });
        //mousewheel - used for zoom
        canvas.on('mousewheel', function (evt, delta) {
            var offset = $(this).offset();
            //zoom easing different from filter
            TileController.setQuarticEasingOut();

            var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
            if (delta > 0) { value = (value < 5) ? 5 : value + 5; }
            else if (delta < 0) { value = value - 5; }
            value = Math.max(0, Math.min(100, value));
            PV.zoom(value, evt.pageX - offset.left, evt.pageY - offset.top);
        });
        canvas.on("contextmenu", function (evt) {
            var offset = $(this).offset();
            PV.getCurrentView().handleContextMenu({ x: evt.pageX - offset.left, y: evt.pageY - offset.top });
        });
        //http://stackoverflow.com/questions/6458571/javascript-zoom-and-rotate-using-gesturechange-and-gestureend
        canvas.on("touchstart", function (evt) {
            var orig = evt.originalEvent, offset = $(this).offset();
            _mouseDrag = { x: orig.touches[0].pageX - offset.left, y: orig.touches[0].pageY - offset.top};
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
                if (!_mouseMove || (_mouseMove.x == 0 && _mouseMove.y == 0)) PV.getCurrentView().handleClick({ x: offsetX, y: offsetY });
            }
            _mouseDrag = null;
            _mouseMove = false;
            return;
        });

        _sortCategory = $('#pv-primsort option').eq(0).html();
        var category = PivotCollection.getCategoryByName(_sortCategory);
        if (!category.uiInit) PV.initUICategory(category);

        LoadSem.acquire(function (release) {
            _tiles.sort(tileSortBy(_sortCategory, false, _stringFilters));

            for (var i = 0; i < _tiles.length; i++) {
                var tile = _tiles[i];
                tile.missing = !Settings.showMissing && tile.item.getFacetByName(_sortCategory) == undefined;
            }

            PV.filterCollection();

            if (Settings.visibleCategories.length < PivotCollection.categories.length)
                $.publish("/PivotViewer/Settings/Changed", [Settings]);
            else $(".pv-facet").attr("visible", "visible");

            if (_options.View != undefined) PV.selectView(_options.View);
            else PV.selectView(0);
            TileController.beginAnimation();
            release();
        });
    });

    var oldValue = 0;
    PV.zoom = function (value, x, y) {
        if (x == undefined) x = $('.pv-canvas').width() / 2;
        if (y == undefined) y = $('.pv-canvas').height() / 2;
        $('.pv-toolbarpanel-zoomslider').slider('option', 'value', value);
        $.publish("/PivotViewer/Views/Canvas/Zoom", [{ x: x, y: y, delta: (0.5 * (value - oldValue)) }]);
        oldValue = value;
    }

    var _initAllSelect = function (id, search) { //hack to avoid .hide() in IE
        if (search == undefined) search = "";
        var select = $(id);
        for (var i = 0; i < select.length; i++) {
            var selValue = select.eq(i).val();
            select.eq(i).children().remove();
            for (var j = 0; j < PivotCollection.categories.length; j++) {
                var category = PivotCollection.categories[j];
                if (j == selValue || category.name.toLowerCase().indexOf(search) != -1)
                    select.eq(i).append("<option value=" + j + " search='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
            }
            select.eq(i).val(selValue);
        }
    }

    var _initAllVisible = function (id, search) {
        if (search == undefined) search = "";
        var select = $(id);
        for (var i = 0; i < select.length; i++) {
            var selValue = select.eq(i).val();
            select.eq(i).children().remove();
            for (var j = 0; j < PivotCollection.categories.length; j++) {
                var category = PivotCollection.categories[j];
                if (j == selValue || category.name.toLowerCase().indexOf(search) != -1)
                    select.eq(i).append("<option value=" + j + " search='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
            }
            select.eq(i).val(selValue);
        }
    }

    var _initVisibleSelect = function (id, showFilterInvisible, search) { //hack to avoid .hide() in IE
        if (search == undefined) search = "";
        if (showFilterInvisible == undefined) showFilterInvisible = false;
        var select = $(id);
        for (var i = 0; i < select.length; i++) {
            var selValue = select.eq(i).val();
            select.eq(i).children().remove();
            for (var j = 0; j < Settings.visibleCategories.length; j++) {
                var index = Settings.visibleCategories[j], category = PivotCollection.categories[index];
                if (((category.isFilterVisible && !category.isLongString()) || showFilterInvisible) &&
                    (index == selValue || PV.cleanName(category.name).toLowerCase().indexOf(search) != -1))
                    select.eq(i).append("<option value=" + Settings.visibleCategories[j] + " search='" + PV.cleanName(category.name.toLowerCase()) + "'>" + category.name + "</option>");
            }
            select.eq(i).val(selValue);
       }
    }

    //Show the info panel
    $.subscribe("/PivotViewer/Views/Item/Selected", function (evt) {
        if (evt.item === undefined || evt.item == null) {
            PV.deselectInfoPanel();
            if (_selectedItem != null) _selectedItem.setSelected(false);
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

            var facets = Loader.getRow(selectedItem.item.id);
            for (var i = 0; i < facets.length; i++) {
                var category = PivotCollection.getCategoryByName(facets[i].name);
                if (!Settings.visibleCategories[category.name]) continue;

                detailDOM[i] = "<div class='pv-infopanel-detail " + (alternate ? "detail-dark" : "detail-light") + "'><div class='pv-infopanel-detail-item detail-item-title' pv-detail-item-title='" + category.name + "'>" + category.name + "</div>";
                for (var j = 0; j < facets[i].values.length; j++) {
                    var value = facets[i].values[j];
                    detailDOM[i] += "<div pv-detail-item-value='" + value.value +
                        "' class='pv-infopanel-detail-item detail-item-value" + (category.isFilterVisible ? " detail-item-value-filter" : "") + "'>";
                    if (value.href != null && value.href != "")
                        detailDOM[i] += "<a class='detail-item-link' href='" + value.href + "'>" + value.label + "</a>";
                    else detailDOM[i] += value.label;
                    detailDOM[i] += "</div>";
                }
                detailDOM[i] += "</div>";
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

            if(_selectedItem != null) _selectedItem.setSelected(false);
            selectedItem.setSelected(true);

            _selectedItem = selectedItem;

            _views[_currentView].setSelected(_selectedItem);
        }

    });

    $.subscribe("/PivotViewer/Views/Item/Filtered", function (evt) {
        if (evt == undefined || evt == null) return;

        var filters = (evt.length != undefined ? evt : [evt]);

        for (var i = 0; i < filters.length; i++) {
            var filter = filters[i];

            var category = PivotCollection.getCategoryByName(filter.category);
            if (!category.uiInit) {
                PV.initUICategory(category);
                if (category.isNumber()) _refreshNumberWidget(category, _numericItemTotals[category.name].values);
                else if(category.isOrdinal()) _refreshOrdinalWidget(category, _ordinalItemTotals[category.name].values);
            }
            LoadSem.acquire(function (release) {
                if (category.isString()) {
                    $(".pv-facet-value[itemfacet='" + PV.cleanName(category.name) + "']").prop("checked", false);
                    if (filter.values) {
                        if (filter.values.length == 1) {
                            var cb = $(PivotViewer.Utils.escapeMetaChars("#pv-facet-value-" + PV.cleanName(category.name) + "__" + PV.cleanName(filter.values[0].toString())) + " input");
                            cb.prop("checked", true);
                            if(filters.length == 1) PV.clickValue(cb[0]);
                        }
                        else if(filter.values.length > 0) {
                            for (var j = 0; j < filter.values.length; j++) {
                                $(PivotViewer.Utils.escapeMetaChars("#pv-facet-value-" + PV.cleanName(category.name) + "__" + PV.cleanName(filter.values[j].toString())) + " input").prop('checked', true);
                            }
                            $(PivotViewer.Utils.escapeMetaChars("#pv-facet-value-" + PV.cleanName(category.name) + "__" + PV.cleanName(filter.values[0].toString())) + " input").parent().parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
                            if (filters.length == 1) PV.filterCollection();
                        }
                    }
                    else {
                        var cb = $(PivotViewer.Utils.escapeMetaChars("#pv-facet-value-" + PV.cleanName(category.name) + "__" + PV.cleanName(filter.min.toString())) + " input");
                        cb.prop("checked", true);
                        if (filters.length == 1) PV.clickValue(cb[0]);
                    }
                }
                else if (category.isNumber()|| category.isOrdinal()) {
                    var s = $('#pv-facet-numericslider-' + PivotViewer.Utils.escapeMetaChars(PV.cleanName(category.name)));
                    if (filter.max == undefined) filter.max = filter.min;
                    PV.dragCategorySlider(s, filter.min, filter.max, filters.length == 1);
                }
                else if (category.isDateTime()) {
                    var name = PV.cleanName(category.name);
                    $('#pv-facet-value-' + name + '__CustomRange:first-child').prop("checked", true);
                    _getCustomDateRange(name);
                    var textbox1 = $('#pv-custom-range-' + name + '__StartDate'),
                        textbox2 = $('#pv-custom-range-' + name + '__FinishDate');
                    var minDate = new Date(filter.min), maxDate = new Date(filter.max);
                    textbox1[0].value = (minDate.getMonth() + 1) + "/" + minDate.getDate() + "/" + minDate.getFullYear();
                    textbox2[0].value = (maxDate.getMonth() + 1) + "/" + maxDate.getDate() + "/" + maxDate.getFullYear();
                    textbox1.datepicker("option", "minDate", minDate);
                    textbox2.datepicker("option", "maxDate", maxDate);

                    // Clear any filters already set for this facet
                    var checked = $(textbox1).parent().parent().parent().parent().children().next().find('.pv-facet-value:checked');
                    checked.find("[itemvalue!='CustomRange']").prop("checked", false);
                    checked.parent().parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
                    if (filters.length == 1) PV.filterCollection();
                }
                release();
            });
        }
        if (filters.length > 1) PV.filterCollection();
    });

    PV.clickValue = function (checkbox) {
        var category = PivotCollection.getCategoryByName(_nameMapping[$(checkbox).attr('itemfacet')]);
        var value = _nameMapping[$(checkbox).attr('itemvalue')], enlarge, clear;
        if ($(checkbox).prop('checked')) {
            $(checkbox).parent().parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
            if ($(checkbox).attr('itemvalue') == "CustomRange"){
                _getCustomDateRange($(checkbox).attr('itemfacet'));
                return;
            }
            enlarge = ($("input[itemfacet|='" + $(checkbox).attr("itemfacet") + "']:checked").length > 1);
            clear = false;
        }
        else if (!$(checkbox).prop('checked')) {
            if ($(checkbox).attr('itemvalue') == "CustomRange") _hideCustomDateRange($(checkbox).attr('itemfacet'));
            if ($("input[itemfacet|='" + $(checkbox).attr("itemfacet") + "']:checked").length == 0) {
                enlarge = true;
                $(checkbox).parent().parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
            }
            else enlarge = false;
            clear = true;
        }
        if (category.isString()) PV.filterCollection({ category: category, enlarge: enlarge, clear: clear, value: value });
        else {
            start = $(checkbox).attr('startdate');
            end = $(checkbox).attr('enddate');
            PV.filterCollection({ category: category, enlarge: enlarge, clear: clear, value: value, min: new Date(start), max: new Date(end) })
        }

    };

    PV.dragCategorySlider = function (slider, min, max, doFilter) {
        var that = $(slider);
        var thisMin = that.modSlider('option', 'min'), thisMax = that.modSlider('option', 'max');
        if (min == "(no info)") min = 0;
        if (min > thisMin || max < thisMax) {
            that.parent().find('.pv-facet-numericslider-range-val').text(min + " - " + max);
            that.modSlider('values', 0, min);
            that.modSlider('values', 1, max);
            that.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'visible');
        }
        else if (min == thisMin && max == thisMax)
            that.parent().parent().prev().find('.pv-filterpanel-accordion-heading-clear').css('visibility', 'hidden');
        if(doFilter != false) PV.filterCollection();
    }

    var _bucketize = function (bucketGroups, index, bucketName, id, date) {
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

    var _createDatetimeBuckets = function (category) {
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

            if (hasDecades) _bucketize(category.datetimeBuckets, k++, decade + "s", item.id, date);
            if (hasYears) _bucketize(category.datetimeBuckets, k++, year, item.id, date);
            var month = PivotViewer.Utils.getMonthName(date);
            if (hasMonths) _bucketize(category.datetimeBuckets, k++, month + ", " + year, item.id, date);
            var day = date.getDate();
            if (hasDays) _bucketize(category.datetimeBuckets, k++, month + " " + day + ", " + year, item.id, date);
            var hours = PivotViewer.Utils.getHour(date), meridian = PivotViewer.Utils.getMeridian(date);
            if (hasHours) _bucketize(category.datetimeBuckets, k++, month + " " + day + ", " + year + " " + hours + " " + meridian, item.id, date);
            var mins = PivotViewer.Utils.getMinutes(date);
            if (hasMinutes) _bucketize(category.datetimeBuckets, k++, month + " " + day + ", " + year + " " + hours + ":" + mins + " " + meridian, item.id, date);
            var secs = PivotViewer.Utils.getSeconds(date);
            if (hasSeconds) _bucketize(category.datetimeBuckets, k, month + " " + day + ", " + year + " " + hours + ":" + mins + ":" + secs + " " + meridian, item.id, date);
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

    var _hideCustomDateRange = function (facetName) {
        $('#pv-custom-range-' + facetName + '__Start').css('visibility', 'hidden');
        $('#pv-custom-range-' + facetName + '__Finish').css('visibility', 'hidden');
        $('#pv-custom-range-' + facetName + '__StartDate').datepicker("setDate", null);
        $('#pv-custom-range-' + facetName + '__FinishDate').datepicker("setDate", null);
        $('#pv-custom-range-' + facetName + '__FinishDate').datepicker("option", "minDate", null);
        $('#pv-custom-range-' + facetName + '__StartDate').datepicker("option", "minDate", null);
        $('#pv-custom-range-' + facetName + '__FinishDate').datepicker("option", "maxDate", null);
        $('#pv-custom-range-' + facetName + '__StartDate').datepicker("option", "maxDate", null);
    };

    var _getCustomDateRange = function (facetName) {
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
        if (category.datetimeBuckets["day"] != undefined && category.datetimeBuckets["day"].length > 0) {
            maxDate = category.datetimeBuckets["day"][category.datetimeBuckets["day"].length - 1].start;
            minDate = category.datetimeBuckets["day"][0].start;
            $('#pv-custom-range-' + facetName + '__StartDate').datepicker( "option", "defaultDate", minDate );
            $('#pv-custom-range-' + facetName + '__FinishDate').datepicker( "option", "defaultDate", maxDate );
            if (category.datetimeBuckets["year"] != undefined && category.datetimeBuckets["year"].length > 0) {
                maxYear = category.datetimeBuckets["year"][category.datetimeBuckets["year"].length - 1].name;
                minYear = category.datetimeBuckets["year"][0].name;
                $('#pv-custom-range-' + facetName + '__StartDate').datepicker( "option", "yearRange", minYear + ':' + maxYear );
                $('#pv-custom-range-' + facetName + '__FinishDate').datepicker( "option", "yearRange", minYear + ':' + maxYear );
            }
        }
    };

    var _changeCustomRange = function (textbox) {
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
            var checked = $(textbox).parent().parent().parent().parent().children().next().find('.pv-facet-value:checked');
            for (var i = 0; i < checked.length; i++) {
                if ($(checked[i]).attr('itemvalue') != 'CustomRange')
                    $(checked[i]).prop('checked', false);
            }
            PV.filterCollection();
        }
    };

    //Constructor
    $.fn.PivotViewer = function (method) {
        if (methods[method]) return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        else if (typeof method === 'object' || !method) return methods.init.apply(this, arguments);
        else $.error('Method ' + method + ' does not exist on jQuery.PivotViewer');
    };
})(jQuery);
