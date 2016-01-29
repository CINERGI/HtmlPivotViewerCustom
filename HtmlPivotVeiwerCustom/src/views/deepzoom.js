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
/// Deep Zoom Image Getter
/// Retrieves and caches images
///
PivotViewer.Views.DeepZoomImageController = PivotViewer.Views.IImageController.subClass({
    init: function () {
        this._items = [];
        this._itemsById = [];
        this._collageItems = [];
        this.baseUrl = "";
        this._collageMaxLevel = 0;
        this._tileSize = 256;
        this._format = "";
        this._ratio = 1;
        this.MaxRatio = 0;

        this._dziQueue = [];
        this._zooming = false;
        var that = this;

        //Events
        $.subscribe("/PivotViewer/ImageController/Zoom", function (evt) {
            that._zooming = evt;
        });
    },
    setup: function (deepzoomCollection) {
        //get base URL
        this.baseUrl = deepzoomCollection.substring(0, deepzoomCollection.lastIndexOf("/"));
        this._collageUrl = deepzoomCollection.substring(deepzoomCollection.lastIndexOf("/") + 1).replace('.xml', '_files');
        var that = this;
        //load dzi and start creating array of id's and DeepZoomLevels
        $.ajax({
            type: "GET",
            url: deepzoomCollection,
            dataType: "xml",
            success: function (xml) {
                var collection = $(xml).find("Collection");
                that._tileSize = $(collection).attr("TileSize");
                that._format = $(collection).attr('Format');
                that._collageMaxLevel = $(collection).attr('MaxLevel');

                var items = $(xml).find("I");
                if (items.length == 0) {
                    $('.pv-loading').remove();

                    //Throw an alert so the user knows something is wrong
                    var msg = 'No items in the DeepZoom Collection<br><br>';
                    msg += 'URL        : ' + this.url + '<br>';
                    msg += '<br>Pivot Viewer cannot continue until this problem is resolved<br>';
                    $('.pv-wrapper').append("<div id=\"pv-dzloading-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
                    setTimeout(function(){window.open("#pv-dzloading-error","_self")},1000)
                    return;
                }
                
                //If collection itself contains size information, use first one for now
                var dzcSize = $(items[0]).find('Size');
                if (dzcSize.length > 0) {
                    //calculate max level
                    that.MaxWidth = parseInt(dzcSize.attr("Width"));
                    // Use height of first image for now...
                    that.Height = parseInt(dzcSize.attr("Height"));
                    that.MaxRatio = that.Height/that.MaxWidth;

                    for ( i = 0; i < items.length; i++ ) {
                        itemSize = $(items[i]).find("Size");
                        var width = parseInt(itemSize.attr("Width"));
                        var height = parseInt(itemSize.attr("Height"));
                        var maxDim = width > height ? width : height;
                        var maxLevel = Math.ceil(Math.log(maxDim) / Math.log(2));

                        that._ratio = height / width;
                        var dziSource = $(items[i]).attr('Source');
                        var itemId = $(items[i]).attr('Id');
                        var dzN = $(items[i]).attr('N');
                        var dzId = dziSource.substring(dziSource.lastIndexOf("/") + 1).replace(/\.xml/gi, "").replace(/\.dzi/gi, "");
                        var basePath = dziSource.substring(0, dziSource.lastIndexOf("/"));
                        if (basePath.length > 0) basePath = basePath + '/';
                        if (width > that.MaxWidth) that.MaxWidth = width;
                        if (that._ratio > that.MaxRatio) that.MaxRatio = that._ratio;

                        var dzi = new PivotViewer.Views.DeepZoomItem(itemId, dzId, dzN, basePath, that._ratio, width, height, maxLevel, that.baseUrl, dziSource);
                        that._items.push(dzi);
                        that._itemsById[itemId] = dzi;
                    }
                }
                //Loaded DeepZoom collection
                $.publish("/PivotViewer/ImageController/Collection/Loaded", null);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                //Make sure throbber is removed else everyone thinks the app is still running
                $('.pv-loading').remove();

                //Throw an alert so the user knows something is wrong
                var msg = 'Error loading from DeepZoom Cache<br><br>';
                msg += 'URL        : ' + this.url + '<br>';
                msg += 'Status : ' + jqXHR.status + ' ' + errorThrown + '<br>';
                msg += 'Details    : ' + jqXHR.responseText + '<br>';
                msg += '<br>Pivot Viewer cannot continue until this problem is resolved<br>';
                $('.pv-wrapper').append("<div id=\"pv-dzloading-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
                setTimeout(function(){window.open("#pv-dzloading-error","_self")},1000)
            }
        });
    },

    getImages: function (id, width, height) {
        var level = Math.ceil(Math.log(width > height ? width : height) / Math.log(2));
        if (level == Infinity || level == -Infinity) level = 0;
        return this.getImagesAtLevel(id, level);
    },

    getImagesAtLevel: function (id, level) {
        level = (level <= 0 ? 6 : level);

        var item = this._itemsById[id];
        level = (level > item.MaxLevel ? item.MaxLevel : level);

        //to work out collage image
        //convert image n to base 2
        //convert to array and put even and odd bits into a string
        //convert strings to base 10 - this represents the tile row and col
        var baseTwo = item.DZN.toString(2);
        var even = "", odd = "";
        for (var b = 0; b < baseTwo.length; b++) {
            if (b % 2 == 0) even += baseTwo[b];
            else odd += baseTwo[b];
        }
        dzCol = parseInt(even, 2);
        dzRow = parseInt(odd, 2);
        //for the zoom level work out the DZ tile where it came from

        if ((item.Levels == undefined || item.Levels.length == 0) && !this._zooming) {
            //create 0 level
            var imageList = this.getImageList(id, this.baseUrl + "/" + item.BasePath + item.DZId + "_files/6/", 6); ; 
            item.Levels.push(new PivotViewer.Views.ImageLevel(imageList));
            return null;
        }
        else if (item.Levels.length < level && !this._zooming) {
            //requested level does not exist, and the Levels list is smaller than the requested level
            var imageList = this.getImageList(id, this.baseUrl + "/" + item.BasePath + item.DZId + "_files/" + level + "/", level);
            item.Levels.splice(level, 0, new PivotViewer.Views.ImageLevel(imageList));
        }

        //get best loaded level to return
        for (var j = level; j > -1; j--) {
            if (item.Levels[j] != undefined && item.Levels[j].IsLoaded()) return item.Levels[j].getImages();

            //if request level has not been requested yet
            if (j == level && item.Levels[j] == undefined && !this._zooming) {
                var imageList = this.getImageList(id, this.baseUrl + "/" + item.BasePath + item.DZId + "_files/" + j + "/", j);
                item.Levels.splice(j, 0, new PivotViewer.Views.ImageLevel(imageList));
            }
        }
        return null;
    },

    getImageList: function (id, basePath, level) {
        var fileNames = [];

        var tileSize = this._tileSize;

        var item = this._itemsById[id];
        var height = item.Height;
        var maxLevel = item.MaxLevel;
        var format = item.Format == null ? this._format : item.Format;

        var levelWidth = Math.ceil((height / item.Ratio) / Math.pow(2, maxLevel - level));
        var levelHeight = Math.ceil(height / Math.pow(2, maxLevel - level));
        //based on the width for this level, get the slices based on the DZ Tile Size
        var hslices = Math.ceil(levelWidth / tileSize);
        var vslices = Math.ceil(levelHeight / tileSize);

        //Construct list of file names based on number of vertical and horizontal images
        for (var i = 0; i < hslices; i++) {
            for (var j = 0; j < vslices; j++) {
                fileNames.push(basePath + i + "_" + j + "." + format);
            }
        }
        return fileNames;
    },

    getWidthForImage: function( id, height ) {return Math.floor(height / this._itemsById[id].Ratio);},
    getMaxLevel: function( id ) {return this._itemsById[id].MaxLevel;},
    getHeight: function (id) {return this._itemsById[id].Height;},
    getOverlap: function (id) {return this._itemsById[id].Overlap;},
    getRatio: function (id) {
        return this._itemsById[id].Ratio;
    }
});

PivotViewer.Views.DeepZoomItem = Object.subClass({
    init: function (ItemId, DZId, DZn, BasePath, Ratio, Width, Height, MaxLevel, baseUrl, dziSource) {
        this.ItemId = ItemId,
        this.DZId = DZId,
        this.DZN = parseInt(DZn),
        this.BasePath = BasePath,
        this.Levels = [];                  
        this.Ratio = Ratio;  
        this.Width = Width;
        this.Height = Height;
        this.MaxLevel = MaxLevel;
        var that = this;

        var dziQueue = TileController._imageController._dziQueue[DZId];
        if (dziQueue == undefined) {
            dziQueue = TileController._imageController._dziQueue[DZId] = [];
            dziQueue.push(this);
            $.ajax({
                type: "GET",
                url: baseUrl + "/" + dziSource,
                dataType: "xml",
                success: function (dzixml) {
                    //In case we find a dzi, recalculate sizes
                    var image = $(dzixml).find("Image");
                    if (image.length == 0) return;

                    var jImage = $(image[0]);
                    //that.Overlap = jImage.attr("Overlap");
                    //that.Format = jImage.attr("Format");
                    var overlap = jImage.attr("Overlap");
                    var format = jImage.attr("Format");
                    for (var i = 0; i < dziQueue.length; i++) {
                        var item = dziQueue[i];
                        item.Overlap = overlap; item.Format = format;
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    that.Overlap = 0;
                }
            });
        }
        else dziQueue.push(this);
    }
});

PivotViewer.Views.ImageLevel = Object.subClass({
    init: function (images) {
        this._images = [],
        this._loaded = false;
        var that = this;
        for (var i = 0; i < images.length; i++) {
            var img = new Image();
            img.src = images[i];
            img.onload = function () {
                that._loaded = true;
            };
            this._images.push(img);
        }
    },
    getImages: function () { return this._images; },
    IsLoaded: function () { return this._loaded; }
});
