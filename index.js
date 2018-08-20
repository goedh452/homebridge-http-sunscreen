var Service, Characteristic;
var request = require("request");
var pollingtoevent = require('polling-to-event');


module.exports = function(homebridge) 
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-http-sunscreen", "HttpSunscreen", HttpSunscreen);
};


function HttpSunscreen(log, config) 
{
	this.log = log;
	
	// Get config info
	this.name		= config["name"]          	|| "HTTP Sunscreen";
	this.levelUrl  	        = config["levelUrl"];
	this.checkStatus 	= config["checkStatus"]		|| "no";
	this.pollingInterval    = config["pollingInterval"]   	|| 3000;
	this.statusUrl          = config["statusUrl"];
	this.jsonPath		= config["jsonPath"];
	this.httpMethod         = config["httpMethod"]   	|| "GET";
	
	
	this.get_current_position_callbacks = [];
	this.get_target_position_callbacks = [];
	this.get_current_state_callbacks = [];	
}


HttpSunscreen.prototype = 
{

	httpRequest: function (url, body, method, callback) 
	{
		var callbackMethod = callback;
		
		request({
			url: url,
			body: body,
			method: method,
			rejectUnauthorized: false
			},
			function (error, response, responseBody) 
			{
				if (callbackMethod) 
				{
					callbackMethod(error, response, responseBody)
				}
				else 
				{
					//this.log("callbackMethod not defined!");
				}
			})
	},
		

	getCurrentPosition: function (callback) 
	{
		
		if (!this.levelUrl || !this.jsonPath) 
		{
			this.log("Ignoring request: Missing status properties in config");
			callback(new Error("No status url defined."));
			return;
		}

		var url = this.statusUrl;
				
		this.httpRequest(url, "", "GET", function (error, response, responseBody) 
		{
			if (error) 
			{
				this.log('HTTP get current position function failed: %s', error.message);
				callback(error);
			}
			else 
			{
				var json = JSON.parse(responseBody);
				var level = eval("json." + this.jsonPath);
				
				this.log('Current position: ' + level);
			 	this.sunscreenService.getCharacteristic(Characteristic.CurrentPosition).setValue(level);
				
				callback(null);
			}
		}.bind(this));
	},
	
	
	setTargetPosition: function (position, callback) 
	{
		var url;
		var body;
		
		if (!this.levelUrl) 
		{
			this.log("Ignoring request: Level URL not defined in config");
			callback(new Error("No level url defined."));
			return;
		}

		this.log('Setting new target position: ' + position + ' => ' + this.levelUrl.replace('%position%', position));
		url = this.levelUrl.replace('%position%', position);		
		
		this.httpRequest(url, "", "GET", function (error, response, body)
		{
			if (error)
			{
				that.log("HTTP set target position failed %s", error.message);
			} 
		}.bind(this))	
		
		this.log("HTTP set target position function succeeded!");
		callback();
	},
	
	
	getServices: function ()
	{
		var informationService = new Service.AccessoryInformation();

		informationService
			.setCharacteristic(Characteristic.Manufacturer, "Sunscreen")
			.setCharacteristic(Characteristic.Model, "Sunscreen Model")
			.setCharacteristic(Characteristic.SerialNumber, "Sunscreen");

		this.sunscreenService = new Service.WindowCovering(this.name);
		
		this.sunscreenService.getCharacteristic(Characteristic.CurrentPosition)
			.on('get', this.getCurrentPosition.bind(this));

    		this.sunscreenService.getCharacteristic(Characteristic.TargetPosition)
			.on('get', function(callback) {
        			this.log("TargetPosition getter");
    			}.bind(this))
		
			.on('set', this.setTargetPosition.bind(this));

		this.sunscreenService.getCharacteristic(Characteristic.PositionState)
			.on('get', function() {
        			this.log("PositionState getter");
    			}.bind(this));
		
		
		
//		switch (this.checkStatus)
//		{
//			//Status polling
//			case "once":
//				this.log("Check status: once");
//				var powerState = this.getPowerState.bind(this)
//				var powerStateInt = 0
//				
//				this.valveService
//					.getCharacteristic(Characteristic.Active)
//					.on('set', this.setPowerState.bind(this))
//					.on('get', powerState);
//				
//				if (powerState) { powerStateInt = 1 }
//				else { powerStateInt = 0}
//				
//				this.valveService.getCharacteristic(Characteristic.InUse)
//					.updateValue(powerStateInt);
//				
//                        break;
//			case "polling":
//				that.log("Check status: polling");
//				this.valveService
//					.getCharacteristic(Characteristic.Active)
//					.on('get', function (callback) 
//					{ callback(null, that.statusOn) })
//					
//					.on('set', this.setPowerStatePolling.bind(this))
//				
//			break;
//			default:
//				that.log("Check status: default");
//				this.valveService
//					.getCharacteristic(Characteristic.Active)
//					.on('set', this.setPowerState.bind(this))
//				
//			break;
//              }
		
		return [this.sunscreenService];
	}
};
