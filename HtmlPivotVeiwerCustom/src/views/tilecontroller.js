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

///
/// Tile Controller
/// used to create the initial tiles and their animation based on the locations set in the views
///
PivotViewer.Views.TileController = Object.subClass({
    init: function (ImageController) {
        this._tiles = [];
        this._tilesById = [];
        this._easing = new Easing.Easer({ type: "circular", side: "both" });
        this._imageController = ImageController;

        var that = this;
        this._tiles.push = function (x) {
            this.__proto__.push.apply(that._tiles, [x]);
            that._tilesById[x.item.id] = x;
        }
    },
    getTileById: function (id) {
        var item = this._tilesById[id];
        if (item == undefined) return null;
        return item;
    },
    initTiles: function (pivotCollectionItems, baseCollectionPath, canvasContext) {
        //Set the initial state for the tiles
        for (var i = 0; i < pivotCollectionItems.length; i++) {
            var tile = new PivotViewer.Views.Tile(this._imageController);
            tile.item = pivotCollectionItems[i];
            this._canvasContext = canvasContext;
            tile.context = this._canvasContext;
            tileLocation = new PivotViewer.Views.TileLocation();
            tile._locations.push(tileLocation);
            this._tiles.push(tile);
        }
        return this._tiles;
    },

    animateTiles: function () {
        var that = this;
        this._started = true;
        var context = null;

        if (this._tiles.length > 0 && this._tiles[0].context != null) {
            context = this._tiles[0].context;
            var isZooming = false;
            //Set tile properties
            for (var i = 0; i < this._tiles.length; i++) {
                //for each tile location...
                for (l = 0; l < this._tiles[i]._locations.length; l++) {
                    var now = PivotViewer.Utils.now() - this._tiles[i].start,
                    end = this._tiles[i].end - this._tiles[i].start;
                    //use the easing function to determine the next position
                    if (now <= end) {
 
                        //if the position is different from the destination position then zooming is happening
                        if (this._tiles[i]._locations[l].x != this._tiles[i]._locations[l].destinationx || this._tiles[i]._locations[l].y != this._tiles[i]._locations[l].destinationy)
                            isZooming = true;
 
                        this._tiles[i]._locations[l].x = this._easing.ease(
                            now, 										// curr time
                            this._tiles[i]._locations[l].startx,                                                       // start position
                            this._tiles[i]._locations[l].destinationx - this._tiles[i]._locations[l].startx, // relative end position
                            end											// end time
                        );
 
                        this._tiles[i]._locations[l].y = this._easing.ease(
                           now,
                           this._tiles[i]._locations[l].starty,
                           this._tiles[i]._locations[l].destinationy - this._tiles[i]._locations[l].starty,
                           end
                        );
 
                        //if the width/height is different from the destination width/height then zooming is happening
                        if (this._tiles[i].width != this._tiles[i].destinationWidth || this._tiles[i].height != this._tiles[i].destinationHeight)
                            isZooming = true;

                        this._tiles[i].width = this._easing.ease(
                            now,
                            this._tiles[i].startwidth,
                            this._tiles[i].destinationwidth - this._tiles[i].startwidth,
                            end
                        );
 
                        this._tiles[i].height = this._easing.ease(
                           now,
                           this._tiles[i].startheight,
                           this._tiles[i].destinationheight - this._tiles[i].startheight,
                           end
                        );
                    }
                    else {
                        this._tiles[i]._locations[l].x = this._tiles[i]._locations[l].destinationx;
                        this._tiles[i]._locations[l].y = this._tiles[i]._locations[l].destinationy;
                        this._tiles[i].width = this._tiles[i].destinationwidth;
                        this._tiles[i].height = this._tiles[i].destinationheight;
                        // if now and end are numbers when we get here then the animation 
                        // has finished
                    }
 
                    //check if the destination will be in the visible area
                    if (this._tiles[i]._locations[l].destinationx + this._tiles[i].destinationwidth < 0 ||
                        this._tiles[i]._locations[l].destinationx > context.canvas.width ||
                        this._tiles[i]._locations[l].destinationy + this._tiles[i].destinationheight < 0 ||
                        this._tiles[i]._locations[l].destinationy > context.canvas.height)
                        this._tiles[i].destinationVisible = false;
                    else this._tiles[i].destinationVisible = true;
                }
            }
        }

        //fire zoom event
        if (this._isZooming != isZooming) {
            this._isZooming = isZooming;
            $.publish("/PivotViewer/ImageController/Zoom", [this._isZooming]);
        }

        //Clear drawing area
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        //once properties set then draw
        for (var i = 0; i < this._tiles.length; i++) {
            //only draw if in visible area
            for (var l = 0; l < this._tiles[i]._locations.length; l++) {
                if (this._tiles[i]._locations[l].x + this._tiles[i].width > 0 &&
                    this._tiles[i]._locations[l].x < context.canvas.width &&
                    this._tiles[i]._locations[l].y + this._tiles[i].height > 0 &&
                    this._tiles[i]._locations[l].y < context.canvas.height) {
                    this._tiles[i].draw(l);
                }
            }
        }

        // request new frame
        if (!this._breaks) requestAnimFrame(function () {that.animateTiles();});
        else this._started = false;
    },

    beginAnimation: function () {
        if (!this._started && this._tiles.length > 0) {
            this._breaks = false;
            this.animateTiles();
        }
    },
    stopAnimation: function () {this._breaks = true;},
    setLinearEasingBoth: function () {
        this._easing = new Easing.Easer({ type: "linear", side: "both" });
    },
    setCircularEasingBoth: function () {
        this._easing = new Easing.Easer({ type: "circular", side: "both" });
    },
    setQuarticEasingOut: function () {
        this._easing = new Easing.Easer({ type: "quartic", side: "out" });
    },
    getMaxTileRatio: function () {return this._imageController.MaxRatio;}
});

///
/// Tile
/// Used to contain the details of an individual tile, and to draw the tile on a given canvas context
///
PivotViewer.Views.Tile = Object.subClass({
    init: function (TileController) {
        if (!(this instanceof PivotViewer.Views.Tile)) {
            return new PivotViewer.Views.Tile(TileController);
        }
        this._imageLoaded = false;
        this._selected = false;
        this._images = null;
        this._locations = [];
        this._visible = true;
    },

    draw: function (loc) {
        //Is the tile destination in visible area?
        if (this.destinationVisible) {
            this._images = TileController._imageController.getImages(this.item.img, this.width, this.height);
        }

        if (this._images != null) {
            if (typeof this._images == "function") {
                //A DrawLevel function returned - invoke
                this._images(this.item, this.context, this._locations[loc].x + 4, this._locations[loc].y + 4, this.width - 8, this.height - 8);
            }

            else if (this._images.length > 0 && this._images[0] instanceof Image) {
                //if the collection contains an image
                var completeImageHeight = TileController._imageController.getHeight(this.item.img);
                var displayHeight = this.height - Math.ceil(this.height < 128 ? this.height / 16 : 8);
                var displayWidth = Math.ceil(TileController._imageController.getWidthForImage(this.item.img, displayHeight));
                //Narrower images need to be centered 
                blankWidth = (this.width - 8) - displayWidth;

                // Handle displaying the deepzoom image tiles (move to deepzoom.js)
                if (TileController._imageController instanceof PivotViewer.Views.DeepZoomImageController) {
                    for (var i = 0; i < this._images.length; i++) {
                        // We need to know where individual image tiles go
                        var source = this._images[i].src;
                        var tileSize = TileController._imageController._tileSize;
                        var n = source.match(/[0-9]+_[0-9]+/g);
                        var xPosition = parseInt(n[n.length - 1].substring(0, n[n.length - 1].indexOf("_")));
                        var yPosition = parseInt(n[n.length - 1].substring(n[n.length - 1].indexOf("_") + 1));
            
                        //Get image level
                        n = source.match (/_files\/[0-9]+\//g);
                        var imageLevel = parseInt(n[0].substring(7, n[0].length - 1));
                        var levelHeight = Math.ceil(completeImageHeight / Math.pow(2, TileController._imageController.getMaxLevel(this.item.img) - imageLevel));
            
                        //Image will need to be scaled to get the displayHeight
                        var scale = displayHeight / levelHeight;
                    
                        // handle overlap 
                        overlap = TileController._imageController.getOverlap(this.item.img);
            
                        var offsetx = (Math.floor(blankWidth/2)) + 4 + xPosition * Math.floor((tileSize - overlap)  * scale);
                        var offsety = 4 + Math.floor((yPosition * (tileSize - overlap)  * scale));
            
                        var imageTileHeight = Math.ceil(this._images[i].height * scale);
                        var imageTileWidth = Math.ceil(this._images[i].width * scale);
                        this.context.drawImage(this._images[i], offsetx + this._locations[loc].x , offsety + this._locations[loc].y, imageTileWidth, imageTileHeight);
                    }
                }
                else {
                    var offsetx = (Math.floor(blankWidth/2)) + 4;
                    var offsety = 4;
                    this.context.drawImage(this._images[0], offsetx + this._locations[loc].x , offsety + this._locations[loc].y, displayWidth, displayHeight);
                }
                
                if (this._selected) {
                    //draw a blue border
                    this.context.beginPath();
                    var offsetx = (Math.floor(blankWidth/2)) + 4;
                    var offsety = 4;
                    this.context.rect(offsetx + this._locations[this.selectedLoc].x , offsety + this._locations[this.selectedLoc].y, displayWidth, displayHeight);
                    this.context.lineWidth = 4;
                    this.context.strokeStyle = "#92C4E1";
                    this.context.stroke();
                }
            }
        }
        else {
            this.drawEmpty(loc);
        }
    },
    //http://simonsarris.com/blog/510-making-html5-canvas-useful
    contains: function (mx, my) {
        for (i = 0; i < this._locations.length; i++) {
            if ((this._locations[i].x <= mx) && (this._locations[i].x + this.width >= mx) &&
                (this._locations[i].y <= my) && (this._locations[i].y + this.height >= my))
                return i;
        }
        return -1;
    },
    drawEmpty: function (loc) {
        if (TileController._imageController.DrawLevel == undefined) {
            //draw an empty square
            this.context.beginPath();
            this.context.fillStyle = "#D7DDDD";
            this.context.fillRect(this._locations[loc].x + 4, this._locations[loc].y + 4, this.width - 8, this.height - 8);
            this.context.rect(this._locations[loc].x + 4, this._locations[loc].y + 4, this.width - 8, this.height - 8);
            this.context.lineWidth = 1;
            this.context.strokeStyle = "white";
            this.context.stroke();
        } else {
            //use the controllers blank tile
            TileController._imageController.DrawLevel(this.item, this.context, this._locations[loc].x + 4, this._locations[loc].y + 4, this.width - 8, this.height - 8);
        }
    },
    now: null,
    end: null,
    width: 0,
    height: 0,
    origwidth: 0,
    origheight: 0,
    ratio: 1,
    startwidth: 0,
    startheight: 0,
    destinationwidth: 0,
    destinationheight: 0,
    destinationVisible: true,
    context: null,
    item: null,
    firstFilterItemDone: false,
    selectedLoc: 0,
    Selected: function (selected) { this._selected = selected }
});
///
/// Tile Location
/// Used to contain the location of a tile as in the graph view a tile can appear multiple times
///
PivotViewer.Views.TileLocation = Object.subClass({
    init: function () {},
    x: 0,
    y: 0,
    startx: 0,
    starty: 0,
    destinationx: 0,
    destinationy: 0,
});
