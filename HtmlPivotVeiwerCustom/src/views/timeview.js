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

PivotViewer.Views.TimeView = PivotViewer.Views.IPivotViewerView.subClass({
    init: function () {
        this._super();
        this.selectedFacet = 0;
        this.default_showBubble = Timeline.OriginalEventPainter.prototype._showBubble;
        this.timeFacets = [];
        for (var i = 0; i < PivotCollection.FacetCategories.length; i++) {
            var category = PivotCollection.FacetCategories[i];
            if(category.Type == PivotViewer.Models.FacetType.DateTime)
                this.timeFacets.push({ name: category.Name });
        }
        this.theme = Timeline.ClassicTheme.create();
        var that = this;
        Timeline.OriginalEventPainter.prototype._showBubble = function (x, y, evt) {
            if (that.selected != null && that.selected.facetItem.Id == evt._id) {
                that.SetSelected(null);
                $.publish("/PivotViewer/Views/Item/Selected", [{ item: tile }]);
            }
            else {
                var tile = TileController.GetTileById(evt._id);
                that.SetSelected(tile);
                $.publish("/PivotViewer/Views/Item/Selected", [{ item: tile }]);
            }
        }
        this.theme.autoWidth = false;
    },
    Setup: function (width, height, offsetX, offsetY) { 
        this.width = width;
        this.height = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.currentWidth = this.width;
        this.currentHeight = this.height;
        this.currentOffsetX = this.offsetX;
        this.currentOffsetY = this.offsetY;
    },
    Activate: function() {
        if (!Modernizr.canvas) return;
        this._super();
        $('.pv-toolbarpanel-timelineselector').fadeIn();
        $('.pv-timeview-canvas').fadeIn();
        $('.pv-timeview-canvas').css('height', this.height - 12 + 'px');
        $('.pv-timeview-canvas').css('width', this.width - 415 + 'px');
        $('#MAIN_BODY').css('overflow', 'hidden');

        $('.pv-toolbarpanel-timelineselector').empty();
        var facetSelectControl = "<select id='pv-timeline-selectcontrol' style='width:126px'>";

        for (var i = 0; i < this.timeFacets.length; i++) {
            facetSelectControl += "<option " + (i == this.selectedFacet ? "Facetselected='selected' " : "") + "value='" + i + "'>" + this.timeFacets[i].name + "</option>";
        }
        facetSelectControl += "</select>";
        $('.pv-toolbarpanel-timelineselector').append(facetSelectControl);

        var that = this;
        $('#pv-timeline-selectcontrol').change(function () {
            that.selectedFacet = $('#pv-timeline-selectcontrol').val();
            that.RefreshView();
            that.timeline.getBand(0).setCenterVisibleDate(that.timeFacets[that.selectedFacet].eventsData[this.selected.facetItem.Id + "a"].getStart());
            $.publish("/PivotViewer/Views/Item/Updated", null);
        });

        // Use first datetime category for the timeline data
        var category = PivotCollection.getCategoryByName(this.timeFacets[this.selectedFacet].name);
        if (!category.uiInit) PV.InitUIFacet(category);
        var timeFacet =  this.timeFacets[this.selectedFacet];
        if(timeFacet.interval0 == undefined) {
            if (category.datetimeBuckets["decade"] != undefined && category.datetimeBuckets["decade"].length > 1) {
                timeFacet.interval0 = Timeline.DateTime.YEAR;
                timeFacet.interval1 = Timeline.DateTime.DECADE;
            }
            else if (category.datetimeBuckets["year"] != undefined && category.datetimeBuckets["year"].length > 1) {
                timeFacet.interval0 = Timeline.DateTime.MONTH;
                timeFacet.interval1 = Timeline.DateTime.YEAR;
            }
            else if (category.datetimeBuckets["month"] != undefined && category.datetimeBuckets["month"].length > 1) {
                timeFacet.interval0 = Timeline.DateTime.DAY;
                timeFacet.interval1 = Timeline.DateTime.MONTH;
            }
            else if (category.datetimeBuckets["day"] != undefined && category.datetimeBuckets["day"].length > 1) {
                timeFacet.interval0 = Timeline.DateTime.HOUR;
                timeFacet.interval1 = Timeline.DateTime.DAY;
            }
            else {
                timeFacet.interval0 = Timeline.DateTime.DAY;
                timeFacet.interval1 = Timeline.DateTime.MINUTE;
            }
        }
        if (this.filtered) this.Filter(this.filterEvt.tiles, this.filterEvt.filter);
    },
    Deactivate: function() {
        this._super();
        $('.pv-timeview-canvas').fadeOut();
        $('.pv-toolbarpanel-timelineselector').fadeOut();
    },
    Filter: function (tiles, filter) { 
        var that = this;

        Debug.Log('Timeline View Filtered: ' + filter.length);

        this.selected = null;
        this.tiles = tiles;
        this.filter = filter;

        this.CreateEventsData();
        var timeFacet = this.timeFacets[this.selectedFacet];
        if (this.timeFacets.length == 0 || timeFacet.eventsData.length == 0) {
            this.ShowTimeError();
            return;
        } 

        var eventSource = new Timeline.DefaultEventSource();
        var bandInfos = [
            Timeline.createBandInfo({
                eventSource:    eventSource,
                date:           timeFacet.eventsData[0].getStart(),
                width:          "80%",
                intervalUnit:   timeFacet.interval0,
                intervalPixels: 100,
                theme:          this.theme
            }),
            Timeline.createBandInfo({
                overview:       true,
                date:           timeFacet.eventsData[0].getStart(),
                eventSource:    eventSource,
                width:          "20%",
                intervalUnit:   timeFacet.interval1,
                intervalPixels: 200,
                theme:          this.theme
            })
        ];

        bandInfos[1].highlight = true;
        bandInfos[1].syncWith = 0;
        bandInfos[1].decorators = [
            new Timeline.SpanHighlightDecorator({
                inFront:    false,
                color:      "#FFC080",
                opacity:    30,
                startLabel: "Begin",
                endLabel:   "End",
                theme:      this.theme
            })
        ];

        this.timeline = Timeline.create($('.pv-timeview-canvas')[0], bandInfos, Timeline.HORIZONTAL);
        this.timeline.showLoadingMessage();
        Timeline.loadJSON("timeline.json", function(json, url) { eventSource.loadJSON(json,url); });
        this.timeline.hideLoadingMessage();
        this.RefreshView();

        this.filtered = false;
    },
    GetUI: function () { return ''; },
    GetButtonImage: function () {return 'images/TimeView.png';},
    GetButtonImageSelected: function () {return 'images/TimeViewSelected.png';},
    GetViewName: function () { return 'Time View'; },
    CreateEventsData: function () {
        this.timeFacets[this.selectedFacet].eventsData = [];
        for (var i = 0; i < this.filter.length; i++) {
            for (var j = 0; j < this.timeFacets.length; j++) {
                var tile = this.filter[i], facet = tile.facetItem.FacetByName[this.timeFacets[j].name];
                if (facet != undefined) {
                    var evt = new Timeline.DefaultEventSource.Event({
                        id: tile.facetItem.Id,
                        start: new Date(facet.FacetValues[0].Value),
                        isDuration: false,
                        text: tile.facetItem.Name,
                        image: tile._images ? tile._images[0].attributes[0].value : null,
                        link: tile.facetItem.Href,
                        caption: tile.facetItem.Name,
                        description: tile.facetItem.Description,
                    });
                    this.timeFacets[j].eventsData.push(evt);
                    this.timeFacets[j].eventsData[tile.facetItem.Id + "a"] = evt;
                }
            }
        }
    },
    ShowTimeError: function () {
        var msg = '';
        msg = msg + 'The current data selection does not contain any information that can be shown on a timeline<br><br>';
        msg = msg + '<br>Choose a different view<br>';
        $('.pv-wrapper').append("<div id=\"pv-dzlocation-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
        var t=setTimeout(function(){window.open("#pv-dzlocation-error","_self")},1000)
        return;
    },
    RefreshView: function () {
        this.timeline.getBand(0).getEventSource().clear();
        this.timeline.getBand(0).getEventSource().addMany(this.timeFacets[this.selectedFacet].eventsData);
        this.timeline.paint();
    },
    SetSelected: function (selected) {
        if(this.selected != null)
            this.timeFacets[this.selectedFacet].eventsData[this.selected.facetItem.Id + "a"]._icon = Timeline.urlPrefix + "images/dull-blue-circle.png";
        this._super(selected);
        if (selected != null) {
            var evt = this.timeFacets[this.selectedFacet].eventsData[this.selected.facetItem.Id + "a"];
            this.timeline.getBand(0).setCenterVisibleDate(evt.getStart());
            evt._icon = Timeline.urlPrefix + "images/dark-red-circle.png" //broken
        }
    }
});
