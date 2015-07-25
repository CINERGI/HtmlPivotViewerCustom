var Manager;
(function ($) {
    $(function () {
        Manager = new AjaxSolr.Manager({
            solrUrl: 'http://evolvingweb.ca/solr/reuters/'
        });
        Manager.init();
    });
})(jQuery);

Manager.store.addByValue('q', '*:*');

Manager.doRequest();
