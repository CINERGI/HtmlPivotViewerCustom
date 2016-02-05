
//arguments
var mySession;
var myheader;
var myfile;
var loglinear;
var logit = "binomial";
var probit;


ocpu.seturl("//132.249.238.135/ocpu/library/stats/R")
{
  var req = ocpu.call("poisson", {
    "link": "log"
  }, function(session){
    loglinear= session;
  });
}

{
  var req = ocpu.call("binomial", {
    "link": "probit"
  }, function(session){
    probit = session;
  });
}

function initRSession(file) {
  myheader = 1!=1;
  myfile = file;
  getData();
}

//actual handler
function getData(){
  ocpu.seturl("//132.249.238.135/ocpu/library/utils/R")

  //perform the request
  var req = ocpu.call("read.csv", {
    file : myfile,
    header: myheader,
    "na.strings": "NA"
  }, function(session){
    console.log("read csv successfully");
    mySession = session;
  });

  //if R returns an error, alert the error message
  req.fail(function(){
    alert("Server error: " + req.responseText);
  });

  //after request complete, re-enable the button
  req.always(function(){
    $("#submitbutton").removeAttr("disabled")
  });
}

function getModel(model, formulaStr){
  ocpu.seturl("//132.249.238.135/ocpu/library/stats/R")
  var modelFamily;
  if(model == "Log Linear"){
    modelFamily = loglinear;
  }else if(model == "Logit"){
    modelFamily = logit;
  }else if(model == "Probit"){
    modelFamily = probit;
  }else{
    alert("Model error");
  }


  var req = ocpu.call("as.formula",{
   "object": formulaStr
  },function(session){
    var request;

    if(model == "Log Linear"){
      ocpu.seturl("//132.249.238.135/ocpu/library/MASS/R")
      request = ocpu.call("loglm",{
        "formula": session,
        "data": mySession
      },function(output){
        output.getConsole(function(outtext){
          var div = document.getElementById('pv-model-result');
          div.innerHTML = outtext;
          });
        });
    }

    else{
      request = ocpu.call("glm",{
        "formula": session,
        "family": modelFamily,
        "data": mySession
        },function(result){
          ocpu.seturl("//132.249.238.135/ocpu/library/base/R")
          result.getConsole(function(outtext){
            var div = document.getElementById('pv-model-result');
            div.innerHTML = outtext;
              });
        });
      }
      //if R returns an error, alert the error message
      request.fail(function(){
        alert("Server error: " + request.responseText);
      });
    });
}
