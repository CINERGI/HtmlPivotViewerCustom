authoring_cards = function (csvloader) {
    var new_data = [];
    var permutation = [];
    var column_subset = [];
    var row_subset = [];
    var classes = [];
    var name_column = "";

    $("#loader").append(csvloader);

    $("#pv-modal-text").html("<div id=\"pv-card\"></div><button type=button id=\"pv-card-previous\">Previous</button><button type=submit id=\"pv-card-submit\">Next</button>");

    var cards = [], current_card = 0;

    cards.push(function () {
        return "Project Name:<p><input id=\"project-name\">";
    });

    cards.push(function () {
        if($("#project-name").val() != undefined)
            csvloader.project = $("#project-name").val();

        var html = "Columns to Include:<p><select id=\"column-select\" multiple size=20>";
        var columns = csvloader.data[0];
        for (var i = 0; i < columns.length; i++) {
            html += "<option value=" + i + ">" + columns[i] + "</option>";
        }
        html += "</select>";
        return html;
    });

    cards.push(function () {
        column_subset = $("#column-select").val() || [];
        new_data = [];
        for (var i = 0; i < csvloader.data.length; i++) {
            new_data.push(new Array());
            for (var j = 0; j < column_subset.length; j++) {
                new_data[i].push(csvloader.data[i][column_subset[j]]);
            }
        }
        return "Number of Rows to Include:<br>(Randomly selected if not all)<p><input id=\"row-select\" size=4 maxsize=4 value=" + (csvloader.data.length - 1) + "> out of " + (new_data.length - 1);
    });

    cards.push(function () {
        row_subset = $("#row-select").val();

        if (row_subset < new_data.length - 1) permutation = permute(new_data, row_subset);
        else permutation = new_data;
        
        var columns = permutation[0];
        var html = "Name Column:<p><select id=\"name-column\"><option value=-1>Generate Unique ID</option>";
        for (var i = 0; i < columns.length; i++) {
            html += "<option value=" + i + ">" + columns[i] + "</option>";
        }
        html += "</select>";
        return html;
    });

    cards.push(function () {
        name_column = $("#name-column").val();
        var columns = permutation[0];
        var html = "Image Categories:<p><select id=\"class-select\" multiple size=20>";
        for (var i = 0; i < columns.length; i++) {
            html += "<option value=" + i + ">" + columns[i] + "</option>";
        }
        html += "</select>";
        return html;
    });

    cards.push(function () {
        classes = $("#class-select").val();
 
        var html = "<form enctype=\"multipart/form-data\" method=\"post\" id=\"upload\">Image Association:<p>";
        
        for (var i = 0; i < classes.length; i++) {
            var set = {};
            var column = classes[i];
            html += permutation[0][column] + "<br>";

            for (var j = 1; j < permutation.length; j++) {
                if (!set.hasOwnProperty(permutation[j][classes[i]])) {
                    set[permutation[j][column]] = true;
                }
            }

            for (var value in set) {
                if (value.trim() == "") value = "(missing)";
                else value = value.replace(/[\.\s]/g, "_");
                html += value + ": <input type=file name=\"class-" + permutation[0][column].replace(/[\.\s]/g, "_") + "-" + value + "\" accept=\".jpg,.gif,.png\"><br>"
            }

            html += "<p>";
        }
        html += "</form>";
        return html;
   
    });

    $("#pv-card").html(cards[0]());

    $("#pv-card-previous").on("click", function (e) {
        if (current_card == 0) return;
        else $("#pv-card").html(cards[--current_card]());
    });

    $("#pv-card-submit").on("click", function (e) {
        if (current_card == cards.length - 1) {

            var columns = permutation[0];

            //determine column type
            //var cutoff = permutation.length < 10 ? permutation.length : 10;
            var cutoff = permutation.length;
            for (var j = 0; j < columns.length; j++) {
                var i = 1;
                var cur_cutoff = cutoff;
                for (; i < cur_cutoff; i++) {
                    if(permutation[i][j].trim() == "") {
                        //if (++cur_cutoff > permutation.length) break;
                        continue;
                    }
                    var format = moment.parseFormat(permutation[i][j]);
                    if((format.indexOf("H") === -1 && format.indexOf("M") === -1) || !moment(permutation[i][j], format).isValid()) break;
                }
                if (i == cur_cutoff) {
                    columns[j] += "#date";
                    continue;
                }
                cur_cutoff = cutoff;
                var ordinal = true;
                for (i = 1; i < cur_cutoff; i++) {
                    if (permutation[i][j].trim() == "") {
                        //if (++cur_cutoff > permutation.length) break;
                        continue;
                    }
                    if (!/(?:-?\d+\.?\d*)|(?:-?\d*\.?\d+)/.test(permutation[i][j].replace(/,/g, ""))) break;
                    if (ordinal) {
                        var value = parseFloat(permutation[i][j].replace(/,/g, "").match(/(?:-?\d+\.?\d*)|(?:-?\d*\.?\d+)/)[0]);
                        if (value < 0 || value >= 10 || !Number.isInteger(value)) ordinal = false;
                    }
                }
                if (i == cur_cutoff) {
                    /*for (i = 1; i < permutation.length; i++) {
                        if (permutation[i][j].trim() == "") continue;
                        var value = parseFloat(permutation[i][j].replace(/,/g, "").match(/(?:-?\d+\.?\d*)|(?:-?\d*\.?\d+)/)[0]);
                        if (value < 0 || value >= 10 || !Number.isInteger(value)) break;
                    }*/
                    //if (i == permutation.length) columns[j] += "#ordinal";
                    if (ordinal) columns[j] += "#ordinal";
                    else columns[j] += "#number";
                    continue;
                }
                /*cur_cutoff = cutoff;
                for (i = 1; i < cur_cutoff; i++) {
                    if (permutation[i][j].trim() == "") {
                        if (++cur_cutoff > permutation.length) break;
                        continue;
                    }
                    if (!permutation[i][j].startsWith("http://") && !permutation[i][j].startsWith("www.")) break;
                }
                if (i == cur_cutoff) columns[j] += "#link";*/
            }

            permutation[0].push("#img");
            permutation[0].push("#name");
            var index = permutation[0][classes[0]].indexOf("#");
            var img_column = index === -1 ? permutation[0][classes[0]] : permutation[0][classes[0]].substring(0, index);
            for (var i = 1; i < permutation.length; i++) {
                var value = permutation[i][classes[0]];
                if (value.trim() == "") value = "(missing)";
                else value = value.replace(/[\.\s]/g, "_");
                permutation[i].push("class-" + img_column.replace(/[\.\s]/g, "_") + "-" + value);
                if (name_column == -1) permutation[i].push(i);
                else permutation[i].push(permutation[i][name_column]);
            }

            csvloader.data = permutation;

            var fd = new FormData($("#upload")[0]);
            fd.append("project", csvloader.project);
            fd.append("data", JSON.stringify(csvloader.data));
            $.ajax({
                url: "upload_new.php",
                type: "POST",
                data: fd,
                processData: false,
                contentType: false,
                success: function () {
                    $.publish("/PivotViewer/Authoring/Completed", null);
                }
            });
        }
        else $("#pv-card").html(cards[++current_card]());
    });
};

//http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
permute = function (array, size) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    var permutation = new Array(), cutoff = array.length - size, i = 1;

    if (size > array.length - 1) size = array.length - 1;

    permutation[0] = array[0];

    while (cutoff !== currentIndex) {
        currentIndex--;
        randomIndex = Math.floor(Math.random() * currentIndex) + 1;
        permutation[i++] = array[randomIndex];
        array[randomIndex] = array[currentIndex];
    }

    return permutation;
}