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
		var xmlns = "http://schemas.microsoft.com/collection/metadata/2009",
		xmlnsp = "http://schemas.microsoft.com/livelabs/pivot/collection/2009";
		this.CollectionName = "";
		this.BrandImage = "";
		this.FacetCategories = [];
		this.FacetCategoriesByName = [];
		this.Items = [];
		this.ItemsByName = [];
		this.ItemsById = [];
		this.CollectionBase = "";
		this.CollectionBaseNoProxy = "";
		this.ImageBase = "";
        this.CopyrightName = "";
        this.CopyrightHref = "";
        this.MaxRelatedLinks = 0;

        var that = this;
        var _catIndex = 0;
        var _visIndex = 0;
        this.FacetCategories.push = function (x) {
            x.index = _catIndex++;
            x.visIndex = x.IsFilterVisible ? _visIndex++ : -1;
            this.__proto__.push.apply(that.FacetCategories, [x]);
            that.FacetCategoriesByName[x.Name] = x;
            that.FacetCategoriesByName[x.Name.toLowerCase()] = x;
        }
        this.Items.push = function (x) {
            this.__proto__.push.apply(that.Items, [x]);
            that.ItemsByName[x.Name] = x;
            that.ItemsById[x.Id] = x;
        }
	},
	GetItemById: function (id) {
	    var item = this.ItemsById[id];
	    if (item == undefined) return null;
	    return item;
	},
	GetItemByName: function (name) {
	    var item = this.ItemsByName[name];
	    if (item == undefined) return null;
	    return item;
	},
	GetFacetCategoryByName: function (name) {
	    var category = this.FacetCategoriesByName[name];
	    if (category == undefined) return null;
	    return category;
	}
});

//PivotViewer.Models
PivotViewer.Models.FacetCategory = Object.subClass({
	init: function (Name, Format, Type, IsFilterVisible, IsMetaDataVisible, IsWordWheelVisible, CustomSort) {
		this.Name = Name; this.Format = Format;
		this.Type = Type != null && Type != undefined ? Type : PivotViewer.Models.FacetType.String;
		this.IsFilterVisible = IsFilterVisible != null && IsFilterVisible != undefined ? IsFilterVisible : true;
		this.IsMetaDataVisible = IsMetaDataVisible != null && IsMetaDataVisible != undefined ? IsMetaDataVisible : true;
		this.IsWordWheelVisible = IsWordWheelVisible != null && IsWordWheelVisible != undefined ? IsWordWheelVisible : true;
		this.CustomSort; this.recount = true; this.uiInit = false;
		this.datetimeBuckets = [];
	}
});

PivotViewer.Models.FacetCategorySort = Object.subClass({
	init: function (Name) {
		this.Name = Name;
		this.SortValues = [];
	}
});

PivotViewer.Models.Item = Object.subClass({
    init: function (Img, Id, Href, Name) {
		this.Img = Img,
		this.Id = Id,
		this.Href = Href,
		this.Name = Name,
		this.Description,
		this.Facets = [];
		this.FacetByName = [];
		this.Links = [];
		var that = this;
		this.Facets.push = function (x) {
		    this.__proto__.push.apply(that.Facets, [x]);
		    that.FacetByName[x.Name] = x;
		}
	}
});

PivotViewer.Models.ItemLink = Object.subClass({
	init: function (Name, Href) {
        this.Name = Name;
        this.Href = Href;
	}
});

PivotViewer.Models.Facet = Object.subClass({
	init: function (Name, Values) {
	    this.Name = Name;
        if (Values === undefined) this.FacetValues = [];
        else this.FacetValues = Values;
	},
	AddFacetValue: function (facetValue) {
		this.FacetValues.push(facetValue);
	},
});

PivotViewer.Models.FacetValue = Object.subClass({
	init: function (Value, Label) {
	    this.Value = Value;
	    if (Label == undefined) this.Label = Value;
	    else this.Label = Label;
		this.Href = "";
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
