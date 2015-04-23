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
PivotViewer.Views.TextImageController = PivotViewer.Views.IImageController.subClass({
    init: function (baseUrl) {

        this._items = [];
        this._collageItems = [];
        this._baseUrl = baseUrl;
        this._collageMaxLevel = 0;
        this._tileSize = 256;
        this._format = "";
        this._ratio = 1;
        this.MaxRatio = 1;
        this._loadedCount = 0;
        this._loadedPublishCalled = false;

        this._zooming = false;
        var that = this;

        //Events
        $.subscribe("/PivotViewer/ImageController/Zoom", function (evt) {
            that._zooming = evt;
        });
    },
    Setup: function (baseUrl) {
        //get base URL
        this._baseUrl = baseUrl;
        var that = this;

        // get list of image files
        $.getJSON(baseUrl + "/imagelist.json")
            .done(function (images) {
                // for each item in the collection get the image filename
                for (var i = 0; i < images.ImageFiles.length; i++) {
                    var img = new Image();
                    img.onload = function (e) {
                        for (var i = 0; i < that._items.length; i++) {
                            if (that._items[i].Images[0] == this) {
                                that._items[i].Width = this.width;
                                that._items[i].Height = this.height;
                                that._loadedCount++;
                            }

                            if (that._loadedCount == that._items.length && !that._loadedPublishCalled) {
                                $.publish("/PivotViewer/ImageController/Collection/Loaded", null);
                                that._loadedPublishCalled = true;
                            }
                        }

                    }
                    img.src = that._baseUrl + "/" + images.ImageFiles[i];
                    that._items.push(new PivotViewer.Views.SimpleImageItem(images.ImageFiles[i], that._baseUrl, img.width, img.height, img));
                }

            })
            .fail(function (jqxhr, textStatus, errorThrown) {
                //Make sure throbber is removed else everyone thinks the app is still running
                $('.pv-loading').remove();

                //Throw an alert so the user knows something is wrong
                var msg = 'Error loading image files<br><br>';
                msg += 'URL        : ' + this.url + '<br>';
                msg += 'Status : ' + jqXHR.status + ' ' + errorThrown + '<br>';
                msg += 'Details    : ' + jqXHR.responseText + '<br>';
                msg += '<br>Pivot Viewer cannot continue until this problem is resolved<br>';
                $('.pv-wrapper').append("<div id=\"pv-imageloading-error\" class=\"pv-modal-dialog\"><div><a href=\"#pv-modal-dialog-close\" title=\"Close\" class=\"pv-modal-dialog-close\">X</a><h2>HTML5 PivotViewer</h2><p>" + msg + "</p></div></div>");
                setTimeout(function () {
                    window.open("#pv-imageloading-error", "_self")
                }, 1000)
            });
    },

    // Simple images just ignore the level - same image is used whatever the zoom
    //GetImages: function (id, width, height) {
    //    // Only return image if size is big enough
    //  if (width > 8 && height > 8) {
    //    for (var i = 0;  this._items.length; i++){
    //      if (this._items[i].ImageId == id) {
    //        return this._items[i].Images;
    //      }
    //    }
    //  }
    //  return null;
    //},
    GetImages: function (id, width, height) {
        var that = this;
        //Determine level
        var biggest = width > height ? width : height;
        var thisLevel = Math.ceil(Math.log(biggest) / Math.log(2));

        if (thisLevel == Infinity || thisLevel == -Infinity)
            thisLevel = 0;

        //TODO: Look at caching last image to avoid using _controller
        this._level = thisLevel;
        return that.GetImagesAtLevel(id, thisLevel);
    },

    GetWidthForImage: function (id, height) {
        for (var i = 0; i < this._items.length; i++) {
            if (this._items[i].ImageId == id) {
                return Math.floor(height / (this._items[i].Height / this._items[i].Width));
            }
        }
    },
    GetWidth: function (id) {
        for (var i = 0; i < this._items.length; i++) {
            if (this._items[i].ImageId == id) {
                return this._items[i].Width;
            }
        }
    },
    GetHeight: function (id) {
        for (var i = 0; i < this._items.length; i++) {
            if (this._items[i].ImageId == id) {
                return this._items[i].Height;
            }
        }
    },
    GetRatio: function (id) {
        for (var i = 0; i < this._items.length; i++) {
            if (this._items[i].ImageId == id) {
                return this._items[i].Height / this._items[i].Width;
            }
        }
    },
    /*
     from LobsterPot http://lobsterpot.com.au/pivotviewer/extending-the-html5-pivotviewer
     GetImagesAtLevel: function (id, level) {
     return this.DrawLevel;
     },
     DrawLevel: function (facetItem, context, x, y, width, height) {
     context.beginPath();
     context.fillStyle = "Black";
     context.fillRect(x, y, width, height);
     },
     Width: 300,
     Height: 450
     });
     This Image Controller returns a function reference for the GetImagesAtLevel method. When this occurs the function must have the following parameters: facetItem, context, x, y, width and height.

     The DrawLevel function then uses those parameters to draw a black rectangle for each item.

     */
    GetImagesAtLevel: function (id, level) {
        var self = this;
        return function (facetItem, context, x, y, width, height) {


            context.beginPath();
            context.fillStyle = "#0000FF";
            context.fillRect(x, y, width, height);


            if (width > 8 && height > 8) {
                var imgs;
                if (facetItem.Img) {

                    for (var i = 0; i< self._items.length; i++) {
                        if (self._items[i].ImageId == id) {
                            imgs = self._items[i].Images;
                            continue;
                        }
                    }
                }
                if (imgs) {
                    context.drawImage(imgs[0], x, y, width, height);
                }
            }

            // this needs to be recoded to do relative to width and height.
            context.font='1.5em Arial';
            var c = facetItem.Name.substring(0,20);
            var l, a,
                mt = context.measureText(c),
                p = mt.width;
// measure to only draw text at a level
            p < .7 * width && (
                l = x + width / 2, a = y + height / 2,
                    context.strokeStyle = 'blue',
                    context.fillStyle = "rgba(255, 0, 255, 0.30)",
                    context.textBaseline = "middle",
                    context.textAlign = "center",

                    context.strokeText(c, l, a)
            )
            context.closePath();
            w = null;
        }



    }

});

PivotViewer.Views.SimpleImageItem = Object.subClass({
    init: function (ImageId, BasePath, Width, Height, img) {
        this.ImageId = ImageId,
            this.BasePath = BasePath,
            this.Images = [img];
        this.Width = img.width;
        this.Height = img.height;
    }
});
