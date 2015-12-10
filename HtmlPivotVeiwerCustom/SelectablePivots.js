//Load default options from "defaults" file
//$.getJSON("pivotLists.json")
//.always(function (defaultOptions) {

//    var keys = Object.keys(defaultOptions);
//    for (var i = 0; i < keys.length; i++) {
//        if (options[keys[i]] == undefined) options[keys[i]] == defaultOptions[keys[i]];
//    }

//    //Image controller
//    if (options.ImageController == undefined) _imageController = new PivotViewer.Views.DeepZoomImageController();
//    else if (options.ImageController instanceof PivotViewer.Views.IImageController)
//        _imageController = options.ImageController;
//    else throw "Image Controller does not inherit from PivotViewer.Views.IImageController.";

//    if (options.Loader == undefined) {
//        $('.pv-wrapper').append("<div id='pv-file-selection' class='pv-modal-dialog modal-lg'><div><div id='pv-modal-text'><p>Use Existing Project:<br><select id='pv-server-file' class='pv-server-file'><option>Select a file</option></select><p>Create New Project:<br><input id='pv-load-file' class='pv-load-file' type=file accept='.csv'></div></div></div>");

//        $pv_server_file = $('#pv-server-file');
//        $.getJSON("../project_list.php", function (data) {
//            $.each(data, function (key, value) {
//                $pv_server_file.append('<option value=\"' + value + '\">' + value + '</option>');
//            });
//        });

//        $pv_server_file.on('change', function (e) {
//            if ($pv_server_file.val().endsWith(".cxml"))
//                Loader = new PivotViewer.Models.Loaders.CXMLLoader("projects/" + $pv_server_file.val());
//            else Loader = new PivotViewer.Models.Loaders.CSVLoader("projects/" + $pv_server_file.val());
//            InitCollectionLoader(options);
//            window.open("#pv-modal-dialog-close", "_self");
//        });

//        $('.pv-load-file').on('change', function (e) {
//            var fileInput = $("#pv-load-file")[0];
//            Loader = new PivotViewer.Models.Loaders.LocalCSVLoader(fileInput.files[0]);
//            InitCollectionLoader(options);
//        });
//    }
//    else {
//        Loader = options.Loader;
//        InitCollectionLoader(options);
//    }

//    window.open("#pv-file-selection", "_self");
//})
//.fail(function (jqxhr, textStatus, error) {
//    var err = textStatus + ", " + error;
//    Debug.Log("Getting defaults file failed: " + err);
//});

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
        case hp: $("#help").animate({ marginTop: "0px", width: "+=250", overflow: "scroll" }, 300, "swing",
          function () { $("#buttonHelp").html(hb); $("#help-body").show() }); break;
        case hb: $("#help").animate({ marginTop: "-540px", width: "+=-250" , overflow: "auto" }, 300, "swing", function () { $("#buttonHelp").html(hp); $("#help-body").hide() })
    }

});
}

function SelectableLoader() {
    $("#pivotMenu").menu({
        select: function (event, ui) {
            var resource = ui.item[0].innerText;
            var cl = window.location;
            var basepath = location.pathname.substring(0, location.pathname.lastIndexOf("/"));
            var imagecache = cl.protocol + "//" + cl.host + '/' + basepath + 'projects/images/panomedia';
            $('#pivotviewer').empty();
            $('#pivotviewer').PivotViewer({
                                //  Loader: new PivotViewer.Models.Loaders.LocalCSVLoader('projects/googlesheet/CIComponentReview - Components.csv'),
                                Loader: new PivotViewer.Models.Loaders.CSVLoader(resource),
                                // Loader: new PivotViewer.Models.Loaders.CSVLoader('projects/googlesheets/CIComponentReview - Components.csv'),
                                GoogleAPIKey: "AIzaSyAnPWLPKMYKQZa2g1p11d_vllwwT7CFdQg",
                                MapService: "Google",
                                GeocodeService: "Nominatim",
                                ViewerState: "$view$=1",
                                ImageController: new PivotViewer.Views.SimpleImageController(imagecache),
                            });
            $.sidr('close', 'sidr');
        }
    }
    );

 
//    $(".pivotlist").click(
//        function () {
//            var resource = $(this).innerText();
//            var imagecache = cl.protocol + "//" + cl.host + '/' + basepath + 'projects/images/panomedia';
//            $('#pivotviewer').PivotViewer({
//                //  Loader: new PivotViewer.Models.Loaders.LocalCSVLoader('projects/googlesheet/CIComponentReview - Components.csv'),
//                Loader: new PivotViewer.Models.Loaders.CSVLoader(resource),
//                // Loader: new PivotViewer.Models.Loaders.CSVLoader('projects/googlesheets/CIComponentReview - Components.csv'),
//                GoogleAPIKey: "AIzaSyAnPWLPKMYKQZa2g1p11d_vllwwT7CFdQg",
//                MapService: "Google",
//                GeocodeService: "Nominatim",
//                ViewerState: "$view$=1",
//                ImageController: new PivotViewer.Views.SimpleImageController(imagecache),
//            });
//            $.sidr('close', 'sidr');
//});

    //if (options.Loader == undefined) {
    //    $('.pv-wrapper').append("<div id='pv-file-selection' class='pv-modal-dialog modal-lg'><div><div id='pv-modal-text'><p>Use Existing Project:<br><select id='pv-server-file' class='pv-server-file'><option>Select a file</option></select><p>Create New Project:<br><input id='pv-load-file' class='pv-load-file' type=file accept='.csv'></div></div></div>");

    //    $pv_server_file = $('#pv-server-file');
    //    $.getJSON("../project_list.php", function (data) {
    //        $.each(data, function (key, value) {
    //            $pv_server_file.append('<option value=\"' + value + '\">' + value + '</option>');
    //        });
    //    });

    //    $pv_server_file.on('change', function (e) {
    //        if ($pv_server_file.val().endsWith(".cxml"))
    //            Loader = new PivotViewer.Models.Loaders.CXMLLoader("projects/" + $pv_server_file.val());
    //        else Loader = new PivotViewer.Models.Loaders.CSVLoader("projects/" + $pv_server_file.val());
    //        InitCollectionLoader(options);
    //        window.open("#pv-modal-dialog-close", "_self");
    //    });

    //    $('.pv-load-file').on('change', function (e) {
    //        var fileInput = $("#pv-load-file")[0];
    //        Loader = new PivotViewer.Models.Loaders.LocalCSVLoader(fileInput.files[0]);
    //        InitCollectionLoader(options);
    //    });
    //}
    //else {
    //    Loader = options.Loader;
    //    InitCollectionLoader(options);
    //}

    //window.open("#pv-file-selection", "_self");
}

