jQuery.sap.require("SharedWorkplaceDemo.util.Formatter");
jQuery.sap.require("SharedWorkplaceDemo.util.Controller");
jQuery.sap.require("sap.m.MessageBox");
jQuery.sap.require("sap.m.Button");
jQuery.sap.require("sap.m.Dialog");
jQuery.sap.require("sap.m.Text");

SharedWorkplaceDemo.util.Controller.extend("SharedWorkplaceDemo.view.Master", {

	onInit: function() {
		this.oInitialLoadFinishedDeferred = jQuery.Deferred();

		var oEventBus = this.getEventBus();
		oEventBus.subscribe("Detail", "TabChanged", this.onDetailTabChanged, this);

		this.getView().byId("list").attachEventOnce("updateFinished", function() {
			this.oInitialLoadFinishedDeferred.resolve();
			//count items for unique ID of new Item
			var aItems = this.getView().byId("list").getItems();
			window.totalItems = aItems.length;

			oEventBus.publish("Master", "InitialLoadFinished", {
				oListItem: this.getView().byId("list").getItems()[0]
			});
		}, this);
		
		//on phones, we will not have to select anything in the list so we don't need to attach to events
		if (sap.ui.Device.system.phone) {
			this.byId("DeleteCardButton").setEnabled(false);
			this.byId("DeleteCardButton").setVisible(false);
			return;
		}

		this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);

		oEventBus.subscribe("Detail", "Changed", this.onDetailChanged, this);
		oEventBus.subscribe("Detail", "NotFound", this.onNotFound, this);
	},
	
	onRouteMatched: function(oEvent) {
		var sName = oEvent.getParameter("name");

		if (sName !== "main") {
			return;
		}

		//Load the detail view in desktop
		this.getRouter().myNavToWithoutHash({
			currentView: this.getView(),
			targetViewName: "SharedWorkplaceDemo.view.Detail",
			targetViewType: "XML"
		});

		//Wait for the list to be loaded once
		this.waitForInitialListLoading(function() {

			//On the empty hash select the first item
			this.selectFirstItem();
			
		});

	},

	onDetailChanged: function(sChanel, sEvent, oData) {
		var sEntityPath = oData.sEntityPath;
		//Wait for the list to be loaded once
		this.waitForInitialListLoading(function() {
			var oList = this.getView().byId("list");

			var oSelectedItem = oList.getSelectedItem();
			// the correct item is already selected
			if (oSelectedItem && oSelectedItem.getBindingContext().getPath() === sEntityPath) {
				return;
			}

			var aItems = oList.getItems();

			for (var i = 0; i < aItems.length; i++) {
				if (aItems[i].getBindingContext().getPath() === sEntityPath) {
					oList.setSelectedItem(aItems[i], true);
					break;
				}
			}
		});
	},

	onDetailTabChanged: function(sChanel, sEvent, oData) {
		this.sTab = oData.sTabKey;
	},

	waitForInitialListLoading: function(fnToExecute) {
		jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(fnToExecute, this));
	},

	onNotFound: function() {
		this.getView().byId("list").removeSelections();
	},

	selectFirstItem: function() {
		var oList = this.getView().byId("list");
		var aItems = oList.getItems();

		if (aItems.length) {
			oList.setSelectedItem(aItems[0], true);
		}
	},

	onSearch: function() {
		// add filter for search
		var filters = [];
		var searchString = this.getView().byId("searchField").getValue();
		if (searchString && searchString.length > 0) {
			filters = [new sap.ui.model.Filter("Title",
				sap.ui.model.FilterOperator.Contains, searchString)];
		}

		// update list binding
		this.getView().byId("list").getBinding("items").filter(filters);
	},

	onSelect: function(oEvent) {
		// Get the list item, either from the listItem parameter or from the event's
		// source itself (will depend on the device-dependent mode).
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
	},
	showDetail: function(oItem) {
		// If we're on a phone, include nav in history; if not, don't.
		var bReplace = jQuery.device.is.phone ? false : true;
		this.getRouter().navTo("detail", {
			from: "master",
			entity: oItem.getBindingContext().getPath().substr(1),
			tab: this.sTab
		}, bReplace);
	},

	onExit: function(oEvent) {
		var oEventBus = this.getEventBus();
		oEventBus.unsubscribe("Detail", "TabChanged", this.onDetailTabChanged, this);
		oEventBus.unsubscribe("Detail", "Changed", this.onDetailChanged, this);
		oEventBus.unsubscribe("Detail", "NotFound", this.onNotFound, this);
	},
	
	//add button
	showPopup: function(message) {
		jQuery.sap.require("sap.m.MessageToast");
		sap.m.MessageToast.show(message);
	},
	
	_getDialog: function () {
         // create dialog lazily
         if (!this._oDialog) {
            // create dialog via fragment factory
            this._oDialog = sap.ui.xmlfragment("SharedWorkplaceDemo.view.NewCard", this);
            // connect dialog to view (models, lifecycle)
            this.getView().addDependent(this._oDialog);
    
         }
         return this._oDialog;
    },

	onCancelPress: function () {
		this._getDialog().close();
	},
    
    onCreatePress: function () {
		var pad = "0000000000";
		window.totalItems ++;
    	var str = "" + window.totalItems; //unique card ID hack. will have to replace this with running number object
    	var that = this;
		var newTitle = sap.ui.getCore().byId('TitleValue').getValue();
		if(newTitle && newTitle.length > 0){
			var oEntry = {};
			oEntry.Id = pad.substring(str.length) + str;
			oEntry.Title = newTitle;
			var newActionType = sap.ui.getCore().byId('ActionTypeValue').getValue();
			oEntry.ActionType = newActionType;
			oEntry.CreatedBy = "Jeff Chua";
			oEntry.CreatedOn = new Date(); 
			oEntry.Priority = sap.ui.getCore().byId('PriorityValue').getValue();
			oEntry.Status = sap.ui.getCore().byId('StatusValue').getSelectedKey();
			oEntry.Duedate = new Date(sap.ui.getCore().byId('DueDateValue').getValue());
			oEntry.Description = sap.ui.getCore().byId('DescriptionValue').getValue();
			
			var oMasterModel = this.oView.getModel(); 
			oMasterModel.create("/CardSet", oEntry, null, function(){
 				that.showPopup("Item data has been created");
 				that._getDialog().close();
 			},function(){
				alert("Create failed");});
		}else {
			this.showPopup("Card title cannot be blank");		
		}	
	},
	
	onAddPress: function(oEvent) {
		this._getDialog().open();
	},
	
	onDeletePress: function(oEvent) {
		var that = this;
		var oList = this.getView().byId("list");
		var oSelectedItem = oList.getSelectedItem();
		var oEventBus = this.getEventBus();
		var firstItemIndex = 0;
		//simple js for confirmation dialog
		var dialog = new sap.m.Dialog({
			title: 'Confirm',
			type: 'Message',
			content: new sap.m.Text({ text: 'Are you sure you want to delete this card?' }),
			beginButton: new sap.m.Button({
				text: 'Yes',
				press: function () {
					that.oView.getModel().remove(oSelectedItem.getBindingContext().getPath(), null, function() {
						that.showPopup("Card deleted");
						if (that.getView().byId("list").getItems().length > 1) {
							if(that.getView().byId("list").getItems()[0].getSelected()){
								firstItemIndex = 1;
							}
							
							//select first card after deletion
							that.selectFirstItem();
							
							var firstItem = that.getView().byId("list").getItems()[firstItemIndex];
							oEventBus.publish("Master", "InitialLoadFinished", {
								oListItem: firstItem
							});
						}
					},function(){
						alert("Delete failed");
					});	
					dialog.close();
				}
			}),
			endButton: new sap.m.Button({
				text: 'Cancel',
				press: function () {
					dialog.close();
				}
			}),
			afterClose: function() {
				dialog.destroy();
			}
		});

		dialog.open();
	}	
});