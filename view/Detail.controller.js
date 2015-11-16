jQuery.sap.require("SharedWorkplaceDemo.util.Formatter");
jQuery.sap.require("SharedWorkplaceDemo.util.Controller");
jQuery.sap.require("SharedWorkplaceDemo.util.GuidGenerator");
jQuery.sap.require("sap/ui/core/Fragment");

SharedWorkplaceDemo.util.Controller.extend("SharedWorkplaceDemo.view.Detail", {

	onInit: function() {
		this.oInitialLoadFinishedDeferred = jQuery.Deferred();

		if (sap.ui.Device.system.phone) {
			//don't wait for the master on a phone
			this.oInitialLoadFinishedDeferred.resolve();
		} else {
			this.getView().setBusy(true);
			this.getEventBus().subscribe("Master", "InitialLoadFinished", this.onMasterLoaded, this);
		}
		this.getRouter().attachRouteMatched(this.onRouteMatched, this);

	},

	onMasterLoaded: function(sChannel, sEvent, oData) {
		if (oData.oListItem) {
			this.bindView(oData.oListItem.getBindingContext().getPath());
			this.getView().setBusy(false);
			this.oInitialLoadFinishedDeferred.resolve();
		} else {
			this.getView().setBusy(false);
		}
	},

	onRouteMatched: function(oEvent) {
		var oParameters = oEvent.getParameters();

		jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(function() {
			var oView = this.getView();

			// when detail navigation occurs, update the binding context
			if (oParameters.name !== "detail") {
				return;
			}

			var sEntityPath = "/" + oParameters.arguments.entity;
			this.bindView(sEntityPath);

			// Which tab?
			var sTabKey = oParameters.arguments.tab;
			this.getEventBus().publish("Detail", "TabChanged", {
				sTabKey: sTabKey
			});

		}, this));

	},

	bindView: function(sEntityPath) {

		var oView = this.getView();
		oView.bindElement(sEntityPath);

		var that = this;
		this.oModel = oView.getModel();
		this.sEntityPath = sEntityPath;
		this.getView().setBusy(true);
		var oCarousel = this.byId("attachmentsCarousel");
		this.clearCarouselImages();

		this.oModel.read(sEntityPath + "/Attachments", {
			success: function(oData, response) {

				if (response.requestUri.indexOf(that.sEntityPath) === -1) {
					that.getView().setBusy(false);
					return;
				}

				that.oAttachmentoData = oData;
				that.appendAttachmentsToCarousel(oData);

				if (oCarousel.getPages()[0].data().attachmentId !== "placeholderId") {
					that.byId("removePhotoButton").setEnabled(true);
				} else {
					that.byId("removePhotoButton").setEnabled(false);
				}
				that.getView().setBusy(false);
			},
			error: function(oError) {
				that.getView().setBusy(false);
				alert(oError.message);
			}
		});
		//Check if the data is already on the client
		if (!oView.getModel().getData(sEntityPath)) {

			// Check that the entity specified actually was found.
			oView.getElementBinding().attachEventOnce("dataReceived", jQuery.proxy(function() {
				var oData = oView.getModel().getData(sEntityPath);
				if (!oData) {
					this.showEmptyView();
					this.fireDetailNotFound();
				} else {
					this.fireDetailChanged(sEntityPath);
				}
			}, this));

		} else {
			this.fireDetailChanged(sEntityPath);
		}
	},
	/**
	 * Take photo event handler
	 */
	handleTakeAPicture: function() {
		if (window.cordova) {
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			var that = this;
			navigator.camera.getPicture(function(photoData) {
				that.createAndUploadImage(photoData);
				oBusyDialog.close();
			}, function(error) {
				oBusyDialog.close();
			}, {
				destinationType: navigator.camera.DestinationType.DATA_URL,
				sourceType: navigator.camera.PictureSourceType.CAMERA,
				encodingType: navigator.camera.EncodingType.JPEG,
				targetWidth: 300
			});
		}
	},

	/**
	 *  Choose photo from gallery event handler
	 */
	handleChooseFromGallery: function() {
		var that = this;
		navigator.camera.getPicture(function(photoData) {
			that.createAndUploadImage(photoData);
		}, function(error) {}, {
			destinationType: navigator.camera.DestinationType.DATA_URL,
			sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY
		});
	},

	appendAttachmentsToCarousel: function(oData) {
		this.clearCarouselImages();
		var that = this;

		// First image in carousel will always be the take photo placeholder
		var oTakePhotoImage = new sap.m.Image({
			src: './images/cameraImage.png',
			press: [that.handleTakeAPicture, that]
		}).data("attachmentId", "placeholderId");

		var oCarousel = this.byId("attachmentsCarousel");
		if (!oData || !oData.results || oData.results.length === 0) {
			oCarousel.addPage(oTakePhotoImage);
		} else {
			for (var i = 0; i < oData.results.length; i++) {
				var record = oData.results[i];

				if (!record.Content) {
					continue;
				}
				var oImage = this.createImageWithBase64Content(record.Content, record.ContentType, '300px').data("attachmentId", record.Id);
				if (oImage) {
					oCarousel.addPage(oImage);
				}
			}
		}

	},

	createImageWithBase64Content: function(sContent, sContentType, width) {
		var oImage = new sap.m.Image({
			src: "data:" + sContentType + ";base64," + sContent,
			width: width
		});
		return oImage;
	},

	addNewImage: function(oData) {

		if (!oData) {
			return;
		}

		var oCarousel = this.byId("attachmentsCarousel");
		var oImage = new sap.m.Image({
			src: "data:image/png;base64," + oData.Content,
			width: "300px"
		}).data("attachmentId", oData.Id);

		oCarousel.insertPage(oImage, 0);

		var oDelegate = {
			onAfterRendering: function() {
				oCarousel.previous();
				oCarousel.removeEventDelegate(oDelegate);
			}
		};

		oCarousel.addEventDelegate(oDelegate);
	},

	clearCarouselImages: function() {
		this.byId("attachmentsCarousel").removeAllPages();
	},

	handleRemovePhoto: function(oEvent) {
		this.openFileDialog('FileRemover');
	},

	handleAddPhoto: function(oEvent) {
		if (window.cordova) {
			var oButton = oEvent.getSource();

			// create action sheet only once
			if (!this._actionSheet) {
				this._actionSheet = sap.ui.xmlfragment("SharedWorkplaceDemo.view.PhotosActionSheet", this);
				this.getView().addDependent(this._actionSheet);
			}

			this._actionSheet.openBy(oButton);
		} else {
			this.openFileDialog('FileUploader');
		}
	},

	openFileDialog: function(sType) {
		if (!this[sType]) {
			this[sType] = sap.ui.xmlfragment(
				"SharedWorkplaceDemo.view." + sType,
				this // associate controller with the fragment
			);
			this.getView().addDependent(this[sType]);
		}
		this[sType].open();

	},

	onAfterDialogOpen: function(oEvent) {
		var that = this;
		$("#fileInput").change(function() {
			var file = document.getElementById('fileInput').files[0];

			that["FileUploader"].setContentWidth("100px");
			that["FileUploader"].setHorizontalScrolling(true);

			if (!file) {
				if (that["FileUploader"].getBeginButton()) {
					that["FileUploader"].getBeginButton().setEnabled(false);
				} else {
					that["FileUploader"].mAggregations.beginButton.setEnabled(false);
				}

			} else {
				if (that["FileUploader"].getBeginButton()) {
					that["FileUploader"].getBeginButton().setEnabled(true);
				} else {
					that["FileUploader"].mAggregations.beginButton.setEnabled(true);
				}
			}
		});
	},

	onDialogCloseButton: function(oEvent) {
		var that = this;
		var file = document.getElementById('fileInput').files[0];
		var imageType = /image.*/;

		if (file) {
			if (file.type.match(imageType)) {
				var reader = new FileReader();
				reader.onload = function(e) {
					var index = reader.result.indexOf(",") + 1;
					var sImage = reader.result.substring(index);
					that.createAndUploadImage(sImage);
				}
				reader.readAsDataURL(file);
			} else {
				alert("File not supported!");
			}
		}

		var sType = oEvent.getSource().data("dialogType");
		this[sType].close();
	},

	onCancelButtonPress: function(oEvent) {
		var sType = oEvent.getSource().data("dialogType");
		this[sType].close();
	},

	onRemoveDialogCloseButton: function(oEvent) {
		var sType = oEvent.getSource().data("dialogType");
		this[sType].close();
		var that = this;
		var attachmentId = null;
		var oPageToRemove = null;
		var oCarousel = that.byId("attachmentsCarousel");
		if (oCarousel.getPages().length === 1 && oCarousel.getPages()[0].data().attachmentId === "placeholderId") {
			return;
		}
		var sImgId = oCarousel.getActivePage();
		for (var i = 0; i < oCarousel.getPages().length; i++) {
			if (oCarousel.getPages()[i].getId() === sImgId) {
				oPageToRemove = oCarousel.getPages()[i];
				attachmentId = oPageToRemove.data().attachmentId;
				break;
			}
		}

		if (attachmentId) {
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			that.oModel.remove("/AttachmentSet(\'" + attachmentId + "\')", {
				async: true,
				success: function(oData, response) {
					oCarousel.removePage(oPageToRemove);
					if (oCarousel.getPages().length === 0) {
						that.appendAttachmentsToCarousel({
							results: []
						});
					}
					if (oCarousel.getPages()[0].data().attachmentId === "placeholderId") {
						that.byId("removePhotoButton").setEnabled(false);
					}
					oBusyDialog.close();

				},
				error: function(oError) {
					alert(oError.message);
					oBusyDialog.close();
				}
			});
		}
	},

	createAndUploadImage: function(sImageContent) {
		//craete new attachment
		var that = this;
		var sGuid = SharedWorkplaceDemo.util.GuidGenerator.generateGuid();
		this.oCurrentItemData = this.getView().getBindingContext().getObject();
		var oNewAttachment = {
			"Id": sGuid.substring(0, 32),
			"Filename": 'image' + sGuid.substring(0, 23) + '.png',
			"ContentType": 'image/png',
			"CardId": this.oCurrentItemData.Id,
			"Content": sImageContent
		};

		this.oModel.create("/AttachmentSet", oNewAttachment, {
			success: function(oData, response) {
				that.addNewImage(oData);
				that.byId("removePhotoButton").setEnabled(true);
				that.removeCameraImageFromCarousel();
			},
			error: function(oError) {
				alert(oError.message);
			}
		});
	},

	removeCameraImageFromCarousel: function() {

		var oCarousel = this.byId("attachmentsCarousel");
		var oPageToRemove = null;
		for (var i = 0; i < oCarousel.getPages().length; i++) {
			if (oCarousel.getPages()[i].data().attachmentId === 'placeholderId') {
				oPageToRemove = oCarousel.getPages()[i];
				break;
			}
		}
		if (oPageToRemove) {
			oCarousel.removePage(oPageToRemove);
		}
	},
	showEmptyView: function() {
		this.getRouter().myNavToWithoutHash({
			currentView: this.getView(),
			targetViewName: "SharedWorkplaceDemo.view.NotFound",
			targetViewType: "XML"
		});
	},

	fireDetailChanged: function(sEntityPath) {
		this.getEventBus().publish("Detail", "Changed", {
			sEntityPath: sEntityPath
		});
	},

	fireDetailNotFound: function() {
		this.getEventBus().publish("Detail", "NotFound");
	},

	onNavBack: function() {
		// This is only relevant when running on phone devices
		this.getRouter().myNavBack("main");
	},

	updateModel: function() {
		var that = this;
		var oBusyDialog = new sap.m.BusyDialog();
		oBusyDialog.open();
		if (!this.oCurrentItemData.Duedate) {
			this.oCurrentItemData.Duedate = new Date();
		} //TODO: remove line below if service supports inline collections
		this.oCurrentItemData.Attachments = undefined;
		this.oModel.update(this.sEntityPath, this.oCurrentItemData, {
			async: true,
			success: function(oData, response) {
				oBusyDialog.close();
				that.showPopup("Item data has been saved");
			},
			error: function(oError) {

				oBusyDialog.close();
				alert(oError.message);
			}
		});
	},
	onSaveSelect: function(oEvent) {
		this.oCurrentItemData = this.getView().getBindingContext().getObject();
		this.oCurrentItemData.Priority = this.byId("numericAttributeInputField").getValue();
		this.oCurrentItemData.Status = this.byId("StatusSelect").getSelectedKey();
		this.oCurrentItemData.Comment = this.byId("textAttributeInputField").getValue();
		this.oCurrentItemData.Duedate = new Date(this.byId("dateAttributeInputField").getValue());
		this.updateModel();
	},

	showPopup: function(message) {
		jQuery.sap.require("sap.m.MessageToast");
		sap.m.MessageToast.show(message);
	},

	onDetailSelect: function(oEvent) {
		sap.ui.core.UIComponent.getRouterFor(this).navTo("detail", {
			entity: oEvent.getSource().getBindingContext().getPath().slice(1),
			tab: oEvent.getParameter("selectedKey")
		}, true);
	},

	onExit: function(oEvent) {
		this.getEventBus().unsubscribe("Master", "InitialLoadFinished", this.onMasterLoaded, this);
	},
	
	//popover screen - tasks
	onOpenTaskList: function (oEvent) {
		// create popover
		if (!this._oPopover) {
			this._oPopover = sap.ui.xmlfragment("popoverNavCon","SharedWorkplaceDemo.view.TaskList", this);
			this.getView().addDependent(this._oPopover);
		}

		// delay because addDependent will do a async rerendering and the popover will immediately close without it
		var oButton = oEvent.getSource();
		jQuery.sap.delayedCall(0, this, function () {
			this._oPopover.openBy(oButton);
		});
		
		//to populate the progress bar percentage for each card's tasklists.
		var that = this;
		var oModel = this.getView().getModel();
		var sEntityPath = that.sEntityPath;
		oModel.read(sEntityPath + "/Tasks", {
			success: function(oData, response) {

				if (response.requestUri.indexOf(that.sEntityPath) === -1) {
					that.getView().setBusy(false);
					return;
				}
				
				that.oTaskoData = oData;
				var totalTask = oData.results.length;
				var doneTask = 0;
				for (var i = 0; i < totalTask; i++) {
					if (oData.results[i].Done === "X"){	
						doneTask++;
					}
				}
				
				var donePercentage = 0;
				if(totalTask !== 0){
					donePercentage = (doneTask/totalTask)*100;
				}
				sap.ui.core.Fragment.byId("popoverNavCon", "taskProgress").setProperty("percentValue", donePercentage);
				sap.ui.core.Fragment.byId("popoverNavCon", "taskProgress").setProperty("displayValue", donePercentage + "%");
				that.getView().setBusy(false);
			},
			error: function(oError) {
				that.getView().setBusy(false);
				alert(oError.message);
			}
		});
	},

	onNavToTask : function (oEvent) {
		var oCtx = oEvent.getSource().getBindingContext();
		var oNavCon = sap.ui.core.Fragment.byId("popoverNavCon", "navCon");
		var oDetailPage = sap.ui.core.Fragment.byId("popoverNavCon", "detail");
		oNavCon.to(oDetailPage);
		oDetailPage.bindElement(oCtx.getPath());
	},

	onNavBackTasks : function (oEvent) {
		var oNavCon = sap.ui.core.Fragment.byId("popoverNavCon", "navCon");
		oNavCon.back();
	}
});