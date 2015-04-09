PASSImageController = PivotViewer.Views.IImageController.subClass({
	init: function (baseContentPath) {
        this._items = [];
		
		this.TemplateGenerator = new PivotViewer.Views.ItemTemplateGetter(baseContentPath, '');
		
		this.template = null;
		
		var that = this;
		$.subscribe("/PivotViewer/Views/Template/Loaded", function (evt) {
            if (!evt && !evt.name) {
                return;
            }
			
			that.template = evt.template;
		});
	},
	Setup: function (basePath) {
		this.TemplateGenerator.CreateItemTemplate('pass2012');
		$.publish("/PivotViewer/ImageController/Collection/Loaded", null);
	},
	GetImagesAtLevel: function (item, level) {
		if(!this.template)
			return null;
			
		if (!this._items[item.Img]) {
			if (item.Facets["Category"]) {
				var borderColour = '#000';
				switch(item.Facets["Category"][0].Value){
					case 'Regular Session':
						borderColour = '#7E9F41';
						break;
					case 'Pre-Conference Session':
						borderColour = '#F16729';
						break;
					case 'Spotlight Session':
						borderColour = '#D62A28';
						break;
					case '1/2 Day Session':
						borderColour = '#FBB221';
						break;
					case 'PASS Events':
						borderColour = '#7B11C1';
						break;
					case 'PASS Keynotes':
						borderColour = '#23B1E0';
						break;
					case 'Lightning Talks':
						borderColour = '#7F7F7F';
						break;
				}
				
				$('#pivotviewer').after("<canvas id='" + item.Id + "' class='placeholderPrerender' width='" + this.Width + "' height='" + this.Height + "' style='display:none;' ></canvas>");
				var data = {
					Category: borderColour,
					Title: [ { Text: item.Name, ypos: 190 } ] //TODO: implment word breaker.
				};
				var databound = Mustache.render(this.template, data);
				canvg(item.Id, databound);
				
				var canvas = $('#' + item.Id);
				this._items[item.Img] = canvas[0];
				canvas.remove();
			}
		}
		
		return this._items[item.Img];
	},
	Width: 256,
	Height: 256
});