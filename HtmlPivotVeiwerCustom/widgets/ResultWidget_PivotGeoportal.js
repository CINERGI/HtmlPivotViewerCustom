
solrpivot = function () {
    var mainManager = Manager;
    var globalPivotCollection = PivotCollection;
    // Create a new parameter store.
    var store = new AjaxSolr.ParameterStore();
    var fields = mainManager.widgets['pivot'].fields;
    // Copy the main parameter store.
    store.parseString(Manager.store.string());
    store.addByValue('rows', 1000);

    // Make any changes you want to the new parameter store.

    mainManager.executeRequest('select', store.string(), function (data) {
        // Process the Solr response.
        //var collection = this.PivotCollection;
        var collection = globalPivotCollection;
        //var facetNames = mainManager.response.facet_counts['facet_fields'];
   //     var fields = [
   //{ name: 'Keyword', field: 'keywords_ss' },
   //{ name: 'Organization', field: 'contact.organizations_ss' },
   //{ name: 'Subject', field: 'apisoapiso.Subject_t' },
   //{ name: 'TopicCategory', field: 'apiso.TopicCategory_ss' },
   //{ name: 'Type', field: 'apiso.Type_s' },
   //     ];
   //     var infoFields = [{ name: 'Publication Date', field: 'apiso.PublicationDate_tdt' },
   //     { name: 'Other Constraints', field: 'apiso.OtherConstraints_ss' },
   //      { name: 'Metadata Link', field: 'url.metadata_s' },
   //      { name: 'Abstract', field: 'apiso:Abstract_t' }, ]
        for (var f in fields) {
            var type = PivotViewer.Models.FacetType.String;
            var name = fields[f].name;
            var visible = true;
            var isInfoVisible = true;
            var SearchVisible = true;

            var category = new PivotViewer.Models.FacetCategory(name, type, visible, isInfoVisible, SearchVisible);
            //category.column = i;
            category.isMultipleItems = true;
            globalPivotCollection.FacetCategories.push(category);
            

        }
   
           
        data.response.docs.forEach(function (doc) {



            var id = doc.id;
            var href = "";
            var name = doc.title;
            var img = "globe.jpg";
            var item = new PivotViewer.Models.Item(img, id, href, name);

            if (doc.description != undefined) {
                item.Description = doc.description;
            }
            if (doc['links'] != undefined) {
                for (var link in doc['links']) {
                    var lv = new PivotViewer.Models.ItemLink(link, link);
                    item.Links.push(lv)
                }

            }
            //var facetNames = mainManager.response.facet_counts['facet_fields'];
            //for (var f in facetNames) {
            var fields = mainManager.widgets.pivot.fields
            for (var f in fields) {
               // pvF = new PivotViewer.Models.Facet(f);
                pvF = new PivotViewer.Models.Facet(fields[f].name);
                if (doc[fields[f].field] != undefined) {
                    if (fields[f].field.indexOf("_ss") > -1) {
                        for (var fval in doc[fields[f].field]) {
                            var fv = new PivotViewer.Models.FacetValue(doc[fields[f].field][fval]);
                            pvF.AddFacetValue(fv);
                        }
                    } else {
                        var fv = new PivotViewer.Models.FacetValue(doc[fields[f].field]);
                        pvF.AddFacetValue(fv);
                    }

                    item.Facets.push(pvF);
                }


            }
            collection.Items.push(item);
        });
        var cl = window.location;
        var basepath = location.pathname.substring(0, location.pathname.lastIndexOf("/"));
        var imagecache = cl.protocol + "//" + cl.host + '/' + basepath + 'projects/images/panomedia';
        globalPivotCollection.ImgBase = imagecache;
        $('#pivotviewer').css({
            position: 'fixed',
            top: '0px',
            left: '0px',
            width: $(window).width(),
            height: $(window).height()
        });
        $('#pivotviewer').PivotViewer({
            Loader: new PivotViewer.Models.Loaders.ObjectLoader(globalPivotCollection),
            //   Loader: new PivotViewer.Models.Loaders.CSVLoader('projects/googlesheets/SEN CINERGI-ResourceInventoryTemplate - Basic Metadata Template.csv'),
            GoogleAPIKey: "AIzaSyAnPWLPKMYKQZa2g1p11d_vllwwT7CFdQg",
            MapService: "Google",
            //GeocodeService: "Nominatim",
            GeocodeService: "Google",
            ViewerState: "$view$=1",
            ImageController: new PivotViewer.Views.SimpleImageController(imagecache),
            // View: "Map",
        });

        $('#docs').empty();
        //$("#slider").slideReveal("hide");
        return '';
    });
    

   
};

function solr_strip_name(aString) {
    aString = aString.replace('_ss', '');
    aString = aString.replace('_s', '');
    aString = aString.replace('_t', '');
    aString = aString.replace('apiso.', '');
    return aString;
}
(function ($) {
    

    AjaxSolr.PivotResultWidget = AjaxSolr.AbstractWidget.extend({
        /** @lends AjaxSolr.AbstractFacetWidget.prototype */
  
      /**
       * @param {Object} attributes
       * @param {String} attributes.field The field to facet on.
       * @param {Number} [attributes.start] This widget will by default set the
       *   offset parameter to 0 on each request.
       * @param {Boolean} [attributes.multivalue] Set to <tt>false</tt> to force a
       *   single "fq" parameter for this widget. Defaults to <tt>true</tt>.
       */
      constructor: function (attributes) {
          AjaxSolr.PivotResultWidget.__super__.constructor.apply(this, arguments);
          AjaxSolr.extend(this, {
              start: 0,
              fields: null,
              infoFields: true
          }, attributes);
      },
      start: 0,

   

  

        afterRequest: function () {
            $(this.target).empty();
            if (this.manager.response.response.numFound < 2000) {
                $('#pivotButton').css('color', 'green');
                var count = this.manager.response.response.numFound.toString();
                $('#pivotButton').text(count);
                $('#pivotButton').click(solrpivot);
            }
            
        }



       
    });
   
      
    
  

})(jQuery);

