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

Debug.log = function (message) {
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

PivotViewer.Utils.escapeMetaChars = function (jQuerySelector) {
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

PivotViewer.Utils.htmlSpecialChars = function (orig) {
    return jQuery('<div />').text(orig).html();
}

PivotViewer.Utils.now = function () {
    if (Date.now) return Date.now();
    else return (new Date().getTime());
};

PivotViewer.Utils.getOrdinalHistogram = function (values) {
    if (!values instanceof Array) return null;

    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);

    var bkts = max - min + 1, histogram = [];
    for (var i = 0; i < bkts; i++) histogram[i] = 0;
    for (var i = 0; i < values.length; i++) histogram[values[i] - min]++;
    return { histogram: histogram, min: min, max: max};
}

PivotViewer.Utils.getHistogram = function (values) {
    if (!values instanceof Array) return null;

    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);

    var bkts = (Math.floor(Math.pow(2 * values.length, 1 / 3)) + 1) * 2;
    if (bkts > values.length) bkts = values.length;
    else if (bkts > 10) bkts = 10;
    var bktSize = bkts == 1 ? max - min + 1 : (max - min) / (bkts - 1);

    var histogram = [];
    for (var i = 0; i < bkts; i++) histogram[i] = 0;
    for (var i = 0; i < values.length; i++) histogram[Math.floor((values[i] - min) / bktSize)]++;

    return { histogram: histogram, min: min, max: max };
};

//http://stackoverflow.com/questions/19348528/jquery-ui-slider-how-to-add-values
(function ($) {
    $.widget("suave.modSlider", $.ui.slider, {
        clearValues: function() {
            this.options.values = [this.options.min, this.options.max];
            this._refresh();
        },
        changeValues: function(values) {
            for (var i = 0; i < values.length; i++) values[i] = Math.floor(values[i] / this.options.step) * this.options.step;
            this.options.values = values;
            this._refresh();
        },
        addValue: function (val) {
            val = Math.floor(val / this.options.step) * this.options.step;
            this.options.values.push(val);
            this.options.values.sort();
            this._refresh();
        },
        removeValue: function (index) {
            this.options.values.splice(index, 1);
            this._refresh();
        }
    });
})(jQuery);

//http://stackoverflow.com/questions/2360655/jquery-event-handlers-always-execute-in-order-they-were-bound-any-way-around-t
$.fn.bindFirst = function (name) {
    // bind as you normally would
    // don't want to miss out on any jQuery magic
    this.on.apply(this, arguments);

    // Thanks to a comment by @Martin, adding support for
    // namespaced events too.
    this.each(function () {
        var handlers = $._data(this, 'events')[name.split('.')[0]];
        // take out the handler we just inserted from the end
        var handler = handlers.pop();
        // move it at the beginning
        handlers.splice(0, 0, handler);
    });
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
var tileSortBy = function (field, reverse, filterValues) {
    var key, category = PivotCollection.getCategoryByName(field);
    var filterSet = [];
    if (filterValues != undefined)
        for (var i = 0; i < filterValues.length; i++) filterSet[filterValues[i]] = true;
    if(category.isNumber() || category.isOrdinal()) {
        key = function (a) {
            var facet = a.item.getFacetByName(field);
            if(facet == undefined) return Infinity;
            else return facet.values[0].value;
        }
    }
    else if (category.isDateTime()) {
        key = function (a) {
            var facet = a.item.getFacetByName(field);
            if (facet == undefined) return new Date(8640000000000000); //max date
            return new Date(facet.values[0].value);
        }
    }
    else key = function (a) {
        var facet = a.item.getFacetByName(field);
        if(facet == undefined) return "ZZZZZZZ";
        else {
            var values = facet.values;
            for(var j = 0; j < values.Length; j++) {
                if(filterSet[values[j]]) return values[j].value.toUpperCase();
            }
            return values[0].value.toUpperCase();
        }
    }
    reverse = reverse == undefined ? -1 : [-1, 1][+!!reverse];

    return function (a, b) {
          return a = key(a), b = key(b), reverse * ((b > a) - (a > b));
    }
}


PivotViewer.Utils.getMonthName = function(date) {
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return monthNames[date.getMonth()];
}

PivotViewer.Utils.getHour = function (date) {
    var hour = date.getHours();
    if (hour == 0) return 12;
    else if (hour > 12) return hour - 12;
    else return hour;
}

PivotViewer.Utils.getSeconds = function (date) {
    var seconds = date.getSeconds();
    if (seconds < 10) return "0" + seconds;
    else return seconds;
}

PivotViewer.Utils.getMinutes = function (date) {
    var minutes = date.getMinutes();
    if (minutes < 10) return "0" + minutes;
    else return minutes;
}

PivotViewer.Utils.getMeridian = function(date) {
    if (date.getHours() > 11) return "PM";
    else return "AM";
}

PivotViewer.Utils.getTimeValueFn = function (min, max) {
    if (max.getFullYear() - min.getFullYear() + min.getFullYear() % 10 > 9)
        return function (value) { var year = new Date(value.value).getFullYear(); return (year - year % 10); };
    else if (max.getFullYear() > min.getFullYear()) return function (value) { return new Date(value.value).getFullYear(); };
    else if (max.getMonth() > min.getMonth()) return function (value) { return new Date(value.value).getMonth(); };
    else if (max.getDate() > min.getDate()) return function (value) { return new Date(value.value).getDate(); };
    else if (max.getHours() > min.getHours()) return function (value) { return new Date(value.value).getHours(); };
    else if (max.getMinutes() > min.getMinutes()) return function (value) { return new Date(value.value).getMinutes(); };
    else return function (value) { return new Date(value.value).getSeconds(); };
}

PivotViewer.Utils.getTimeLabelFn = function (min, max) {
    if (max.getFullYear() - min.getFullYear() + min.getFullYear() % 10 > 9) 
        return function (value) { var year = new Date(value.value).getFullYear(); return (year - year % 10) + "s"; };
    else if (max.getFullYear() > min.getFullYear()) return function (value) { return new Date(value.value).getFullYear().toString(); };
    else if (max.getMonth() > min.getMonth()) 
        return function (value) { var date = new Date(value.value); return PivotViewer.Utils.getMonthName(date) + " " + date.getFullYear(); };
    else if (max.getDate() > min.getDate()) 
            return function (value) { var date = new Date(value.value); return PivotViewer.Utils.getMonthName(date) + " " + date.getDate() + ", " + date.getFullYear(); };
    else if (max.getHours() > min.getHours())
        return function (value) {
                var date = new Date(value).value;
                return PivotViewer.Utils.getMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + PivotViewer.Utils.getHour(date) + " " + PivotViewer.Utils.getMeridian(date);
        };
    else if (max.getMinutes() > min.getMinutes()) 
        return function (value) {
                var date = new Date(value.value);
                return PivotViewer.Utils.getMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + PivotViewer.Utils.getHour(date) + ":" + PivotViewer.Utils.getMinutes(date) + " " + PivotViewer.Utils.getMeridian(date);
        };
    else return function (value) {
            var date = new Date(value.value);
            return PivotViewer.Utils.getMonthName(date) + " " + date.getDate() + ", " + date.getFullYear() + " " + PivotViewer.Utils.getHour(date) + ":" + PivotViewer.Utils.getMinutes(date) + "::" + PivotViewer.Utils.getSeconds(date) + " " + PivotViewer.Utils.getMeridian(date);
    };
}

PivotViewer.Utils.fillBuckets = function (bkts, filterList, category, valueFn) {
    if (valueFn == undefined) valueFn = function (value) { return value.value; }
    bkts.ids = [];
    var category = PivotCollection.getCategoryByName(category);
    if (category.isNumber() || category.isOrdinal()) {
        for (var i = 0, j = 0; i < filterList.length; i++) {
            var tile = filterList[i], facet = tile.item.getFacetByName(category.name);
            if (facet == undefined) break;
            if (tile.missing) continue;
            
            var value = facet.values[0];
            if (valueFn(value) >= bkts[j].endRange && j < bkts.length - 1) j++;
            bkts[j].addTile(tile);
            bkts.ids[tile.item.id] = j;
        }
    }
    else {
        var valueBkts = [];

        for (var i = 0; i < filterList.length; i++) {
            var tile = filterList[i], facet = tile.item.getFacetByName(category.name);
            if (facet == undefined) break;
            if (tile.missing) continue;
            var j = bkts.values[valueFn(facet.values[0])];
            bkts[j].addTile(tile);
            bkts.ids[tile.item.id] = j;
        }
    }
}

PivotViewer.Utils.getBuckets = function (filterList, category, valueFn, labelFn) {
    if (valueFn == undefined) valueFn = function (value) { return value.value; }
    if (labelFn == undefined) labelFn = function (value) { return value.label.toString();}

    var bkts = [], value1 = filterList[0].item.getFacetByName(category).values[0], value = valueFn(value1), label = labelFn(value1);
    var bkt = new PivotViewer.Models.Bucket(value1.value, label);
    bkt.addTile(filterList[0]); bkt.addValue(value);
    bkts.push(bkt);
    
    var i = 1, j = 0;
    for (; i < filterList.length; i++) {
        var tile = filterList[i], facet = tile.item.getFacetByName(category);
        if (facet == undefined) break;
        if (tile.missing) continue;
        var flattend = _.flatten(_.pluck(facet.values, 'value'));

        //var value2 = facet.values[0];
        //if (valueFn(value2) > value) {
        //    value1 = value2;
        //    var label = labelFn(value2), value = valueFn(value2);
        //    bkts[++j] = new PivotViewer.Models.Bucket(value2.value, label);
        //    bkts[j].addTile(tile); bkts[j].addValue(value);
        //}
        //else {
        //    bkts[j].addTile(tile);
        //    bkts[j].endRange = value2.value;
        //}
        for (v = 0; v < facet.values.length; v++) {
            var value2 = facet.values[v];
             label = labelFn(value2), value = valueFn(value2);
                var namedBucket = bucketByName(bkts, value); 
                if (!namedBucket)
                    {
                    namedBucket = new PivotViewer.Models.Bucket(value2.value, label);
                        bkts[++j] = namedBucket;
                    }

                namedBucket.addTile(tile);
                namedBucket.addValue(value);
            //if (valueFn(value2) > value) {
            //    value1 = value2;
            //    var label = labelFn(value2), value = valueFn(value2);
            //    var namedBucket = bucketByName(bkts, value); 
            //    if (!namedBucket)
            //        {
            //             bkts[++j] = new PivotViewer.Models.Bucket(value2.value, label);
            //        }
               
            //    //bkts[j].addTile(tile);
            //    //bkts[j].addValue(value);
            //    namedBucket.addTile(tile);
            //    namedBucket.addValue(value);

            //} else {
            //    //bkts[j].addTile(tile);
            //    //bkts[j].endRange = value2.value;
            //    bkts[j].addTile(tile);
            //    bkts[j].endRange = value2.value;
            //}
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

    if (i != filterList.length && Settings.showMissing) {
        var bkt = new PivotViewer.Models.Bucket("(no info)", "(no info");
        bkts.push(bkt);
        var b = bkts.length - 1;
        for (; i < filterList.length; i++) {
            bkt.addTile(filterList[i]);
            bkts.ids[filterList[i].item.id] = b;
        }
    }
    return bkts;
}

function bucketByName(buckets, name) {
    // optimize with cache later
    for (var i = 0; i < buckets.length; i++) {
        if (buckets[i].hasValue(name)) {
            return buckets[i];
        } 
    }
    return null;
}
PivotViewer.Utils.loadScript = function(scriptName) {
    if ($("script[src*='" + scriptName + "']").length == 0) {
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = scriptName;
        $("head").append(script);
    }
}

PivotViewer.Utils.loadCSS = function (cssName) {
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
