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
	init: function (name, type, isFilterVisible) {
		this.name = name;
		this.type = type != null && type != undefined ? type : PivotViewer.Models.FacetType.String;
		this.isFilterVisible = isFilterVisible != null && isFilterVisible != undefined ? isFilterVisible : true;
		this.recount = true; this.uiInit = false;
		this.datetimeBuckets = [];
		this.customSort = null;
	}
});

PivotViewer.Models.CategorySort = Object.subClass({
	init: function (name) {
		this.name = name;
		this.sortValues = [];
	}
});

PivotViewer.Models.Item = Object.subClass({
    init: function (img, id, href, name) {
        this.img = img; this.id = id; this.href = href; this.name = name; this.facets = [];
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
