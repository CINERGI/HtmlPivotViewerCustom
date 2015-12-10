(function ($) {

AjaxSolr.ResultWidget = AjaxSolr.AbstractWidget.extend({
  start: 0,

  beforeRequest: function () {
      $(this.target).html($('<img>').attr('src', 'images/ajax-loader.gif'));
      $('#pivotButton').css('background-color', '');
      $('#pivotButton').text('');

  

  },

  facetLinks: function (facet_field, facet_values) {
    var links = [];
    if (facet_values) {
      for (var i = 0, l = facet_values.length; i < l; i++) {
        if (facet_values[i] !== undefined) {
          links.push(
            $('<a href="#"></a>')
            .text(facet_values[i])
            .click(this.facetHandler(facet_field, facet_values[i]))
          );
        }
        else {
          links.push('no items found in current selection');
        }
      }
    }
    return links;
  },

  facetHandler: function (facet_field, facet_value) {
    var self = this;
    return function () {
      self.manager.store.remove('fq');
      self.manager.store.addByValue('fq', facet_field + ':' + AjaxSolr.Parameter.escapeValue(facet_value));
      self.doRequest(0);
      return false;
    };
  },

  afterRequest: function () {
    $(this.target).empty();
    for (var i = 0, l = this.manager.response.response.docs.length; i < l; i++) {
      var doc = this.manager.response.response.docs[i];
      $(this.target).append(this.template(doc));

      var items = [];
      items = items.concat(this.facetLinks('keywords', doc.keywords_ss));
      items = items.concat(this.facetLinks('organisations', doc['contact.organizations_ss']));
      items = items.concat(this.facetLinks('collections', doc['sys.src.collections_ss']));

      var $links = $('#links_' + doc.id);
      $links.empty();
      for (var j = 0, m = items.length; j < m; j++) {
        $links.append($('<li></li>').append(items[j]));
      }
    }
 
  },

  template: function (doc) {
      var snippet = '';
      if (doc.description != undefined) {
          if (doc.description.length > 300) {
              snippet += doc.description.substring(0, 300);
              snippet += '<span style="display:none;">' + doc.description.substring(300);
              snippet += '</span> <a href="#" class="more">more</a>';
          } else {
              snippet += doc.description;
          }
      }

      var output = '<div><h2>' + doc.title + '</h2>';
    output += '<p id="links_' + doc.id + '" class="links"></p>';
    output += '<p>' + snippet + '</p></div>';
      return output;
      //var collection = this.PivotCollection;
      
      //var id = doc.id;
      //var href = "";
      //var name = doc.title;
      //var img = "globe.jpg";
      //var item = new PivotViewer.Models.Item(img, id, href, name);

      //  if (doc.description != undefined) {
      //      item.Description = doc.description;
      //  }
      //  var facetNames = this.manager.response.facet_counts['facet_fields'];
      //  for (var f in facetNames) {
      //      pvF = new PivotViewer.Models.Facet(f);
      //      if (doc[f] != undefined) {
      //          for (var fval in doc[f]) {
      //              var fv = new PivotViewer.Models.FacetValue(doc[f][fval]);
      //              pvF.AddFacetValue(fv);
      //          }
      //          item.Facets.push(pvF);
      //      }
            
          
      //}
      //  collection.Items.push(item);
        
      //return '';
  },
 
  init: function () {
    $(document).on('click', 'a.more', function () {
      var $this = $(this),
          span = $this.parent().find('span');

      if (span.is(':visible')) {
        span.hide();
        $this.text('more');
      }
      else {
        span.show();
        $this.text('less');
      }

      return false;
    });
      //
    var cl = window.location;
    var basepath = location.pathname.substring(0, location.pathname.lastIndexOf("/"));
    var imagecache = cl.protocol + "//" + cl.host + '/' + basepath + 'projects/images/panomedia';
    //$(document).ready(function () {
    //    help();
    //    about();
    //    $('#pivotviewer').PivotViewer({

    //        Loader: new PivotViewer.Models.Loaders.ObjectLoader(PivotCollection),
    //        //Loader: new PivotViewer.Models.Loaders.CSVLoader('projects/googlesheets/SEN CINERGI-ResourceInventoryTemplate - Basic Metadata Template.csv'),
    //        GoogleAPIKey: "AIzaSyAnPWLPKMYKQZa2g1p11d_vllwwT7CFdQg",
    //        MapService: "Google",
    //        //GeocodeService: "Nominatim",
    //        GeocodeService: "Google",
    //        ViewerState: "$view$=1",
    //        ImageController: new PivotViewer.Views.SimpleImageController(imagecache),
    //        // View: "Map",
    //    });
      //});

  //  $("#slider").slideReveal({
  //      trigger: $("#trigger"),
  //      push: false
  //  });
      //  $("#slider").slideReveal("show");

    }
});

})(jQuery);