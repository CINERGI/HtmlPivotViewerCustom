require(["esri/renderers/SimpleRenderer", "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol",
    "esri/layers/ArcGISImageServiceLayer", "esri/layers/GraphicsLayer", "esri/layers/ImageServiceParameters",
    "esri/geometry/Extent", "esri/graphic", "esri/tasks/query", "esri/tasks/QueryTask", "esri/toolbars/draw",
    "esri/Color", "esri/map", "dojo/domReady!"],

    function (n, t, i, r, u, f, e, o, s, h, c, l, a) {
        $(document).ready(function () {
            function v() {
                if (!o.loaded) { $("#container1").hide(); $("#container2").hide(); return }
                var n = o.getLayer("footprints").graphics.length; n == 0 ? ($("#container1").show(),
                    $("#container2").hide()) : ($("#container1").hide(), $("#container2").show())
            } function k(n, t, i) {
                var r = y + "/{0}/image".format(t.toString());
                return r += "?bbox={0},{1},{2},{3}".format(n.geometry.getExtent().xmin.toString(),
                    n.geometry.getExtent().ymin.toString(), n.geometry.getExtent().xmax.toString(),
                    n.geometry.getExtent().ymax.toString()), r += "&size={0},{1}".format(i.toString(), i.toString()),
                    r += "&format={0}".format("jpg"), r += "&noData={0},{1},{2}".format("255", "255", "255"),
                    r += "&interpolation={0}".format("RSP_NearestNeighbor"),
                    r += "&imageSR={0}".format(n.geometry.spatialReference.wkid.toString()),
                    r += "&bboxSR={0}".format(n.geometry.spatialReference.wkid.toString()),
                    r += "&f={0}".format("image"), { url: r, requested: !1, image: null }
            } function ft() {
                var n = o.getLayer("footprints").graphics,
                    t = PivotViewer.Models.Loaders.ICollectionLoader.subClass({
                        init: function (n) { this.graphics = n },
                        LoadCollection: function (n) {
                            n.BrandImage = "content/images/esri-white.jpg";
                            n.FacetCategories.push(new PivotViewer.Models.FacetCategory("Id", "", "String", !1, !0, !0));
                            n.FacetCategories.push(new PivotViewer.Models.FacetCategory("AcquisitionDate", "", "DateTime", !0, !0, !0));
                            n.FacetCategories.push(new PivotViewer.Models.FacetCategory("Name", "", "String", !0, !1, !0));
                            n.FacetCategories.push(new PivotViewer.Models.FacetCategory("SensorName", "", "String", !0, !0, !0));
                            n.FacetCategories.push(new PivotViewer.Models.FacetCategory("SunAzimuth", "", "Number", !0, !0, !0));
                            n.FacetCategories.push(new PivotViewer.Models.FacetCategory("SunElevation", "", "Number", !0, !0, !0));
                            n.FacetCategories.push(new PivotViewer.Models.FacetCategory("CloudCover", "", "Number", !0, !0, !0));
                            var t = o.getLayer("landsat").objectIdField;
                            $.each(this.graphics, function (i, r) {
                                var f = r.attributes[t], o = r.attributes[d], e = r.attributes[g],
                                    s = r.attributes[nt], h = r.attributes[tt], c = r.attributes[it], l = r.attributes[rt],
                                    a = y + "/{0}".format(f.toString()), v = o == null ? new Date(1970, 1, 1) :
                                    new Date(o), p = e == null ? "" : e, w = s == null ? "" : s, b = h == null ? 0 : h,
                                    ft = c == null ? 0 : c, et = l == null ? 0 : l, u = new PivotViewer.Models.Item(i, f, a, e);
                                return u.LobsterId = i, u.Description = k(r, f, 2e3).url,
                                    u.AddFacetValue("Id",
                                    new PivotViewer.Models.FacetValue(f)), u.AddFacetValue("AcquisitionDate",
                                    new PivotViewer.Models.FacetValue(v)), u.AddFacetValue("Name", new PivotViewer.Models.FacetValue(p)),
                                    u.AddFacetValue("SensorName", new PivotViewer.Models.FacetValue(w)), u.AddFacetValue("SunAzimuth", new PivotViewer.Models.FacetValue(b)), u.AddFacetValue("SunElevation", new PivotViewer.Models.FacetValue(ft)), u.AddFacetValue("CloudCover", new PivotViewer.Models.FacetValue(et)), u.images = [k(r, f, 200), k(r, f, 1e3)],
                                    n.Items.push(u), i >= ut ? !1 : void 0
                            }); $.publish("/PivotViewer/Models/Collection/Loaded", null)
                        }
                    }), i = PivotViewer.Views.IImageController.subClass({
                        init: function () { },
                        Setup: function () { $.publish("/PivotViewer/ImageController/Collection/Loaded", null) },
                        GetImagesAtLevel: function (n) {
                            return function (t, i, r, u, f, e) {
                                function h(t) { if (t.image) i.drawImage(t.image, r, u, f, e); else if (!t.requested) { t.requested = !0; var o = new Image; o.onload = function () { t.image = o; t.requested = !1; $.publish("/PivotViewer/Views/Tile/Update/" + n.LobsterId, null) }; o.crossOrigin = "anonymous"; o.src = t.url } }
                                var v = t.Facets.AcquisitionDate[0].Value, o = v.getFullYear(), s = "#000000", l, a, w; o < 1980 ? s = "#0000FF" : o < 1990 ? s = "#A52A2A" : o < 2e3 ? s = "#808080" : o < 2010 ? s = "#FF00FF" : o < 2020 && (s = "#FFA500"); i.beginPath(); i.fillStyle = s; i.fillRect(r, u, f, e); i.closePath(); i.font = "32px Verdana";
                                var c = o.toString(), y = i.measureText(c), p = y.width; p < .7 * f && (l = r + f / 2, a = u + e / 2, i.fillStyle = "rgba(255, 255, 255, 0.30)",
                                    i.textBaseline = "middle", i.textAlign = "center", i.fillText(c, l, a)); w = null; f < 200 || (f < 500 ? h(n.images[0]) : (h(n.images[0]), h(n.images[1])))
                            }
                        }, Width: 100, Height: 100
                    }); $("#pivotviewer").PivotViewer({
                        Loader: new t(n),
                        ImageController: new i("content"),
                        AnimateBlank: !1, ViewerState: "$view$=1&$facet0$=AcquisitionDate",
                        AllowItemsCheck: !0, CopyToClipboard: !1, DisplayFeedback: !1,
                        ZoomHelperMaxLevel: 7, DateFormat: "dd/mm/yy"
                    })
            } var o, w, b, p;
            String.prototype.format = function () {
                for (var n = this, t = arguments.length; t--;)
                    n = n.replace(new RegExp("\\{" + t + "\\}", "gm"), arguments[t]); return n
            }; var ut = 4e3, y = "http://landsatlook.usgs.gov/arcgis/rest/services/LandsatLook/ImageServer",
                d = "acquisitionDate", g = "Name", nt = "sensor", tt = "sunAzimuth", it = "sunElevation", rt = "cloudCover";
            $("#buttonClear").click(function () { o.getLayer("footprints").clear(); v() }); $("#buttonBack").hide();
            $("#buttonBack").click(function () {
                o.getLayer("footprints").clear(); v(); $("#pivotviewer").remove();
                $("#page").animate({ left: "100%" }, 300, "swing", function () { $("#buttonBack").hide() })
            });
            $("#buttonPivot").click(function () {
                $("#page").animate({ left: "0%" }, 300, "swing",
                    function () {
                        $("#buttonBack").show();
                        $(document.createElement("div")).attr("id", "pivotviewer").appendTo("#page"); ft()
                    })
            });
            o = new a("map", { basemap: "topo" });
            o.on("load", function () {
                var r = o.layerIds[0], u = o.getLayer(r),
                    n = u.fullExtent, t = o.height / o.width, i = n.getHeight() / n.getWidth();
                o.setExtent(new e(t < i ? n.xmin : n.getCenter().x - .5 * n.getHeight() / t, t < i ?
                    n.getCenter().y - .5 * t * n.getWidth() : n.ymin, t < i ? n.xmax :
                    n.getCenter().x + .5 * n.getHeight() / t, t < i ? n.getCenter().y + .5 * t * n.getWidth()
                    : n.ymax, o.spatialReference)); v()
            }); v(); w = new f; w.format = "jpgpng";
            o.addLayer(new r(y, { id: "landsat", imageServiceParameters: w }));
            o.addLayer(new u({ id: "footprints" }));
            o.getLayer("footprints").setRenderer(new n(new t(t.STYLE_SOLID, new i(i.STYLE_SOLID, l.fromArray([255, 0, 0, 1]), .5),
                l.fromArray([255, 0, 0, .01]))));

            b = "close";
            p = "about";
            $("#buttonAbout").html(p);
            $("#buttonAbout").click(function () {
                    switch ($("#buttonAbout").html())
                    {
                        case "about": $("#about").animate({ marginTop: "0px" }, 300, "swing",
                          function () { $("#buttonAbout").html(b) }); break;
                        case "close": $("#about").animate({ marginTop: "-540px" }, 300, "swing", function () { $("#buttonAbout").html(p) })
                    }
            });

            $("#buttonDraw").click(function () {
                    var n = new c(o, { showTooltips: !1, drawTime: 90 });
                    n.activate(c.EXTENT); n.on("draw-end", function (t) {
                        var i, r; n.deactivate(); i = new s;
                        i.returnGeometry = !0; i.outFields = [d, g, nt, tt, it, rt];
                        i.outSpatialReference = o.spatialReference; i.where = "Category = 1";
                        i.geometry = t.geometry; r = new h(y);
                        r.on("complete", function (n) {
                            if (n.featureSet.features.length == 0)
                            {
                                $("#description").html("Nothing found. Please try again.");
                                return
                            } $("#imagecount").html("{0} raster scenes found. Click clear to start over or pivot to view and sort scenes.".format(n.featureSet.features.length)); $.each(n.featureSet.features, function (n, t) { o.getLayer("footprints").add(t) }); v()
                        }); r.execute(i)
                    })
                })
        })
    });
/*
//# sourceMappingURL=index.min.js.map
*/