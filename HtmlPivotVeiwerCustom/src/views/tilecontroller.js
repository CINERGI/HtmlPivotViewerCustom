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
            that._tilesById[x.facetItem.Id] = x;
        }
    },
    GetTileById: function (id) {
        var item = this._tilesById[id];
        if (item == undefined) return null;
        return item;
    },
    initTiles: function (pivotCollectionItems, baseCollectionPath, canvasContext) {
        //Set the initial state for the tiles
        for (var i = 0; i < pivotCollectionItems.length; i++) {
            var tile = new PivotViewer.Views.Tile(this._imageController);
            tile.facetItem = pivotCollectionItems[i];
            tile.CollectionRoot = baseCollectionPath.replace(/\\/gi, "/").replace(/\.xml/gi, "");
            this._canvasContext = canvasContext;
            tile.context = this._canvasContext;
            tileLocation = new PivotViewer.Views.TileLocation();
            tile._locations.push(tileLocation);
            this._tiles.push(tile);
        }
        return this._tiles;
    },

    AnimateTiles: function () {
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
                    this._tiles[i].Draw(l);
                }
            }
        }

        // request new frame
        if (!this._breaks) requestAnimFrame(function () {that.AnimateTiles();});
        else this._started = false;
    },

    BeginAnimation: function () {
        if (!this._started && this._tiles.length > 0) {
            this._breaks = false;
            this.AnimateTiles();
        }
    },
    StopAnimation: function () {this._breaks = true;},
    SetLinearEasingBoth: function () {
        this._easing = new Easing.Easer({ type: "linear", side: "both" });
    },
    SetCircularEasingBoth: function () {
        this._easing = new Easing.Easer({ type: "circular", side: "both" });
    },
    SetQuarticEasingOut: function () {
        this._easing = new Easing.Easer({ type: "quartic", side: "out" });
    },
    GetMaxTileRatio: function () {return this._imageController.MaxRatio;}
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

    IsSelected: function () {
       return this._selected;
    },

    Draw: function (loc) {
        //Is the tile destination in visible area?
        if (this.destinationVisible) {
            this._images = TileController._imageController.GetImages(this.facetItem.Img, this.width, this.height);
        }

        if (this._images != null) {
            if (typeof this._images == "function") {
                //A DrawLevel function returned - invoke
                this._images(this.facetItem, this.context, this._locations[loc].x + 4, this._locations[loc].y + 4, this.width - 8, this.height - 8);
            }

            else if (this._images.length > 0 && this._images[0] instanceof Image) {
                //if the collection contains an image
                var completeImageHeight = TileController._imageController.GetHeight(this.facetItem.Img);
                var displayHeight = this.height - Math.ceil(this.height < 128 ? this.height / 16 : 8);
                var displayWidth = Math.ceil(TileController._imageController.GetWidthForImage(this.facetItem.Img, displayHeight));
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
                        var levelHeight = Math.ceil(completeImageHeight / Math.pow(2, TileController._imageController.GetMaxLevel(this.facetItem.Img) - imageLevel));
            
                        //Image will need to be scaled to get the displayHeight
                        var scale = displayHeight / levelHeight;
                    
                        // handle overlap 
                        overlap = TileController._imageController.GetOverlap(this.facetItem.Img);
            
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
            this.DrawEmpty(loc);
        }
    },
    //http://simonsarris.com/blog/510-making-html5-canvas-useful
    Contains: function (mx, my) {
        for (i = 0; i < this._locations.length; i++) {
            if ((this._locations[i].x <= mx) && (this._locations[i].x + this.width >= mx) &&
                (this._locations[i].y <= my) && (this._locations[i].y + this.height >= my))
                return i;
        }
        return -1;
    },
    DrawEmpty: function (loc) {
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
            TileController._imageController.DrawLevel(this.facetItem, this.context, this._locations[loc].x + 4, this._locations[loc].y + 4, this.width - 8, this.height - 8);
        }
    },
    CollectionRoot: "",
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
    facetItem: null,
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
