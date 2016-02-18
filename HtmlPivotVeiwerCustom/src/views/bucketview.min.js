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
//  This software is licensepvd under the terms of the
//  GNU General Public License v2 (see COPYING)
//

PivotViewer.Utils.loadScript("src/views/definebuckets.js");

var cIndex;

$(document).on("click", "#new-page", function(){
  var resultWindow = window.open();
  resultWindow.document.write('<link href="style/bootstrap.css" rel="stylesheet" type="text/css" />'+
  '<title>Rules Table</title><code><pre id="new-rule-result" style="position: relative;">'+
  $("#pv-rule-result").html() +
  '</pre></code>');
});

$(document).on("click", "#pv-rule-info", function(){
  var totalLength=PivotCollection.items.length;
  $("#ruleModal").modal('toggle');
  if(bucketRules[cIndex].value[1]!=undefined){
    $("#table_header").html("Value to be explained(X): "
    +bucketRules[cIndex].name+"; Values: "+bucketRules[cIndex].value[0]+" to "
    +bucketRules[cIndex].value[1]);
  }else{
    $("#table_header").html("Value to be explained(X): "
    +bucketRules[cIndex].name+"; Values: "+bucketRules[cIndex].value[0]);
  }

  $("#header_info").html("Total items with value X: "+Cs[cIndex].length
  +" out of "+totalLength+" ("+
  Math.round(Cs[cIndex].length/totalLength*100)+"%)");


  var filterOne, filterTwo, filterThree;
  var valueOne, valueTwo, valueThree;
  filterOne = ruleFilters[0].name;
  if(ruleFilters[0].type == "string"){
    valueOne = ruleFilters[0].value.join(', ');
  }else{
    valueOne = "from "+ruleFilters[0].value[0]+" to "+ruleFilters[0].value[1];
  }

  $("#filter_values").html("A: "+filterOne+": "+valueOne+" ("+A.length
  +" out of "+totalLength+", or "+Math.round(A.length/totalLength*100)+"%)");


  if(ruleFilters[1]!=undefined){
    filterTwo = ruleFilters[1].name;
    if(ruleFilters[1].type == "string"){
      valueTwo = ruleFilters[1].value.join(", ");
    }else{
      valueTwo = "from "+ruleFilters[1].value[0]+" to "+ruleFilters[1].value[1];
    }
    $("#filter_values").append("<br>B: "+filterTwo+": "+valueTwo+" ("+B.length
    +" out of "+totalLength+", or "+Math.round(B.length/totalLength*100)+"%)");
  }

  if(ruleFilters[2]!=undefined){
    filterThree = ruleFilters[2].name;
    if(ruleFilters[2].type == "string"){
      valueThree = ruleFilters[2].value.join(", ");
    }else{
      valueThree = "from "+ruleFilters[2].value[0]+" to "+ruleFilters[2].value[1];
    }
    $("#filter_values").append("<br>C: "+filterThree+": "+valueThree+" ("+D.length
    +" out of "+totalLength+", or "+Math.round(D.length/totalLength*100)+"%)");
  }

  if(ruleFilters[2]!=undefined){
    $("#rule_explain").html("Explainatory rule: if A and B and C then X");
  }
  else if(ruleFilters[1]!=undefined){
    $("#rule_explain").html("Explainatory rule: if A and B then X");
  }else{
    $("#rule_explain").html("Explainatory rule: if A then X");
  }

  $("#explain_values").html('<td id="explain" class="rules" style="white-space:normal;"></td><td id="total_ax" class="rules" style="white-space:normal;">'+
  '</td><td id="total_a_items" class="rules" style="white-space:normal;"></td><td id="total_acc" class="rules" style="white-space:normal;"></td><td id="total_cpl" class="rules" style="white-space:normal;"></td>');
  $("#explanation").html('<th class="rules" style="white-space:normal;">Explanation</th>'+
  '<th id="rule_one" class="rules" style="white-space:normal;"></th><th id="rule_two" class="rules" style="white-space:normal;"></th>'+
  '<th id="rule_three" class="rules" style="white-space:normal;"></th><th id="rule_four" class="rules" style="white-space:normal;"></th><th id="rule_five" class="rules" style="white-space:normal;"></th>');
  if(ruleFilters[2]!=undefined){
    $("#rule_one").html("Total items that have A, B, C and X");
    $("#rule_two").html("Total items that have A, B and C");
    $("#rule_three").html("Accuracy of explanation,  N(ABCX)/N(ABC)");
    $("#rule_four").html("Completeness of explanation, N(ABCX)/N(X)");
    $("#rule_five").html("Contribution of A into accuracy of explanation");
    $("#explanation").append('<th class="rules_six" style="white-space:normal;">Contribution of B into accuracy of explanation</th>');
    $("#explanation").append('<th class="rules_seven" style="white-space:normal;">Contribution of B into accuracy of explanation</th>');
    $("#explain").html("ABC->X");
    $("#total_ax").html(ABDCs[cIndex].length);
    $("#total_a_items").html(ABD.length);
    $("#total_acc").html(ABDCs[cIndex].length+" out of "+ABD.length+" or "+Math.round(ABDCs[cIndex].length/ABD.length*100)+"%");
    $("#total_cpl").html(ABDCs[cIndex].length+" out of "+Cs[cIndex].length+" or "+Math.round(ABDCs[cIndex].length/Cs[cIndex].length*100)+"%");
    var contrb_A = Math.round(ABDCs[cIndex].length/ABD.length*100)-Math.round(BDCs[cIndex].length/BD.length*100);
    var contrb_B = Math.round(ABDCs[cIndex].length/ABD.length*100)-Math.round(ADCs[cIndex].length/AD.length*100);
    var contrb_C = Math.round(ABDCs[cIndex].length/ABD.length*100)-Math.round(ABCs[cIndex].length/AB.length*100);
    if(contrb_A > 10){
      $("#explain_values").append("<td class='danger'>"+contrb_A+"%" +"</td>");
    }else if(contrb_A < -10){
      $("#explain_values").append("<td class='info'>"+contrb_A+"%" +"</td>");
    }else{
      $("#explain_values").append("<td class='success rules' style='white-space:normal;'>"+contrb_A+"%" +"</td>");
    }
    if(contrb_B > 10){
      $("#explain_values").append("<td class='danger rules' style='white-space:normal;'>"+contrb_B+"%" +"</td>");
    }else if(contrb_B < -10){
      $("#explain_values").append("<td class='info rules' style='white-space:normal;'>"+contrb_B+"%" +"</td>");
    }else{
      $("#explain_values").append("<td class='success rules' style='white-space:normal;'>"+contrb_B+"%" +"</td>");
    }
    if(contrb_C > 10){
      $("#explain_values").append("<td class='danger rules' style='white-space:normal;'>"+contrb_C+"%" +"</td>");
    }else if(contrb_C < -10){
      $("#explain_values").append("<td class='info rules' style='white-space:normal;'>"+contrb_C+"%" +"</td>");
    }else{
      $("#explain_values").append("<td class='success rules' style='white-space:normal;'>"+contrb_C+"%" +"</td>");
    }
  }
  else if(ruleFilters[1]!=undefined){
    $("#rule_one").html("Total items that have A, B and X");
    $("#rule_two").html("Total items that have A and B");
    $("#rule_three").html("Accuracy of explanation,  N(ABX)/N(AB)");
    $("#rule_four").html("Completeness of explanation, N(ABX)/N(X)");
    $("#rule_five").html("Contribution of A into accuracy of explanation");
    $("#explanation").append('<th class="rules" style="white-space:normal;">Contribution of B into accuracy of explanation</th>');

    $("#explain").html("AB->X");
    $("#total_ax").html(ABCs[cIndex].length);
    $("#total_a_items").html(AB.length);
    $("#total_acc").html(ABCs[cIndex].length+" out of "+AB.length+" or "+Math.round(ABCs[cIndex].length/AB.length*100)+"%");
    $("#total_cpl").html(ABCs[cIndex].length+" out of "+Cs[cIndex].length+" or "+Math.round(ABCs[cIndex].length/Cs[cIndex].length*100)+"%");

    var contrb_A = Math.round(ABCs[cIndex].length/AB.length*100)-Math.round(BCs[cIndex].length/B.length*100);
    var contrb_B = Math.round(ABCs[cIndex].length/AB.length*100)-Math.round(ACs[cIndex].length/A.length*100);
    if(contrb_A > 10){
      $("#explain_values").append("<td class='danger'>"+contrb_A+"%" +"</td>");
    }else if(contrb_A < -10){
      $("#explain_values").append("<td class='info'>"+contrb_A+"%" +"</td>");
    }else{
      $("#explain_values").append("<td class='success rules' style='white-space:normal;'>"+contrb_A+"%" +"</td>");
    }
    if(contrb_B > 10){
      $("#explain_values").append("<td class='danger rules' style='white-space:normal;'>"+contrb_B+"%" +"</td>");
    }else if(contrb_B < -10){
      $("#explain_values").append("<td class='info rules' style='white-space:normal;'>"+contrb_B+"%" +"</td>");
    }else{
      $("#explain_values").append("<td class='success rules' style='white-space:normal;'>"+contrb_B+"%" +"</td>");
    }
  }else{
    $("#rule_one").html("Total items that have A and X");
    $("#rule_two").html("Total items that have A");
    $("#rule_three").html("Accuracy of explanation,  N(AX)/N(A)");
    $("#rule_four").html("Completeness of explanation, N(AX)/N(X)");
    $("#rule_five").html("Contribution of A into accuracy of explanation");
    $("#explain").html("A->X");
    $("#total_ax").html(ACs[cIndex].length);
    $("#total_a_items").html(A.length);
    var contrb_A = Math.round(ACs[cIndex].length/A.length*100)-Math.round(Cs[cIndex].length/totalLength*100);
    $("#total_acc").html(ACs[cIndex].length+" out of "+A.length+" or "+Math.round(ACs[cIndex].length/A.length*100)+"%");
    $("#total_cpl").html(ACs[cIndex].length+" out of "+Cs[cIndex].length+" or "+Math.round(ACs[cIndex].length/Cs[cIndex].length*100)+"%");
    if(contrb_A > 10){
      $("#explain_values").append("<td class='danger'>"+contrb_A+"%" +"</td>");
    }else if(contrb_A < -10){
      $("#explain_values").append("<td class='info'>"+contrb_A+"%" +"</td>");
    }else{
      $("#explain_values").append("<td class='success rules' style='white-space:normal;'>"+contrb_A+"%" +"</td>");
    }
  }
  $("#accum_explain").html("");
  if(ruleFilters[2]!=undefined){
    $("#accum_explain").append("Accuracy of explanatory rule “if A and B then X” is N(ABX)/N(AB) = "+
    Math.round(ABCs[cIndex].length/AB.length*100)+"% ("+ABCs[cIndex].length+" out of "+AB.length+")");
    $("#accum_explain").append("<br>Accuracy of explanatory rule “if B and C then X” is N(BCX)/N(BC) = "+
    Math.round(BDCs[cIndex].length/BD.length*100)+"% ("+BDCs[cIndex].length+" out of "+BD.length+")");
    $("#accum_explain").append("<br>Accuracy of explanatory rule “if A and C then X” is N(ACX)/N(AC) = "+
    Math.round(BDCs[cIndex].length/AD.length*100)+"% ("+ADCs[cIndex].length+" out of "+AD.length+")");
  }
  else if(ruleFilters[1]!=undefined){
    $("#accum_explain").append("Accuracy of explanatory rule “if A then X” is N(AX)/N(A) = "+
    Math.round(ACs[cIndex].length/A.length*100)+"% ("+ACs[cIndex].length+" out of "+A.length+")");
    $("#accum_explain").append("<br>Accuracy of explanatory rule “if B then X” is N(BX)/N(B) = "+
    Math.round(BCs[cIndex].length/B.length*100)+"% ("+BCs[cIndex].length+" out of "+B.length+")");
  }

});

function locateBucket(startRange){
  for(var i = 0; i < bucketRules.length; i++){
    if(bucketRules[i].value[0] == startRange) return i;
  }
}

PivotViewer.Views.BucketView = PivotViewer.Views.TileBasedView.subClass({
    init: function () {
        this._super();
        var that = this;
        this.buckets = [];
        this.scale = 1;
        this.canvasHeightUIAdjusted = 0;
        this.titleSpace = 62;
        this.dontZoom = false;

        PV.subsets = [null, null];
        PV.subsets.finalized = false;

        $.subscribe("/PivotViewer/Views/Canvas/Zoom", function (evt) {
            if (!that.isActive) return;

            if (that.dontZoom) {
                that.dontZoom = false;
                return;
            }
            var oldScale = that.scale;
            //Set the zoom time - the time it takes to zoom to the scale
            //if on a touch device where evt.scale != undefined then have no delay
            var zoomTime = evt.scale != undefined ? 0 : 1000;

            if (evt.scale != undefined) {
                if (evt.scale >= 1) that.scale += (evt.scale - 1);
                else {
                    that.scale -= evt.scale;
                    if (that.scale < 1) that.scale = 1;
                }
            }
            else if (evt.delta != undefined)
                that.scale = evt.delta == 0 ? 1 : (that.scale + evt.delta);

            if (isNaN(that.scale)) that.scale = 1;

            var newWidth = (that.width - that.offsetX) * that.scale;

            //if trying to zoom out too far, reset to min
            if (newWidth < that.width || that.scale <= 1) {
                that.currentOffsetX = that.offsetX;
                that.currentOffsetY = that.offsetY;
                that.currentWidth = that.width;
                that.currentHeight = that.height;
                that.canvasHeightUIAdjusted = that.height - that.offsetY - that.titleSpace;
                that.columnWidth = that.origColumnWidth;
                that.scale = 1;
                $('.pv-bucketview-overlay div').fadeIn('slow');
                // Reset the slider to zero
                that.dontZoom = true;
                PV.zoom(0);
                that.recalibrateUISettings();
            }
            else {
                var newHeight = that.height * that.scale;
                that.currentOffsetX = evt.x - (evt.x - that.currentOffsetX) / oldScale * that.scale;
                that.currentOffsetY = evt.y - (evt.y - that.currentOffsetY) / oldScale * that.scale;
                that.canvasHeightUIAdjusted = newHeight - ((that.offsetY + that.titleSpace) / oldScale * that.scale);

                that.currentWidth = newWidth;
                that.currentHeight = newHeight;
                that.columnWidth = that.origColumnWidth * that.scale;
                $('.pv-bucketview-overlay div').fadeOut('slow');
                that.resetUISettings();
            }

            that.setTilePositions(that.rowscols, that.currentOffsetX, that.currentOffsetY, true, true);

            //deselect tiles if zooming back to min size
            if (that.scale == 1 && oldScale != 1) {
                for (var i = 0; i < that.tiles.length; i++) that.tiles[i].setSelected(false);
                that.selected = null;
                $.publish("/PivotViewer/Views/Item/Selected", [{item: that.selected}]);
            }
        });
    },
    getBucket: function(x) {return Math.floor((x - this.offsetX) / this.columnWidth)},
    recalibrateUISettings: function () { this.rowscols = this.getTileDimensions(this.columnWidth - 2, this.canvasHeightUIAdjusted - this.offsetY, this.maxRatio, this.bigCount, this.rowscols); },
    resetUISettings: function () { this.rowscols = this.calculateDimensions(this.columnWidth - 2, this.canvasHeightUIAdjusted - this.offsetY, this.maxRatio, this.bigCount); },
    handleFilter: function (tiles, filterList, sortCategory) {
        if (tiles != undefined) this.tiles = tiles;
        if (filterList != undefined) this.filterList = filterList;
        if(sortCategory != undefined) this.sortCategory = sortCategory;
        //add old info
        this.filtered = true;
        if (this.isActive) this.activate();
    },
    setup: function (width, height, offsetX, offsetY, tileMaxRatio) {
        this.width = width;
        this.height = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.maxRatio = tileMaxRatio;
        this.currentWidth = this.width;
        this.currentHeight = this.height;
        this.currentOffsetX = this.offsetX;
        this.currentOffsetY = this.offsetY;
        this.rowscols = null;
        this.bigCount = 0;
    },
    activate: function () {
        this._super();
        if (!DB.isOn()) DB.on();
        this.createUI();
    },
    filter: function () {
        if (PV.subsets.finalized){
          this.buckets = this.subset(this.filterList, this.sortCategory);
        }
        else{
           this.buckets = this.bucketize(this.filterList, this.sortCategory);
        }

    },
    createUI: function () {
        this.columnWidth = this.origColumnWidth = (this.width - this.offsetX) / this.buckets.length;
        this.canvasHeightUIAdjusted = this.height - this.offsetY - this.titleSpace;

        var uiElements = "";
        this.bigCount = 0; //for dimensions
        for (var i = 0; i < this.buckets.length; i++) {
            var bkt = this.buckets[i];
            var styleClass = i % 2 == 0 ? "bucketview-bucket-dark" : "bucketview-bucket-light";
            if (bkt.equals(PV.subsets[0]) || bkt.equals(PV.subsets[1])) styleClass += " pv-bucketview-subset";
            var label = (bkt.startRange == bkt.endRange || bkt.startLabel == bkt.endLabel ? bkt.startLabel : bkt.startLabel + "<br>to<br>" + bkt.endLabel) +
                (PV.subsets.finalized ? (i % 2 ? " (2)" : " (1)") : "");
            uiElements += "<div class='pv-bucketview-overlay-bucket " + styleClass + "' id='pv-bucketview-overlay-bucket-" + i + "' style='width: " +
                (Math.floor(this.columnWidth) - 4) + "px; height:" + (this.height - 2) + "px; left:" + ((i * this.columnWidth) - 2) + "px;'>";
            uiElements += "<div class='pv-bucketview-overlay-buckettitle' style='top: " + (this.canvasHeightUIAdjusted + 4) + "px;'><div class='pv-bucket-countbox'>" +
                this.buckets[i].tiles.length + "<br>" + Math.round(this.buckets[i].tiles.length / this.filterList.length * 100) + "%</div>" + label + "</div></div>";
            if (this.bigCount < bkt.tiles.length) this.bigCount = bkt.tiles.length;
        }
        $(".pv-viewpanel-view").append(
        '<div class="modal fade" id="ruleModal" role="dialog" style="z-index:100000;"><div class="modal-dialog" id="rule-modal"><div class="modal-content"><div class="modal-header">'+
        '<h4 class="modal-title">Rule Table</h4></div>'+
        '<div class="modal-body" ><code><pre id="pv-rule-result" style="position: relative; \
        ">'+
        '<h3 id="table_header"></h3><div class="table-responsive">'+
        '<h3 id="table_header"></h3><h3 id="header_info"></h3><div class="table-responsive" ><table class="table" >'+
        '<tr><th>Values in filter:</th></tr><tr><td id="filter_values"></td></tr>'+
        '<tr><td id="rule_explain">explainary rule</td></tr></table></div><div class="table-responsive" ><table class="table" ><tr id="explanation"><th class="rules" style="white-space:normal;">Explanation</th>'+
        '<th id="rule_one" class="rules" style="white-space:normal;"></th><th id="rule_two" class="rules" style="white-space:normal;"></th>'+
        '<th id="rule_three" class="rules" style="white-space:normal;"></th><th id="rule_four" class="rules" style="white-space:normal;"></th><th id="rule_five" class="rules" style="white-space:normal;"></th></tr>'+
        '<tr id="explain_values"><td id="explain" class="rules" style="white-space:normal;"></td><td id="total_ax" class="rules" style="white-space:normal;">'+
        '</td><td id="total_a_items" class="rules" style="white-space:normal;"></td><td id="total_acc" class="rules" style="white-space:normal;"></td><td id="total_cpl" class="rules" style="white-space:normal;"></td>'+
        '</tr></table></div><div class="table-responsive" ><table class="table" ><tr ><td id="accum_explain"></td></tr></table></div>'+
        '</pre></code></div><div class="modal-footer"><button type="button" class="btn btn-default" id="new-page">Open in new window</button><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>');
        $(".pv-viewpanel-view").append("<div class='pv-bucketview-overlay'></div>");
        $('.pv-bucketview-overlay').css('left', this.offsetX + 'px').append(uiElements);
        $('.pv-bucketview-overlay div').fadeIn('slow');

        for (var i = 0; i < this.tiles.length; i++) {
            var tile = this.tiles[i];
            tile._locations[0].startx = tile._locations[0].x;
            tile._locations[0].starty = tile._locations[0].y;
            tile.startwidth = tile.width;
            tile.startheight = tile.height;

            if (tile.filtered && (Settings.showMissing || !tile.missing)) continue;
            tile.start = PivotViewer.Utils.now();
            tile.end = tile.start + 1000;
            var theta = Math.atan2(tile._locations[0].y - (this.currentHeight / 2), tile._locations[0].x - (this.currentWidth / 2))
            tile._locations[0].destinationx = this.currentWidth * Math.cos(theta) + (this.currentWidth / 2);
            tile._locations[0].destinationy = this.currentHeight * Math.sin(theta) + (this.currentHeight / 2);
        }

        this.maxRatio = TileController._imageController.getRatio(this.tiles[0].item.img);
        for (var i = 0; i < this.filterList.length; i++) {
            var ratio = TileController._imageController.getRatio(this.filterList[i].item.img);
            if (ratio < this.maxRatio) this.maxRatio = ratio;
        }

        var pt2Timeout = this.filterList.length == this.tiles.length ? 0 : 500, that = this;
        setTimeout(function () {
            // Clear selection
            var value = $('.pv-toolbarpanel-zoomslider').slider('option', 'value');
            if (value > 0) {
                that.selected = selectedTile = null;
                that.currentOffsetX = that.offsetX;
                that.currentOffsetY = that.offsetY;
                that.resetUISettings();
                PV.zoom(0);
            }
            that.resetUISettings();
            var controller = TileController._imageController
            for (var i = 0; i < that.tiles.length; i++) {
                that.tiles[i].origwidth = that.rowscols.TileHeight / controller.getRatio(that.tiles[i].item.img);
                that.tiles[i].origheight = that.rowscols.TileHeight;
                that.tiles[i].destinationwidth = 1;
                that.tiles[i].destinationheight = 1;
            }
            that.setTilePositions(that.rowscols, that.offsetX, that.offsetY, false, false);

        }, pt2Timeout);
    },
    deactivate: function () {
        this._super();
        $('.pv-bucketview-overlay div').fadeOut();
    },
    getButtonImage: function () {return 'images/bucketview.png';},
    getButtonImageSelected: function () {return 'images/bucketviewSelected.png';},
    getViewName: function () {return "Bucket View";},
    setTilePositions: function (rowscols, offsetX, offsetY, initTiles, keepColsRows) {
        var columns = (keepColsRows && this.rowscols)  ? this.rowscols.Columns : rowscols.Columns;
        if (!keepColsRows) this.rowscols = rowscols;

        var startx = [];
        var starty = [];

        // Clear all tile locations greater than 1
        for (var l = 0; l < this.tiles.length; l++) {
            this.tiles[l].firstFilterItemDone = false;
            this.tiles[l]._locations = [this.tiles[l]._locations[0]];
        }

        for (var b = 0; b < this.buckets.length; b++) {
            var bucket = this.buckets[b], currentColumn = 0, currentRow = 0;

            for (var i = 0; i < bucket.tiles.length; i++) {

                var tile = bucket.tiles[i];

                if (!tile.firstFilterItemDone) {
                    if (initTiles) {
                        tile._locations[0].startx = tile._locations[0].x;
                        tile._locations[0].starty = tile._locations[0].y;
                        tile.startwidth = tile.width;
                        tile.startheight = tile.height;
                    }

                    tile.destinationwidth = rowscols.TileMaxWidth;
                    tile.destinationheight = rowscols.TileHeight;
                    tile._locations[0].destinationx = (b * this.columnWidth) + (currentColumn * rowscols.TileMaxWidth) + offsetX;
                    tile._locations[0].destinationy = this.canvasHeightUIAdjusted - rowscols.TileHeight - (currentRow * rowscols.TileHeight) + offsetY;
                    tile.start = PivotViewer.Utils.now();
                    tile.end = tile.start + 1000;
                    tile.firstFilterItemDone = true;
                }
                else {
                    tileLocation = new PivotViewer.Views.TileLocation();
                    tileLocation.startx = tile._locations[0].startx;
                    tileLocation.starty = tile._locations[0].starty;
                    tileLocation.x = tile._locations[0].x;
                    tileLocation.y = tile._locations[0].y;
                    tileLocation.destinationx = (b * this.columnWidth) + (currentColumn * rowscols.TileMaxWidth) + offsetX;
                    tileLocation.destinationy = this.canvasHeightUIAdjusted - rowscols.TileHeight - (currentRow * rowscols.TileHeight) + offsetY;
                    tile._locations.push(tileLocation);
                }
                if (currentColumn == columns - 1) {
                    currentColumn = 0;
                    currentRow++;
                }
                else currentColumn++;
            }
        }
    },
    bucketize: function (filterList, sortCategory, maxBuckets) {
        if (maxBuckets == undefined) maxBuckets = 10;
        var category = PivotCollection.getCategoryByName(sortCategory);

        if ($(".pv-facet[facet='" + PV.cleanName(sortCategory).toLowerCase() + "']").attr("mode") == "db") {
            var buckets = DB.getBuckets(sortCategory);
            PivotViewer.Utils.fillBuckets(buckets, filterList, sortCategory);
            return buckets;
        }

        if (filterList[0].item.getFacetByName(sortCategory) == undefined) {
            var bkt = new PivotViewer.Models.Bucket("(no info)", "(no info)");
            bkt.addTile(filterList[0]);
            return bkt;
        }
        var min = filterList[0].item.getFacetByName(sortCategory).values[0].value;
        for (var i = filterList.length - 1; i > 0; i--) {
            if (filterList[i].item.getFacetByName(sortCategory) != undefined) break;
        }
        var max = filterList[i].item.getFacetByName(sortCategory).values[0].value;

        if (category.isDateTime()) {
            min = new Date(min); max = new Date(max);
            return PivotViewer.Utils.getBuckets(filterList, sortCategory, PivotViewer.Utils.getTimeValueFn(min, max), PivotViewer.Utils.getTimeLabelFn(min, max));
        }
        else if (category.isNumber()) {
            var bkts = [];
            bkts.ids = [];
            //Total range is proportional to the next highest power of ten.
            var delta = max - min, bucketSize, base, numBuckets;
            if (delta == 0) { bucketSize = 1; base = min; numBuckets = 1;}
            else {
                bucketSize = Math.pow(10, Math.ceil(Math.log(delta) / Math.log(10)) - 1);
                if (category.integer && bucketSize <= 1) bucketSize = 1;
                else if (delta <= (bucketSize * 5)) bucketSize /= 2;

                base = Math.floor(min / bucketSize) * bucketSize, numBuckets = Math.floor((max - base) / bucketSize) + 1;

                if (numBuckets > maxBuckets) { bucketSize *= 2; numBuckets = Math.ceil(numBuckets / 2);}
            }

            for (var i = 0; i < numBuckets; i++) {
                var start = i * bucketSize + base;
                var end = start + bucketSize;
                bkts[i] = new PivotViewer.Models.Bucket(start, start, start.toString(), end.toString());
            }
            var i = 0;
            for (; i < filterList.length; i++) {
                var item = filterList[i].item;
                var facet = item.getFacetByName(sortCategory);
                if (facet == undefined) break;
                for (var j = 0; j < facet.values.length; j++) {
                    var value = facet.values[j].value, bktNum = Math.floor((value - base) / bucketSize);
                    var bkt = bkts[bktNum];
                    bkt.addTile(filterList[i]);
                    bkts.ids[item.id] = bktNum;
                    if (bkt.endRange < value) bkt.endRange = value;
                }
            }

            var epsilon = bucketSize;
            for (var b = 0; b < bkts.length; b++) {
                var bkt = bkts[b], newEp = bkt.startRange + bucketSize - bkt.endRange;
                if (newEp < epsilon) epsilon = newEp;
            }
            epsilon = Math.pow(10, Math.floor(Math.log(epsilon) / Math.log(10))); bucketSize = bucketSize - (epsilon > 1 ? 1 : epsilon);
            for (var b = 0; b < bkts.length; b++) bkts[b].endLabel = (bkts[b].startRange + bucketSize).toString();

            var empty = 0;
            for (var b = 0; b < bkts.length; b++) {
                if (bkts[b].tiles.length == 0) empty++;
            }
            if (empty >= Math.floor(bkts.length / 2)) {
                var newBkts = []; newBkts.ids = [];
                for (var b = 0; b < bkts.length >> 1; b++) {
                    var bkt1 = bkts[2 * b], bkt2 = bkts[2 * b + 1];
                    newBkts.push(bkt1);
                    Array.prototype.push.apply(bkt1.tiles, bkt2.tiles);
                    for (var key in bkt1.ids) newBkts.ids[key] = b;
                    for (var key in bkt2.ids) {
                        bkt1.ids[key] = true;
                        newBkts.ids[key] = b;
                    }
                    bkt1.endRange = bkt2.endRange; bkt1.endLabel = bkt2.endLabel;
                }
                var c = 2 * b;
                if (c < bkts.length) {
                    var bkt = bkts[c];
                    newBkts.push(bkt);
                    for (var key in bkt.ids) newBkts.ids[key] = b;
                }
                bkts = newBkts;
            }

            if (i != filterList.length && Settings.showMissing) {
                bkts.push(new PivotViewer.Models.Bucket("(no info)", "(no info)"));
                var bktNum = bkts.length - 1, bkt = bkts[bktNum];
                for (; i < filterList.length; i++) {
                    bkt.addTile(filterList[i]);
                    bkts.ids[filterList[i].item.id] = bktNum;
                }
            }
            return bkts;
        }
        else return PivotViewer.Utils.getBuckets(filterList, sortCategory);
        //Got rid of multiple values for now
    },
    centerOnTile: function (tile) {
        var item = tile.item, location = tile._locations[0];
        var tileMaxWidth = this.rowscols.TileMaxWidth, padding = this.rowscols.PaddingX;
        var bucket = this.buckets.ids[item.id], bucketCols = this.rowscols.Columns;
        var bucketCol = Math.round(((location.x - this.currentOffsetX) - (bucket * (bucketCols * tileMaxWidth + padding))) / tileMaxWidth);
        var col = (bucket * bucketCols) + bucketCol;
        var row = Math.round((this.canvasHeightUIAdjusted - (location.y - this.currentOffsetY)) / tile.height) - 1;

        var canvasHeight = tile.context.canvas.height;
        var canvasWidth = tile.context.canvas.width - ($('.pv-filterpanel').width() + $('.pv-infopanel').width());

        // Find which is proportionally bigger, height or width
        var origProportion;
        if (tile.height / canvasHeight > (tile.height / TileController._imageController.getRatio(item.img)) / canvasWidth)
            origProportion = tile.origheight / canvasHeight;
        else origProportion = tile.origwidth / canvasWidth;
        if (this.selected == null) PV.zoom(Math.round((0.75 / origProportion) * 2));
        var padding = this.rowscols.PaddingX * bucket;
        this.currentOffsetX = (this.width / 2) - (this.rowscols.TileMaxWidth * col) - (this.rowscols.TileMaxWidth / 2) - padding;
        this.currentOffsetY = this.height / 2 - this.canvasHeightUIAdjusted + this.rowscols.TileHeight / 2 + row * this.rowscols.TileHeight;
        this.setTilePositions(this.rowscols, this.currentOffsetX, this.currentOffsetY, true, true);
    },
    handleHover: function (evt) {
        this.super_handleHover(evt);
        $(".pv-tooltip").remove();
        $(".pv-bucketview-overlay-bucket").removeClass("bucketview-bucket-hover");
        var bktNum = this.getBucket(evt.x);
        if (bktNum >= 0) {
            var bucketDiv = $("#pv-bucketview-overlay-bucket-" + bktNum);
            bucketDiv.addClass("bucketview-bucket-hover");
        }
        else return;

        if (this.scale > 1) return;
        var box = $(".pv-bucketview-overlay-buckettitle").eq(bktNum), offset = box.offset();
        if (evt.x >= offset.left && evt.x <= (offset.left + box.width()) &&
            evt.y <= offset.top && evt.y >= (offset.top - box.height())) {
            var bkt = this.buckets[bktNum], string = PivotCollection.getCategoryByName(this.sortCategory).type == PivotViewer.Models.FacetType.String;
            var infoButton = (ruleNums == 1 || ruleNums == 2 || ruleNums == 3);
            cIndex = locateBucket(bkt.startRange);
            var tooltip = "<div class='pv-tooltip'>" + this.sortCategory + " Bucket " + (bktNum + 1) + ":<br>"+
                (bkt.startLabel == bkt.endLabel ? " Value: " +
                (string ? "\"" : "") + bkt.startLabel + (string ? "\"" : "") +
                "; " : "Values: from " + (string ? "\"" : "") + bkt.startLabel + (string ? "\"" : "") + "  to " + (string ? "\"" : "") + bkt.endLabel +
                (string ? "\"" : "") + "; ") + bkt.tiles.length + " of " + this.filterList.length +
                " items (" + Math.round(bkt.tiles.length / this.filterList.length * 100) + "%)           " +
                (A[0]!=undefined ? "<br><i>Without filter(s): "+Cs[cIndex].length+" of "+ PivotCollection.items.length+
                " items (" + Math.round(Cs[cIndex].length / PivotCollection.items.length * 100) + "%)</i> " : "");
            if(A[0]!=undefined){
              var ratioDiff = Math.round(bkt.tiles.length / this.filterList.length * 100)-Math.round(Cs[cIndex].length / PivotCollection.items.length * 100);
              if(ratioDiff > 10){
                tooltip += '<br><i><font color="red">Contribution of filter(s): '+ratioDiff+'%</font></i>';
              }else if(ratioDiff < -10){
                tooltip += '<br><i><font color="blue">Contribution of filter(s): '+ratioDiff+'%</font></i>';
              }else{
                tooltip += '<br><i><font color="green">Contribution of filter(s): '+ratioDiff+'%</font></i>';
              }
            }
            tooltip += (infoButton ? "<button type = 'button' id='pv-rule-info' >more info</button>" : "");
            tooltip = tooltip + (Settings.showMissing ? "</div>" : "<br><i>(Some items may be missing values for this variable.)</i></div>");
            $(".pv-viewpanel").append(tooltip);
            $(".pv-tooltip").offset({ left: offset.left, top: offset.top - box.height() + $(".pv-canvas").offset().top + 10})
        }

    },
    handleClick: function (evt) {
        if (this.hasSubsets() && !PV.subsets.finalized) { PV.subsets.finalized = true; PV.filterViews(); return; }
        var tile = this._super(evt);
        if (this.selected != null) this.selected.setSelected(false);
        if (tile != null) {
            if (this.selected != tile) {
                tile.setSelected(true);
                this.centerOnTile(tile);
                this.setSelected(tile);
                $('.pv-bucketview-overlay div').fadeOut('slow');
            }
            else {
                tile = null;
                this.setSelected(null);
                PV.zoom(0);
                $('.pv-bucketview-overlay div').fadeIn('slow');
            }
        }
        else {
            this.setSelected(null);
            PV.zoom(0);
            $('.pv-bucketview-overlay div').fadeIn('slow');
            var bktNum = this.getBucket(evt.x);
            if (bktNum >= 0 && bktNum < this.buckets.length) {
                var bkt = this.buckets[bktNum];
                $.publish("/PivotViewer/Views/Item/Filtered", [{ category: this.sortCategory, min: bkt.startRange, max: bkt.endRange, values: bkt.values, clearFilters: true }]);
            }
        }
        $.publish("/PivotViewer/Views/Item/Selected", [{item: tile}]);
    },
    handleContextMenu: function (evt) {
        if (PV.subsets.finalized) return;
        var bktNum = this.getBucket(evt.x), bkt = $("#pv-bucketview-overlay-bucket-" + bktNum);
        if (this.addSubset(this.buckets[bktNum])) bkt.addClass("pv-bucketview-subset");
        else bkt.removeClass("pv-bucketview-subset");
    },
    addSubset: function (bkt) {
        if (bkt.tiles.length == 0) return false;
        PV.subsets.finalized = false;
        var subset = this.getSubset(bkt.tiles[0].item.id);
        if (subset != -1) {
            if (subset == 0) PV.subsets[0] = PV.subsets[1];
            PV.subsets[1] = null;
            if (PV.subsets[0] == null) this.clearSubsets();
            return false;
        }
        else {
            if (PV.subsets[1] != null) return false;
            if (PV.subsets[0] == null) {
                $(".pv-filterpanel-clearall").after("<div class='pv-subset-clear'>Subset</div>");
                var that = this;
                $(".pv-subset-clear").css("visibility", "visible").on("click.subset", function () { that.clearSubsets() });
                $(".pv-filterpanel-clearall").css("visibility", "visible").on("click.subset", function () { that.clearSubsets() });
                PV.subsets[0] = bkt;
            }
            else PV.subsets[1] = bkt;
            return true;
        }
    },
    subset: function (filterList, sortCategory) {
        var newFilterList = [];
        for (var i = 0; i < filterList.length; i++) {
            var tile = filterList[i];
            if (PV.subsets[1] == null || this.getSubset(tile.item.id) != -1) newFilterList.push(tile);
        }

        var bkts = this.bucketize(newFilterList, sortCategory, 5), newBkts = []; //bucketize on only those in subset
        newBkts.ids = [];

        for (var i = 0; i < bkts.length; i++) {
            var bkt = bkts[i];
            newBkts[2 * i] = new PivotViewer.Models.Bucket(bkt.startRange, bkt.startLabel, bkt.endRange, bkt.endLabel);
            newBkts[2 * i + 1] = new PivotViewer.Models.Bucket(bkt.startRange, bkt.startLabel, bkt.endRange, bkt.endLabel);
            for (var j = 0; j < bkt.tiles.length; j++) {
                var tile = bkt.tiles[j], id = tile.item.id, k = 2 * i + (PV.subsets[0].ids[id] ? 0 : 1);
                newBkts[k].addTile(tile);
                newBkts.ids[id] = k;
            }
            for (var j = 0; j < bkt.values.length; j++) { newBkts[k].addValue(bkt.values[j]);}
        }

        return newBkts;
    },
    getSubset: function (id) { return PV.subsets[0] == null ? -1: PV.subsets[0].ids[id] ? 0 : PV.subsets[1] != null && PV.subsets[1].ids[id] ? 1 : -1; },
    hasSubsets: function () { return PV.subsets[0] != null; },
    clearSubsets: function () {
        PV.subsets[0] = PV.subsets[1] = null;
        PV.subsets.finalized = false;
        PV.filterViews();
        $(".pv-subset-clear").remove();
        $(".pv-filterpanel-clearall").off("click.subset");
        if (this.tiles.length == this.filterList.length) $(".pv-filterpanel-clearall").css("visibility", "hidden");
    }
});
