jQuery.sap.declare("SharedWorkplaceDemo.util.Formatter");

SharedWorkplaceDemo.util.Formatter = {

	uppercaseFirstChar: function(sStr) {
		return sStr.charAt(0).toUpperCase() + sStr.slice(1);
	},

	discontinuedStatusState: function(sStatus) {
		return sStatus ? "Error" : "None";
	},

	discontinuedStatusValue: function(sStatus) {
		return sStatus ? "Discontinued" : "";
	},

	convertDateTime: function(sDate) {
		if (sDate !== null && sDate !== "" && Date.parse(sDate)) {
			var oDate = new Date(sDate);
			var sDateString = oDate.toLocaleString();
			return sDateString;
		} else {
			return sDate;
		}
	},

	convertStatusState: function(sStatus) {
		if (sStatus === "Updated" || sStatus === "New") {
			return "None";
		} else if (sStatus === "Canceled") {
			return "Error";
		} else if (sStatus === "Completed") {
			return "Success";
		}
	},

	convertDate: function(sDate) {
		if (sDate !== null && sDate !== "" && Date.parse(sDate)) {
			var oDate = new Date(sDate);
			var sDateString = oDate.toLocaleDateString();
			return sDateString;
		} else {
			return sDate;
		}
	},
	
	convertTaskIcon: function(sStatus) {
		if (sStatus === "X") {
			return "sap-icon://message-success";
		} else {
			return "sap-icon://pending";
		} 
	},
	
	setToggleComplete: function(sStatus) {
		if (sStatus === "X") {
			return true;
		} else {
			return false;
		} 
	},
	
	currencyValue: function(value) {
		return parseFloat(value).toFixed(2);
	},

	calculatePercent: function(tasks) {
		var totalTask = tasks.length;
		for (var i = 0; i < tasks.length; i++) {
			var singleTask = tasks[i];

			
		}
			
	} 
};