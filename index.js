var devapp = {

	//TODO: If you are using SMP, enter the necessary data below
	smpInfo: {
		appID: "",
		server: "",
		port: ""
	},

	//Application Constructor
	initialize: function() {
		this.bindEvents();
	},

	//========================================================================
	// Bind Event Listeners
	//========================================================================
	bindEvents: function() {
		//add an event listener for the Cordova deviceReady event.
		document.addEventListener("deviceready", this.onDeviceReady, false);
	},

	//========================================================================
	//Cordova Device Ready
	//========================================================================
	onDeviceReady: function() {
		console.log("Entering onDeviceReady");
		startApp();
		//TODO: To use SMP: 
		//	1) Comment the line above.
		//	2) Set the server, port, and appID in the smpInfo section above.
		//	3) Uncomment the lines below.

		//	if (devapp.smpInfo.server && devapp.smpInfo.server.length > 0) {
		//	doLogonInit(devapp);
		//	}
	}
};