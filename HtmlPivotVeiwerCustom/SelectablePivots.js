function about() {
var b = "close";
var p = "about";
$("#buttonAbout").html(p);
$("#buttonAbout").click(function () {
    switch (
        $("#buttonAbout").html()) {
        case p: $("#about").animate({ marginTop: "0px", width: "+=250" }, 300, "swing",
          function () { $("#buttonAbout").html(b); $("#about-body").show() }); break;
        case b: $("#about").animate({ marginTop: "-540px", width: "+=-250" }, 300, "swing", function () { $("#about-body").hide(); $("#buttonAbout").html(p) }); break;
    }

});
}

function help() {
var hb = "close";
var hp = "help";
$("#buttonHelp").html(hp);
$("#buttonHelp").click(function () {
    switch (
        $("#buttonHelp").html()) {
        case hp: $("#help").animate({ marginTop: "0px", width: "+=250" }, 300, "swing",
          function () { $("#buttonHelp").html(hb); $("#help-body").show() }); break;
        case hb: $("#help").animate({ marginTop: "-540px", width: "+=-250" }, 300, "swing", function () { $("#buttonHelp").html(hp); $("#help-body").hide() })
    }

});
}

