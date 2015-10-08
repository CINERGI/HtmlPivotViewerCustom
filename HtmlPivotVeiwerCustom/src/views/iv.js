var IV = { _isOn: false };

IV.on = function () {
    if (IV._isOn) return;

    IV._isOn = true;

    var fn = function (e) {

        var that = $(this);

        if (that.attr("iv")) {
            that.children().css("color", "black");
            that.removeAttr("iv");
            that.next().find(".pv-facet-facetitem").show();
            that.next().find(".pv-facet-iv").remove();
            that.next().find(".pv-facet-facetitem-label").css("color", "black");

            var s = that.next().find(".pv-filterpanel-numericslider");
            s.slider("values", [s.slider("option", "min"), s.slider("option", "max")]);
            s.parent().find('.pv-filterpanel-numericslider-range-val').text(s.slider("option", "min") + " - " + s.slider("option", "max"));

            $.publish("/PivotViewer/Views/IVFiltered");
            return false;
        }
        else if(that.next().find(".pv-facet-facetitem:checked").length != 0) return false;

        that.attr("iv", true);
        that.children().css("color", "blue");

        var category = PivotCollection.getCategoryByName(PV._nameMapping[that.attr("facet")]);
        if (!category.uiInit) PV.initUIFacet(category);

        var items = that.next().find(".pv-facet-facetitem"), labels = items.next();
        items.next().css("color", "blue");

        items.each(function () {
            $(this).after("<input type='checkbox' class='pv-facet-iv' itemvalue='" + $(this).attr("itemvalue") + "'>");
            $(this).next().click(function (e) { facetItemClick(this); });
        });
        items.hide();

        $.publish("/PivotViewer/Views/IVFiltered");
        return false;
    }
    IV.facetItemClick = PV.facetItemClick;
    PV.facetItemClick = function (checkbox) {
        if (!$(checkbox).parent().parent().parent().prev().attr("iv")) IV.facetItemClick(checkbox);
        else $.publish("/PivotViewer/Views/IVFiltered");
    }
    IV.sliderStop = PV.sliderStop;
    PV.sliderStop = function (s, category, event, ui) {
        if (!s.parent().parent().prev().attr("iv")) IV.sliderStop(s, category, event, ui);
        else $.publish("/PivotViewer/Views/IVFiltered");
    }
    $(".pv-facet").on("contextmenu", fn);
}

IV.off = function () {
    if (!IV._isOn) return;
    IV._isOn = false;
    var iv = $(".pv-facet[iv=true]");
    iv.children().css("color", "black");
    iv.next().find(".pv-facet-facetitem-label").css("color", "black");
    $(".pv-facet").off("contextmenu");
    iv.next().find(".pv-facet-facetitem").show();
    iv.next().find(".pv-facet-iv").remove();

    iv.next().find(".pv-filterpanel-numericslider").each(function () {
        var s = $(this);
        s.parent().find('.pv-filterpanel-numericslider-range-val').text(s.slider("option", "min") + " - " + s.slider("option", "max"));
        s.slider("values", [s.slider("option", "min"), s.slider("option", "max")]);
    });
    iv.removeAttr("iv");

    PV.facetItemClick = IV.facetItemClick;
    PV.facetSliderDrag = IV.facetSliderDrag;
}

IV.isOn = function () { return IV._isOn;}

IV.getIV = function () {
    var facets = $(".pv-facet[iv=true]"), categories = [], values = [];
    if (facets.length == 0) facets = $(".pv-facet").eq(0);

    for (var i = 0; i < facets.length; i++) {
        var category = PivotCollection.getCategoryByName(facets.eq(i).children().eq(0).html());
        categories.push(category);
        values.push([]);
        if (category.type == PivotViewer.Models.FacetType.DateTime) {

        }
        else if(category.type == PivotViewer.Models.FacetType.String) {
            var checked = facets.next().find(".pv-facet-iv:checked");
            if (checked.length == 0) checked = facets.next().find(".pv-facet-iv");
            for (var j = 0; j < checked.length; j++) {
                var value = _nameMapping[checked.eq(j).attr("itemvalue")];
                values[i][value] = true;
                values[i].push(value);
            }
        }
        else values[i] = $('#pv-filterpanel-numericslider-' + cleanName(category.name));
    }
    return { categories: categories, values: values };
}