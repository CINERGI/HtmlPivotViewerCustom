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

Debug.Log = function (message) {
    if (window.console && window.console.log && typeof debug != "undefined" && debug == true) {
        window.console.log(message);
    }
};

//Gets the next 'frame' from the browser (there are several methods) and controls the frame rate
window.requestAnimFrame = (function (callback) {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();

PivotViewer.Utils.EscapeMetaChars = function (jQuerySelector) {
    //"!#$%&'()*+,./:;<=>?@[\]^`{|}~
    return jQuerySelector
            .replace(/\|/gi, "\\|")
            .replace(/\//gi, "\\/")
            .replace(/'/gi, "\\'")
            .replace(/,/gi, "\\,")
            .replace(/:/gi, "\\:")
            .replace(/\(/gi, "\\(")
            .replace(/\)/gi, "\\)")
            .replace(/\+/gi, "\\+")
            .replace(/\+/gi, "\\-")
            .replace(/\+/gi, "\\_")
            .replace(/\+/gi, "\\%")
            .replace(/\./gi, "\\_");
};

PivotViewer.Utils.EscapeItemId = function (itemId) {
    return itemId
            .replace(/\s+/gi, "|")
            .replace(/'/gi, "")
            .replace(/\(/gi, "")
            .replace(/\)/gi, "")
            .replace(/\./gi, "");
};

PivotViewer.Utils.HtmlSpecialChars = function (orig) {
    return jQuery('<div />').text(orig).html();
}

PivotViewer.Utils.Now = function () {
    if (Date.now) return Date.now();
    else return (new Date().getTime());
};

// Provided the minimum number is < 1000000
PivotViewer.Utils.Min = function (values) {
    return Math.min.apply(null, values)
}

// Provided the maximum number is > -1000000
PivotViewer.Utils.Max = function (values) {
    return Math.max.apply(null, values)
}

PivotViewer.Utils.OrdinalHistogram = function (values) {
    if (!values instanceof Array) return null;

    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);

    var bins = max - min + 1, histogram = [];
    for (var i = 0; i < bins; i++) histogram.push([]);
    for (var i = 0; i < values.length; i++) {
        histogram[values[i] - min].push(values[i]);
    }
    return { histogram: histogram, min: min, max: max, binCount: bins };
}

PivotViewer.Utils.Histogram = function (values) {
    if (!values instanceof Array) return null;

    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);

    var bins = (Math.floor(Math.pow(2 * values.length, 1 / 3)) + 1) * 2;
    if (bins > values.length) bins = values.length;
    else if (bins > 10) bins = 10;
    var stepSize = ((max + 1) - (min - 1)) / bins;

    var histogram = [];
    for (var i = 0; i < bins; i++) {
        var minRange = min + (i * stepSize);
        var maxRange = min + ((i + 1) * stepSize);
        histogram.push([]);
        for (var j = 0, _jLen = values.length; j < _jLen; j++) {
            if (minRange <= values[j] && maxRange > values[j])
                histogram[i].push(values[j]);
        }
    }
    return { histogram: histogram, min: min, max: max, binCount: bins };
};

// A simple class creation library.
// From Secrets of the JavaScript Ninja
// Inspired by base2 and Prototype
(function () {
    var initializing = false,
    // Determine if functions can be serialized
    fnTest = /xyz/.test(function () { xyz; }) ? /\b_super\b/ : /.*/;

    // Create a new Class that inherits from this class
    Object.subClass = function (prop) {
        var _super = this.prototype;

        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        var proto = new this();
        initializing = false;

        // Copy the properties over onto the new prototype
        for (var name in prop) {
            // Check if we're overwriting an existing function
            proto[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function (name, fn) {
            return function () {
                var tmp = this._super;

                // Add a new ._super() method that is the same method
                // but on the super-class
                this._super = _super[name];

                // The method only need to be bound temporarily, so we
                // remove it when we're done executing
                var ret = fn.apply(this, arguments);
                this._super = tmp;

                return ret;
            };
        })(name, prop[name]) :
        prop[name];
        }

        // The dummy class constructor
        function Class() {
            // All construction is actually done in the init method
            if (!initializing && this.init)
                this.init.apply(this, arguments);
        }

        // Populate our constructed prototype object
        Class.prototype = proto;

        // Enforce the constructor to be what we expect
        Class.constructor = Class;

        // And make this class extendable
        Class.subClass = arguments.callee;

        return Class;
    };
})();

if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function (suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

if (typeof String.prototype.startsWith !== 'function') {
    String.prototype.startsWith = function (suffix) {
        return this.lastIndexOf(suffix, 0) === 0;
    };
}

if (!Number.isInteger) {
    Number.isInteger = function isInteger(nVal) {
        return typeof nVal === "number" && isFinite(nVal) && nVal > -9007199254740992 && nVal < 9007199254740992 && Math.floor(nVal) === nVal;
    };
}

http://stackoverflow.com/questions/979256/sorting-an-array-of-javascript-objects
var tile_sort_by = function (field, reverse, filterValues) {
    var key, type = PivotCollection.GetFacetCategoryByName(field);
    var filterSet = [];
    for(var i = 0; i < filterValues.length; i++) filterSet[filterValues[i]] = true;
    if(type.Type == PivotViewer.Models.FacetType.Number || type.Type == PivotViewer.Models.FacetType.Ordinal) {
        key = function (a) {
            var facet = a.facetItem.FacetByName[field];
            if(facet == undefined) return Infinity;
            else return facet.FacetValues[0].Value;
        }
    }
    else if (type.Type == PivotViewer.Models.FacetType.DateTime) {
        key = function (a) {
            var facet = a.facetItem.FacetByName[field];
            if (facet == undefined) return new Date(8640000000000000); //max date
            return new Date(facet.FacetValues[0].Value);
        }
    }
    else key = function (a) {
        var facet = a.facetItem.FacetByName[field];
        if(facet == undefined) return "ZZZZZZZ";
        else {
            var values = facet.FacetValues;
            for(var j = 0; j < values.Length; j++) {
                if(filterSet[values[j]]) return values[j].Value.toUpperCase();
            }
            return values[0].Value.toUpperCase();
        }
    }
    var reverse = [-1, 1][+!!reverse];

    return function (a, b) {
          return a = key(a), b = key(b), reverse * ((b > a) - (a > b));
    }
}


GetMonthName = function(date) {
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return monthNames[date.getMonth()];
}

GetStandardHour = function (date) {
    var hour = date.getHours();
    if (hour == 0) return 12;
    else if (hour > 12) return hour - 12;
    else return hour;
}

GetStandardSeconds = function (date) {
    var seconds = date.getSeconds();
    if (seconds < 10) return "0" + seconds;
    else return seconds;
}

GetStandardMinutes = function (date) {
    var minutes = date.getMinutes();
    if (minutes < 10) return "0" + minutes;
    else return minutes;
}

GetMeridian = function(date) {
    if (date.getHours() > 11) return "PM";
    else return "AM";
}

GetBuckets = function (filterList, facet, valueFunction, labelFunction, greaterFunction) {
    if (valueFunction == undefined) valueFunction = function (value) { return value.Value; }
    if (labelFunction == undefined) labelFunction = function (value) { return value.Label.toString();}
    //if (greaterFunction == undefined) greaterFunction = function (value1, value2) { return valueFunction(value1) > valueFunction(value2); }

    var bkts = [], value1 = filterList[0].facetItem.FacetByName[facet].FacetValues[0], value = valueFunction(value1), label = labelFunction(value1);
    var bkt = { startRange: value1.Value, endRange: value1.Value, tiles: [filterList[0]], values: [value], ids: [], startLabel: label, endLabel: label };
    bkts.push(bkt);
    bkt.ids[filterList[0].facetItem.Id] = true;

    var i = 1, j = 0;
    for (; i < filterList.length; i++) {
        if (filterList[i].facetItem.FacetByName[facet] == undefined) break;
        var value2 = filterList[i].facetItem.FacetByName[facet].FacetValues[0];
        if(valueFunction(value2) > value) {
            value1 = value2;
            var label = labelFunction(value2), value = valueFunction(value2);
            var bkt = { startRange: value2.Value, endRange: value2.Value, tiles: [filterList[i]], values: [value], ids: [], startLabel: label, endLabel: label }
            bkt.ids[filterList[i].facetItem.Id] = true;
            bkts.push(bkt);
            j++;
        }
        else {
            bkts[j].tiles.push(filterList[i]);
            bkts[j].ids[filterList[i].facetItem.Id] = true;
            bkts[j].endRange = value2.Value;
        }
    }

    //Condense buckets
    if (bkts.length > 10) {
        var size = Math.ceil(bkts.length / 10);
        var newBkts = [];
        for (var c = 0, b = 0; c < bkts.length; c++) {
            var d = c % size;
            if (d == 0) newBkts[b] = bkts[c];
            else {
                newBkts[b].endRange = bkts[c].endRange;
                newBkts[b].endLabel = bkts[c].endLabel;
                Array.prototype.push.apply(newBkts[b].tiles, bkts[c].tiles);
                Array.prototype.push.apply(newBkts[b].values, bkts[c].values);
                for (var key in bkts[c].ids) newBkts[b].ids[key] = true;
            }
            if (d + 1 == size) b++;
        }
        bkts = newBkts;
    }

    if (i != filterList.length) {
        var bucket = { startRange: "(no info)", endRange: "(no info)", tiles: [], values: [], ids: [], startLabel: "(no info)", endLabel: "(no info)" };
        bkts.push(bucket);
        for (; i < filterList.length; i++) {
            bucket.tiles.push(filterList[i]);
            bucket.ids[filterList[i].facetItem.Id] = true;
        }
    }
    return bkts;
}