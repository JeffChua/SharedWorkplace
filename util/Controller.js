jQuery.sap.declare("SharedWorkplaceDemo.util.Controller");

sap.ui.core.mvc.Controller.extend("SharedWorkplaceDemo.util.Controller", {
	getEventBus: function() {
		return sap.ui.getCore().getEventBus();
	},

	getRouter: function() {
		return sap.ui.core.UIComponent.getRouterFor(this);
	}
});