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
    LoadCollection: function (collection) {

        this._super(collection);

        
        collection.CollectionBaseNoProxy = this.CollObj.CollectionBaseNoProxy;
        collection.CollectionBase = this.CollObj.CollectionBase;
        collection.FacetCategories = this.CollObj.FacetCategories;
        collection.FacetCategoriesByName = this.CollObj.FacetCategoriesByName;
        collection.Items = this.CollObj.Items;
        collection.ItemsByName = this.CollObj.ItemsByName;
        collection.ItemsById = this.CollObj.ItemsById;
        collection.CollectionName = this.CollObj.CollectionName;
        collection.ImageBase = this.CollObj.ImageBase;
        collection.BrandImage = this.CollObj.BrandImage;
        collection.CopyrightName = this.CollObj.CopyrightName;

        $.publish("/PivotViewer/Models/Collection/Loaded", null);
    },
    LoadColumn: function (category) { },
    GetRow: function (id) {return PivotCollection.GetItemById(id).Facets;}
});