(function ($) {

    $(function () {
        Manager = new AjaxSolr.Manager({
            solrUrl: 'http://cinergi.sdsc.edu/solr/collection1/'
           
        });
        Manager.addWidget(new AjaxSolr.ResultWidget({
            id: 'result',
            target: '#docs'
        }));

       //// var fields = ['keywords_ss', 'contact.organizations_ss', 'apiso.Subject_t', 'apiso.TopicCategory_ss', 'apiso.Type_s'];
       // var fields = [
       //     { name: 'Keyword', field: 'keywords_ss' }, 
       //     { name: 'Organization', field: 'contact.organizations_ss' }, 
       //     { name: 'Subject', field: 'apisoapiso.Subject_t' }, 
       //     { name: 'Topic Category', field: 'apiso.TopicCategory_ss' },
       //     { name: 'Type', field: 'apiso.Type_s' },
       // ];
        var infoFields = [{ name: 'Publication Date', field: 'apiso.PublicationDate_tdt' },
        { name: 'Other Constraints', field: 'apiso.OtherConstraints_ss' },
         { name: 'Metadata Link', field: 'url.metadata_s' },
         { name: 'Abstract', field: 'apiso:Abstract_t' }, ]
        var fields = [
        new SolrFacet('Keyword', 'keywords_ss', FACETTYPE.String, true),

        //new SolrFacet('Subject', 'apisoapiso.Subject_t', FACETTYPE.String, false), // same as keyword_txt
           new SolrFacet('Topic Category', 'apiso.TopicCategory_ss', FACETTYPE.String, true),
                new SolrFacet('Organization', 'contact.organizations_ss', FACETTYPE.String, true),
                new SolrFacet('Authors', 'contact.people_ss', FACETTYPE.String, true),
  // new SolrFacet('Publication Date', 'apiso.PublicationDate_tdt', FACETTYPE.DateTime, false),
           new SolrFacet('Publication Date', 'apiso.PublicationDate_tdt', FACETTYPE.Info, false),
        new SolrFacet('Type', 'apiso.Type_s', FACETTYPE.String, false),
        new SolrFacet('Other Constraints', 'apiso.OtherConstraints_ss', FACETTYPE.Info, true),
       new SolrFacet('Metadata Link', 'url.metadata_s', FACETTYPE.Link, true),
        new SolrFacet('Abstract', 'apiso:Abstract_t', FACETTYPE.Info, false),
       // new SolrFacet('location', 'envelope_geo', FACETTYPE.Geom, false), // must be location to be used in map
         new SolrFacet('CINERGI', 'sys.src.collections_ss', FACETTYPE.String, true),

        ];
        Manager.addWidget(new AjaxSolr.PivotResultWidget({
            id: 'pivot',
            target: '#pivotviewer',
            fields: fields,
            infoFeilds: infoFields
        }));
        Manager.addWidget(new AjaxSolr.PagerWidget({
            id: 'pager',
            target: '#pager',
            prevLabel: '&lt;',
            nextLabel: '&gt;',
            innerWindow: 1,
            renderHeader: function (perPage, offset, total) {
                $('#pager-header').html($('<span></span>').text('displaying ' + Math.min(total, offset + 1) + ' to ' + Math.min(total, offset + perPage) + ' of ' + total));
            }
        }));

       // var fields = ['keywords_ss', 'contact.organizations_ss'];
        for (var i = 0, l = fields.length; i < l; i++) {
            Manager.addWidget(new AjaxSolr.TagcloudWidget({
                id: fields[i].field,
                target: '#' + fields[i].field.replace('.', ''),
                field: fields[i].field
            }));
        }
        Manager.addWidget(new AjaxSolr.CurrentSearchWidget({
            id: 'currentsearch',
            target: '#selection'
        }));
        Manager.addWidget(new AjaxSolr.TextWidget({
            id: 'text',
            target: '#search'
        }));
        // Manager.addWidget(new AjaxSolr.AutocompleteWidget({
        //    id: 'text',
        //    target: '#search',
        //    fields: ['keywords', 'contact.organizations_ss', 'description']
        //}));
        //Manager.addWidget(new AjaxSolr.CountryCodeWidget({
        //    id: 'countries',
        //    target: '#countries',
        //    field: 'countryCodes'
        //}));
        //Manager.addWidget(new AjaxSolr.CalendarWidget({
        //    id: 'calendar',
        //    target: '#calendar',
        //    field: 'apiso.PublicationDate_tdt'
        //}));
        Manager.init();
        Manager.store.addByValue('q', '*:*');
        //var fieldnames = _.pluck(fields, 'field');
        var fieldnames = _.pluck(
            _.where(fields,{facetType:FACETTYPE.String}),'field'
             );
        var params = {
            facet: true,
            'facet.field': fieldnames,
            'facet.limit': 20,
            'facet.mincount': 1,
            'f.topics.facet.limit': 50,
            'f.countryCodes.facet.limit': -1,
            'rows':10,
   //         'facet.date': 'date',
   //         'facet.date.start': '1987-02-26T00:00:00.000Z/DAY',
   //         'facet.date.end': '1987-10-20T00:00:00.000Z/DAY+1DAY',
   //         'facet.date.gap': '+1DAY',
            'json.nl': 'map'
        };
        for (var name in params) {
            Manager.store.addByValue(name, params[name]);
        }
        Manager.doRequest();
    });

    $.fn.showIf = function (condition) {
        if (condition) {
            return this.show();
        }
        else {
            return this.hide();
        }
    };


})(jQuery);

