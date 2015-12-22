// Initialize a collection object. 
PivotViewer.SolrLoader = function() {
    var store = new AjaxSolr.ParameterStore();

// Copy the main parameter store.
store.parseString(this.manager.store.string());

// Make any changes you want to the new parameter store.

this.manager.executeRequest('select', store.string(), function (data) {
    // Process the Solr response.
});

};

PivotViewer.Models.Loaders.ObjectLoader = PivotViewer.Models.Loaders.ICollectionLoader.subClass({
    init: function (collectionObject, proxy) {
        if (collectionObject instanceof PivotViewer.Models.Collection)
            this.CollObj = collectionObject;
    },
    loadCollection: function (collection) {
              
        this._super(collection);


        collection.collectionBaseNoProxy = this.CollObj.collectionBaseNoProxy;
        collection.collectionBase = this.CollObj.collectionBase;
       // collection.categories = this.CollObj.categories;
  
       // collection.itemsByName = this.CollObj.itemsByName;
       // collection.itemsById = this.CollObj.itemsById;
        collection.collectionName = this.CollObj.collectionName;
        collection.imageBase = this.CollObj.imageBase;
        collection.brandImage = this.CollObj.brandImage;
        collection.copyrightName = this.CollObj.copyrightName;
        //funky stuff happens in the push.
        _.each(this.CollObj.categories, function(cat) {
            collection.categories.push(cat);
        });

        _.each(this.CollObj.items, function(item) {
            collection.items.push(item);
        });

       $.publish("/PivotViewer/Models/Collection/Loaded", null);
    },
    loadColumn: function (category) { },
    getRow: function (id) {return PivotCollection.getItemById(id).facets;}
});