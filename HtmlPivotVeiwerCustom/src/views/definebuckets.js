var DB = { _isOn: false };

DB.on = function () {
    if (DB._isOn) return;
    DB._isOn = true;

    var reset = function (e) {
        var that = $(e.target);
        that.parent().parent().parent().prev().removeAttr("mode");
        var siblings = that.parent().parent().find(".pv-facet-order");
        siblings.siblings(".pv-facet-value").show();
        siblings.siblings(".pv-facet-value-label").off(".db");
        siblings.siblings(".pv-facet-value-label").one("contextmenu.db", fn);
        siblings.remove();
    }

    var fn = function (e) {
        var that = $(e.target);
        if (that.hasClass(".pv-facet-value-label")) that = that.siblings(".pv-facet-value");

        if (that.parent().parent().parent().prev().attr("mode") != undefined) {
            that.one("contextmenu.db", fn)
            return false;
        }

        that.off("contextmenu.db");
        that.parent().parent().parent().prev().attr("mode", "db");
        var siblings = that.parent().parent().find(".pv-facet-value");
        var checked = siblings.filter(".pv-facet-value:checked");

        var dropdown = "<select class='pv-facet-order'><option value='-1'>--";
        for (var i = 1, max = siblings.length > 9 ? 9 : siblings.length; i <= max; i++) dropdown += "<option value='" + i + "'>" + i;
        dropdown += "</select>";
        siblings.after(dropdown);

        if (checked.length == 0) siblings.siblings(".pv-facet-order").val(1);
        else checked.siblings(".pv-facet-order").val(1);

        siblings.hide();

        siblings.siblings(".pv-facet-value-label").off("contextmenu.db");
        siblings.siblings(".pv-facet-order").on("contextmenu.db", function(e) {
            reset(e);
            PV.filterViews();
            return false;
        });

        siblings.siblings(".pv-facet-value-label").bindFirst("click.db", function (e) {
            var order = $(this).siblings().filter(".pv-facet-order");
            if (order.val() == -1) order.val(1);
            else order.val(-1);
            e.stopImmediatePropagation();
            order.change();
        });

        siblings.siblings(".pv-facet-order").change(function () {
            var that = $(this), checked = that.parent().parent().find(".pv-facet-value:checked");
            if (checked.length == 0) {
                if (that.val() == -1) {
                    that.parent().siblings().find(".pv-facet-value").prop("checked", true);
                    PV.filterCollection();
                }
                PV.filterCollection();
            }
            else if (that.val() == -1 && that.siblings(".pv-facet-value:checked").length != 0) that.siblings(".pv-facet-value").click();
            else if (that.val() != -1 && that.siblings(".pv-facet-value:checked").length == 0) that.siblings(".pv-facet-value").click();
            else PV.filterCollection();
        });

        siblings.siblings(".pv-facet-value-label").one("contextmenu.db", function(e) {
            reset(e);
            PV.filterViews();
            return false;
        });

        PV.filterViews();
        return false;
    }

    var reset2 = function (e) {
        var that = $(e.target);
        if (that.hasClass("ui-slider-handle")) that = that.parent();
        that.parent().parent().prev().removeAttr("mode");
        that.off(".db");
        var values = that.modSlider("option", "values");
        that.modSlider("option", "values", [values[0], values[values.length - 1]]);
        that.modSlider("option", "range", true);
        that.parent().find('.pv-facet-numericslider-range-val').text(values[0] + " - " + values[values.length - 1]);
        that.modSlider("option", "slide", function (e, ui) {
            $(this).parent().find('.pv-facet-numericslider-range-val').text(ui.values[0] + " - " + ui.values[ui.values.length - 1]);
        });
        that.one("contextmenu.db", fn2);
    }

    var fn2 = function(e) {
        var that = $(this);
        if (that.parent().parent().prev().attr("mode") != undefined) {
            that.one("contextmenu.db", fn2)
            return false;
        }
        that.parent().parent().prev().attr("mode", "db");
        that.modSlider("option", "range", false);
        that.off("contextmenu.db");

        that.one("contextmenu.db", function (e) {
            reset2(e);
            PV.filterViews();
            return false;
        });

        that.bindFirst("mousedown.db", function (e) {
            if (e.which != 1) return false;
            if (!e.target || !$(e.target).hasClass("ui-slider-handle")) {
                var that = $(this);
                var value = (e.pageX - that.offset().left) * (that.modSlider("option", "max") - that.modSlider("option", "min")) / that.width() + that.modSlider("option", "min");
                that.modSlider("addValue", value);
                var values = that.modSlider("option", "values"), text = values[0];
                for (var i = 1; i < values.length; i++) text += " - " + values[i];
                $(this).parent().find('.pv-facet-numericslider-range-val').text(text);
                e.stopImmediatePropagation();
                PV.filterViews();
            }
        });
        that.on("mousedown.db", ".ui-slider-handle", function (e) {
            if (e.which != 1) return false;
            var that = $(this);
            if (that.hasClass("ui-slider")) {
                if (e.target && $(e.target).hasClass("ui-slider-handle")) $(e.target).attr("startx", e.pageX);
            }
            else that.attr("startx", e.pageX);
        });
        that.modSlider("option", "slide", function (e, ui) {
            var that = $(this), index = ui.values.indexOf(ui.value), step = that.modSlider("option", "step");
            if ((index < (ui.values.length - 1) && ui.value >= (ui.values[index + 1] - step)) || (index > 0 && ui.value <= (ui.values[index - 1] + step))) return false;
            var text = ui.values[0];
            for (var i = 1; i < ui.values.length; i++) text += " - " + ui.values[i];
            $(this).parent().parent().find('.pv-facet-numericslider-range-val').text(text);
        });
        that.bindFirst("mouseup.db", ".ui-slider-handle", function (e) {
            if (e.which != 1) return false;
            var that = $(this);
            if (that.hasClass("ui-slider")) {
                if (e.target && $(e.target).hasClass("ui-slider-handle")) that = $(e.target);
            }
            else that = $(this);
            var handles = that.parent().children(".ui-slider-handle"), index = handles.index(that);
            if (that.attr("startx") && (e.pageX - that.attr("startx")) == 0) {
                if (index >= 0 && index < (handles.length - 1)) {
                    that.parent().modSlider("removeValue", index);
                    var values = that.parent().modSlider("option", "values"), text = values[0];
                    for (var i = 1; i < values.length; i++) text += " - " + values[i];
                    $(this).parent().parent().find('.pv-facet-numericslider-range-val').text(text);
                    PV.filterViews();
                }
            }
        });
        PV.filterViews();
        return false;
    }

    $(".pv-facet-value").each(function () {
        var that = $(this), category = PivotCollection.getCategoryByName(that.parent().parent().parent().prev().children("a").attr("title"));
        if (category.isDateTime()) return;
        that.one("contextmenu.db", fn);
        that.siblings(".pv-facet-value-label").on("contextmenu.db", fn);
    });

    $(".pv-facet-numericslider").each(function () {
        var that = $(this);
        that.one("contextmenu.db", fn2);
    });

    $(".pv-facet").on("click.db", function (e) {
        var that = $(this), category = PivotCollection.getCategoryByName(that.children("a").attr("title"));
        if (category.isDateTime()) return;
        else if (category.isNumber() || category.isOrdinal()) {
            that.next().find(".pv-facet-numericslider").each(function () {
                var that = $(this);
                that.off("contextmenu.db");
                that.one("contextmenu.db", fn2);
            });
        }
        else {
            that.next().find(".pv-facet-value").each(function () {
                var that = $(this);
                that.off("contextmenu.db");
                that.one("contextmenu.db", fn);
                that.siblings(".pv-facet-value-label").off("contextmenu.db");
                that.siblings(".pv-facet-value-label").one("contextmenu.db", fn);
            });
        }
    });

    $('.pv-filterpanel-clearall').bindFirst("click.db", function () {
        var facets = $(".pv-facet[mode='db']")
        facets.next().find("li:first-of-type").find(".pv-facet-order").each(function(i, target) {reset({target: target})});
        facets.next().find(".pv-facet-numericslider").each(function(i, target) {reset2({target: target})});
    });
    $('.pv-filterpanel-accordion-heading-clear').bindFirst("click.db", function () {
        var that = $(this);
        if (that.parent().attr("mode") != "db") return;
        that.parent().next().find(".pv-facet-order").eq(0).each(function(i, target) {reset({target: target})});
        that.parent().next().find(".pv-facet-numericslider").each(function(i, target) {reset2({target: target})});
    });

    DB._stopSlider = PV._stopSlider;
    PV._stopSlider = function (s, category, event, ui) {
        var values = s.modSlider("option", "values"), index = values.indexOf(ui.value);
        if (!s.attr("mode") == "db" || index == 0 || index == values.length - 1) DB._stopSlider(s, category, event, ui);
        else PV.filterCollection();
    }
}

DB.off = function () {
    if (!DB._isOn) return;
    DB._isOn = false;
    $(".pv-facet").off("click.db");
    $(".pv-facet-value").off("contextmenu.db");
    $(".pv-facet-value-label").off("contextmenu.db");
    $(".pv-facet-order").remove();
    $(".pv-facet[mode='db']").removeAttr(mode);

    $(".pv-facet-numericslider").off("contextmenu.db");
    $(".pv-facet-numericslider").off("click.db");
    $(".pv-facet-numericslider").off("mousedown.db");
    PV._stopSlider = DB._stopSlider;

    $('.pv-filterpanel-clearall').off("click.db");
    $('.pv-filterpanel-accordion-heading-clear').off("click.db");
    PV.filterViews();
}

DB.isOn = function () { return DB._isOn; }

DB.isDB = function (category) {
    if (typeof category == "object") category = category.name;
    var facet = $(".pv-facet[facet='" + PV.cleanName(category.name.toLowerCase()) + "']");
    return facet.attr("mode") == "db";
}

DB.getBuckets = function (category) {
    if(typeof category == "string") category = PivotCollection.getCategoryByName(category);
    var facet = $(".pv-facet[facet='" + PV.cleanName(category.name.toLowerCase()) + "']");
    if (facet.attr("mode") != "db") return null;

    var buckets = [];
    if (category.isNumber()|| category.isOrdinal()) {
        var values = facet.next().find(".pv-facet-numericslider").modSlider("option", "values");
        for (var i = 0; i < values.length - 1; i++) {
            buckets[i] = new PivotViewer.Models.Bucket(values[i], category.getValueLabel(values[i]), values[i + 1], category.getValueLabel(values[i + 1]));
        }
    }
    else {
        buckets.values = [];
        var li = facet.next().find("li");
        for (var i = 0; i < li.length; i++) {
            var j = li.eq(i).find(".pv-facet-order").val() - 1;
            if (j < 0) continue;
            var value = li.eq(i).find(".pv-facet-value-label").text();
            if (buckets[j] == undefined) buckets[j] = new PivotViewer.Models.Bucket(value, value);
            else buckets[j].endRange = buckets[j].endLabel = value;
            buckets.values[value] = j;
            buckets[j].addValue(value);
        }
        for (i = 0; i < buckets.length; i++) {
            if (buckets[i] == undefined) buckets[i] = new PivotViewer.Models.Bucket(null, "empty");
        }
    }
    return buckets;
}