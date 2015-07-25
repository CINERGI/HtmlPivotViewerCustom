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
    if (filterValues != undefined)
        for (var i = 0; i < filterValues.length; i++) filterSet[filterValues[i]] = true;
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
    reverse = reverse == undefined ? -1 : [-1, 1][+!!reverse];

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

GetTimeValueFunction = function (min, max) {
    if (max.getFullYear() - min.getFullYear() + min.getFullYear() % 10 > 9)
        return function (value) { var year = new Date(value.Value).getFullYear(); return (year - year % 10); };
    else if (max.getFullYear() > min.getFullYear()) return function (value) { return new Date(value.Value).getFullYear(); };
    else if (max.getMonth() > min.getMonth()) return function (value) { return new Date(value.Value).getMonth(); };
    else if (max.getDate() > min.getDate()) return function (value) { return new Date(value.Value).getDate(); };
    else if (max.getHours() > min.getHours()) return function (value) { return new Date(value.Value).getHours(); };
    else if (max.getMinutes() > min.getMinutes()) return function (value) { return new Date(value.Value).getMinutes(); };
    else return function (value) { return new Date(value.Value).getSeconds(); };
}

GetTimeLabelFunction = function (min, max) {
    if (max.getFullYear() - min.getFullYear() + min.getFullYear() % 10 > 9) 
        return function (value) { var year = new Date(value.Value).getFullYear(); return (year - year % 10) + "s"; };
    else if (max.getFullYear() > min.getFullYear()) return function (value) { return new Date(value.Value).getFullYear().toString(); };
    else if (max.getMonth() > min.getMonth()) 
        return function (value) { var date = new Date(value.Value); return GetMonthName(date) + " " + date.getFullYear(); };
    else if (max.getDate() > min.getDate()) 
            return function (value) { var date = new Date(value.Value); return GetMonthName(date) + " " + date.getDate() + ", " + date.getFullYear(); };
    else if (max.getHours() > min.getHours())
        return function (value) {
                var date = new Date(value).Value;
                return GetMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + GetStandardHour(date) + " " + GetMeridian(date);
        };
    else if (max.getMinutes() > min.getMinutes()) 
        return function (value) {
                var date = new Date(value.Value);
                return GetMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + GetStandardHour(date) + ":" + GetStandardMinutes(date) + " " + GetMeridian(date);
        };
    else return function (value) {
            var date = new Date(value.Value);
            return GetMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + GetStandardHour(date) + ":" + GetStandardMinutes(date) + "::" + GetStandardSeconds(date) + " " + GetMeridian(date);
    };
}

GetBuckets = function (filterList, facet, valueFunction, labelFunction) {
    if (valueFunction == undefined) valueFunction = function (value) { return value.Value; }
    if (labelFunction == undefined) labelFunction = function (value) { return value.Label.toString();}

    var bkts = [], value1 = filterList[0].facetItem.FacetByName[facet].FacetValues[0], value = valueFunction(value1), label = labelFunction(value1);
    var bkt = { startRange: value1.Value, endRange: value1.Value, tiles: [filterList[0]], values: [value], ids: [], startLabel: label, endLabel: label };
    bkts.push(bkt);
    bkt.ids[filterList[0].facetItem.Id] = true;

    var i = 1, j = 0;
    for (; i < filterList.length; i++) {
        var tile = filterList[i], item = tile.facetItem;
        if (item.FacetByName[facet] == undefined) break;
        if (tile.missing) continue;
        var value2 = item.FacetByName[facet].FacetValues[0];
        if(valueFunction(value2) > value) {
            value1 = value2;
            var label = labelFunction(value2), value = valueFunction(value2);
            bkts[++j] = { startRange: value2.Value, endRange: value2.Value, tiles: [tile], values: [value], ids: [], startLabel: label, endLabel: label };
            bkts[j].ids[item.Id] = true;
        }
        else {
            bkts[j].tiles.push(tile);
            bkts[j].ids[item.Id] = true;
            bkts[j].endRange = value2.Value;
        }
    }

    //Condense buckets
    if (bkts.length > 10) {
        var size = Math.ceil(bkts.length / 10), newBkts = [];
        newBkts.ids = [];
        for (var c = 0, b = 0; c < bkts.length; c++) {
            var d = c % size, newBkt, bkt = bkts[c];
            if (d == 0) { newBkts[b] = bkt; newBkt = newBkts[b]; }
            else {
                newBkt = newBkts[b];
                newBkt.endRange = bkt.endRange;
                newBkt.endLabel = bkt.endLabel;
                Array.prototype.push.apply(newBkt.tiles, bkt.tiles);
                Array.prototype.push.apply(newBkt.values, bkt.values);
            }
            for (var key in bkt.ids) {
                newBkt.ids[key] = true;
                newBkts.ids[key] = b;
            }
            if (d + 1 == size) b++;
        }
        bkts = newBkts;
    }
    else {
        bkts.ids = [];
        for (var j = 0; j < bkts.length; j++) {
            for (var key in bkts[j].ids) bkts.ids[key] = j;
        }
    }

    if (i != filterList.length && settings.showMissing) {
        var bucket = { startRange: "(no info)", endRange: "(no info)", tiles: [], values: [], ids: [], startLabel: "(no info)", endLabel: "(no info)" };
        bkts.push(bucket);
        var b = bkts.length - 1;
        for (; i < filterList.length; i++) {
            bucket.tiles.push(filterList[i]);
            bucket.ids[filterList[i].facetItem.Id] = true;
            bkts.ids[filterList[i].facetItem.Id] = b;
        }
    }
    return bkts;
}

LoadScript = function(scriptName) {
    if ($("script[src*='" + scriptName + "']").length == 0) {
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = scriptName;
        $("head").append(script);
    }
}

LoadCSS = function (cssName) {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.type = "text/css";
    css.href = cssName;
}

/*  The following JavaScript functions for calculating normal and
    chi-square probabilities and critical values were adapted by
    John Walker from C implementations
    written by Gary Perlman of Wang Institute, Tyngsboro, MA
    01879.  Both the original C code and this JavaScript edition
    are in the public domain.  */
var BIGX = 20.0;                  /* max value to represent exp(x) */

function poz(z) {
    var y, x, w;
    var Z_MAX = 6.0;              /* Maximum meaningful z value */

    if (z == 0.0) {
        x = 0.0;
    } else {
        y = 0.5 * Math.abs(z);
        if (y >= (Z_MAX * 0.5)) {
            x = 1.0;
        } else if (y < 1.0) {
            w = y * y;
            x = ((((((((0.000124818987 * w
                     - 0.001075204047) * w + 0.005198775019) * w
                     - 0.019198292004) * w + 0.059054035642) * w
                     - 0.151968751364) * w + 0.319152932694) * w
                     - 0.531923007300) * w + 0.797884560593) * y * 2.0;
        } else {
            y -= 2.0;
            x = (((((((((((((-0.000045255659 * y
                           + 0.000152529290) * y - 0.000019538132) * y
                           - 0.000676904986) * y + 0.001390604284) * y
                           - 0.000794620820) * y - 0.002034254874) * y
                           + 0.006549791214) * y - 0.010557625006) * y
                           + 0.011630447319) * y - 0.009279453341) * y
                           + 0.005353579108) * y - 0.002141268741) * y
                           + 0.000535310849) * y + 0.999936657524;
        }
    }
    return z > 0.0 ? ((x + 1.0) * 0.5) : ((1.0 - x) * 0.5);
}

function ex(x) {
    return (x < -BIGX) ? 0.0 : Math.exp(x);
}
function pochisq(x, rows, cols) {
    var df = (rows - 1) * (cols - 1);
    var a, y, s;
    var e, c, z;
    var even;                     /* True if df is an even number */

    var LOG_SQRT_PI = 0.5723649429247000870717135; /* log(sqrt(pi)) */
    var I_SQRT_PI = 0.5641895835477562869480795;   /* 1 / sqrt(pi) */

    if (x <= 0.0 || df < 1) {
        return 1.0;
    }

    a = 0.5 * x;
    even = !(df & 1);
    if (df > 1) {
        y = ex(-a);
    }
    s = (even ? y : (2.0 * poz(-Math.sqrt(x))));
    if (df > 2) {
        x = 0.5 * (df - 1.0);
        z = (even ? 1.0 : 0.5);
        if (a > BIGX) {
            e = (even ? 0.0 : LOG_SQRT_PI);
            c = Math.log(a);
            while (z <= x) {
                e = Math.log(z) + e;
                s += ex(c * z - a - e);
                z += 1.0;
            }
            return s;
        } else {
            e = (even ? 1.0 : (I_SQRT_PI / Math.sqrt(a)));
            c = 0.0;
            while (z <= x) {
                e = e * (a / z);
                c = c + e;
                z += 1.0;
            }
            return c * y + s;
        }
    } else {
        return s;
    }
}
