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
PivotViewer.Models.Collection = Object.subClass({
	init: function () {
		this.name = "";
		this.brandImage = "";
		this.categories = [];
		this.items = [];
		this.base = "";
		this.baseNoProxy = "";
		this.imageBase = "";
        this.copyrightName = "";
        this.copyrightHref = "";
        this.maxRelatedLinks = 0;

        this._categoriesByName = [];
        this._itemsById = [];

        var that = this;
        var _catIndex = 0;
        var _visIndex = 0;
        this.categories.push = function (x) {
            x.index = _catIndex++;
            x.visIndex = x.isFilterVisible ? _visIndex++ : -1;
            this.__proto__.push.apply(that.categories, [x]);
            that._categoriesByName[x.name] = x;
            that._categoriesByName[x.name.toLowerCase()] = x;
        }
        this.items.push = function (x) {
            this.__proto__.push.apply(that.items, [x]);
            that._itemsById[x.id] = x;
        }
	},
	getItemById: function (id) {
	    var item = this._itemsById[id];
	    if (item == undefined) return null;
	    return item;
	},
	getCategoryByName: function (name) {
	    var category = this._categoriesByName[name];
	    if (category == undefined) return null;
	    return category;
	}
});

//PivotViewer.Models
PivotViewer.Models.Category = Object.subClass({
    init: function (name, type, isFilterVisible, isSearchVisible, isMetaDataVisible) {
		this.name = name;
		this.type = type != null && type != undefined ? type : PivotViewer.Models.FacetType.String;
		this.isFilterVisible = isFilterVisible != null && isFilterVisible != undefined ? isFilterVisible : true; // does it show up in the filter (left panel)
		this.isSearchVisible = isSearchVisible != null && isSearchVisible != undefined ? isSearchVisible : true; // does it show up in the top menu
		this.isMetaDataVisible = isMetaDataVisible != null && isMetaDataVisible != undefined ? isMetaDataVisible : true; // can you see it at all
		this.recount = true; this.uiInit = false; this.doFilter = true;
		this.datetimeBuckets = [];
		this.customSort = null;
		this.labels = [];
        this.isMultipleItems = false; /// this facet can have more than one value
    },
	getValueLabel: function (value) {
	    if (this.type == PivotViewer.Models.FacetType.Ordinal) {
	        var label = this.labels[value];
	        if (label == undefined) return value;
	        else return label;
	    }
	    else return value;
	},
	isString: function () { return this.type == PivotViewer.Models.FacetType.String; },
	isLongString: function() { return this.type == PivotViewer.Models.FacetType.LongString; },
	isNumber: function () { return this.type == PivotViewer.Models.FacetType.Number; },
	isOrdinal: function () { return this.type == PivotViewer.Models.FacetType.Ordinal; },
	isDateTime: function () { return this.type == PivotViewer.Models.FacetType.DateTime; },
	isLink: function () { return this.type == PivotViewer.Models.FacetType.Link;}
});

PivotViewer.Models.CategorySort = Object.subClass({
	init: function (name) {
		this.name = name;
		this.sortValues = [];
	}
});

PivotViewer.Models.Item = Object.subClass({
    init: function (img, id, href, name) {
        this.description = null;this.img = img; this.id = id; this.href = href; this.name = name; this.facets = [];
		this._facetByName = [];
		this.links = [];
		var that = this;
		this.facets.push = function (x) {
		    this.__proto__.push.apply(that.facets, [x]);
		    that._facetByName[x.name] = x;
		}
    },
    getFacetByName: function (name) { return this._facetByName[name] }
}); 

PivotViewer.Models.ItemLink = Object.subClass({
	init: function (name, href) {
        this.name = name;
        this.href = href;
	}
});

PivotViewer.Models.Facet = Object.subClass({
	init: function (name, values) {
	    this.name = name;
        if (values === undefined) this.values = [];
        else this.values = values;
	},
	addValue: function (value) {
		this.values.push(value);
	},
});

PivotViewer.Models.FacetValue = Object.subClass({
	init: function (value, label) {
	    this.value = value;
	    if (label == undefined) this.label = value;
	    else this.label = label;
		this.href = "";
	}
});

PivotViewer.Models.Bucket = Object.subClass({
    init: function (startRange, startLabel, endRange, endLabel) {
        this.startRange = startRange; this.startLabel = startLabel;
        this.endRange = endRange ? endRange : startRange;
        this.endLabel = endLabel ? endLabel : startLabel;
        this.ids = []; this.values = []; this.tiles = [];
    },
    addTile: function (tile) {
        this.tiles.push(tile);
        this.ids[tile.item.id] = true;
    },
    addValue: function (value) { this.values.push(value); },
    getLabel: function () { return this.startLabel == this.endLabel ? this.startLabel : this.startLabel + " - " + this.endLabel; },
    equals: function (bkt) {
        return bkt != null && this.tiles.length != 0 && this.tiles.length == bkt.tiles.length && this.tiles[0].item.id == bkt.tiles[0].item.id &&
            this.tiles[this.tiles.length - 1].item.id == bkt.tiles[bkt.tiles.length - 1].item.id;
    }
});


PivotViewer.Models.DateTimeInfo = Object.subClass({
	init: function (name, start, end) {
		this.name = name;
		this.start = start;
		this.end = end;
		this.items = [];
	}
});

PivotViewer.Models.FacetType = {
	String: "String",
	LongString: "LongString",
	Number: "Number",
	DateTime: "DateTime",
	Link: "Link",
    Ordinal: "Ordinal"
};
