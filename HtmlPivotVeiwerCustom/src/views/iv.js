var IV = { _isOn: false, count: 0 };

IV.on = function () {
    if (IV._isOn) return;
    IV._isOn = true;

    var fn = function (e) {

        var that = $(this), category = PivotCollection.getCategoryByName(PV.uncleanName(that.attr("facet")));

        if (category.isDateTime()) return false;

        if (that.attr("mode") == "iv") {
            that.find(".pv-iv-code").remove();
            category.doFilter = true;
            that.children().css("color", "black");
            that.removeAttr("mode");
            that.next().find(".pv-facet-value").show();
            that.next().find(".pv-facet-iv").remove();
            that.next().find(".pv-facet-value-label").css("color", "black");

            var s = that.next().find(".pv-facet-numericslider");
            s.modSlider("values", [s.modSlider("option", "min"), s.modSlider("option", "max")]);
            s.parent().find('.pv-facet-numericslider-range-val').text(s.modSlider("option", "min") + " - " + s.modSlider("option", "max"));

            $.publish("/PivotViewer/Views/IVFiltered");
            return false;
        }
        else if(that.attr("mode") != undefined || that.next().find(".pv-facet-value:checked").length != 0) return false;

        that.find("a").append(" <span class='pv-iv-code'>(" + String.fromCharCode(65 + IV.count++) + ")</span>");

        that.attr("mode", "iv");
        that.children().css("color", "blue");

        var category = PivotCollection.getCategoryByName(PV.uncleanName(that.attr("facet")));
        if (!category.uiInit) PV.initUICategory(category);
        category.doFilter = false;

        var items = that.next().find(".pv-facet-value"), labels = items.next();
        items.next().css("color", "blue");

        items.each(function () {
            $(this).after("<input type='checkbox' class='pv-facet-iv' itemvalue='" + $(this).attr("itemvalue") + "'>");
            $(this).next().click(function (e) { clickValue(this); });
        });
        items.hide();

        $.publish("/PivotViewer/Views/IVFiltered");
        return false;
    }
    IV.clickValue = PV.clickValue;
    PV.clickValue = function (checkbox) {
        if ($(checkbox).parent().parent().parent().prev().attr("mode") != "iv") IV.clickValue(checkbox);
        else $.publish("/PivotViewer/Views/IVFiltered");
    }
    IV._stopSlider = PV._stopSlider;
    PV._stopSlider = function (s, category, event, ui) {
        if (s.parent().parent().prev().attr("mode") != "iv") IV._stopSlider(s, category, event, ui);
        else $.publish("/PivotViewer/Views/IVFiltered");
    }
    $(".pv-facet").on("contextmenu.iv", fn);
}

IV.off = function () {
    if (!IV._isOn) return;
    IV._isOn = false;
    var iv = $(".pv-facet[mode='iv']");
    iv.each(function () { PivotCollection.getCategoryByName(PV.uncleanName($(this).attr("facet"))).doFilter = true; })

    iv.find(".pv-iv-code").remove();
    iv.children().css("color", "black");
    iv.next().find(".pv-facet-value-label").css("color", "black");
    $(".pv-facet").off("contextmenu.iv");
    iv.next().find(".pv-facet-value").show();
    iv.next().find(".pv-facet-iv").remove();

    iv.next().find(".pv-facet-numericslider").each(function () {
        var s = $(this);
        s.parent().find('.pv-facet-numericslider-range-val').text(s.modSlider("option", "min") + " - " + s.modSlider("option", "max"));
        s.modSlider("values", [s.modSlider("option", "min"), s.modSlider("option", "max")]);
    });
    iv.removeAttr("mode");

    PV.clickValue = IV.clickValue;
    PV._sliderStop = IV._sliderStop;
}

IV.isOn = function () { return IV._isOn;}

IV.isIV = function (category) {
    if (typeof category == "object") category = category.name;
    var facet = $(".pv-facet[facet='" + PV.cleanName(category.toLowerCase()) + "']");
    return facet.attr("mode") == "iv";
}

IV.getIV = function () {
    var facets = $(".pv-facet[mode='iv']"), categories = [], values = [];

    for (var i = 0; i < facets.length; i++) {
        var category = PivotCollection.getCategoryByName(PV.uncleanName(facets.eq(i).attr("facet")));
        category.ivCode = facets.eq(i).find(".pv-iv-code").html().charAt(1);
        categories.push(category);
        values.push([]);
        if(category.isString()) {
            var checked = facets.next().find(".pv-facet-iv:checked");
            if (checked.length == 0) checked = facets.next().find(".pv-facet-iv");
            for (var j = 0; j < checked.length; j++) {
                var value = PV.uncleanName(checked.eq(j).attr("itemvalue"));
                values[i][value] = true;
                values[i].push(value);
            }
        }
        else {
            var svalues = $('#pv-facet-numericslider-' + PV.cleanName(category.name)).modSlider("option", "values");
            values[i].push(svalues[0]); values[i].push(svalues[1]);
        }
    }
    return { categories: categories, values: values };
}