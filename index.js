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
	
	
	// Custom variables
    	this.interval = null;
    	this.timeout = null;
    	this.lastPosition = 100;
    	this.currentPositionState = 2; // stopped by default
    	this.currentTargetPosition = 100; // up by default
	
	var that = this;
	
	// Status Polling
	if (this.statusUrl) 
	{
		var powerurl = this.statusUrl;
		var statusemitter = pollingtoevent(function (done)
			{
			that.httpRequest(powerurl, "", "GET", function (error, response, body)
				{
					if (error)
					{
						that.log('HTTP get status function failed: %s', error.message);
						try 
						{
							done(new Error("Network failure that must not stop homebridge!"));
						} catch (err) 
						{
							that.log(err.message);
						}
					} 
				else 
				{
					done(null, body);
				}
			})
		}, { longpolling: true, interval: that.pollingInterval, longpollEventName: "statuspoll" });


		statusemitter.on("statuspoll", function (responseBody) 
		{
			if (that.jsonPath) 
			{
				var json = JSON.parse(responseBody);
				var level = eval("json." + that.jsonPath);
				
				that.log('Current position from status polling: ' + level);
				that.lastPosition = level;
			} 
          
			that.log("Level is currently:", level);
		});
	}
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
		this.log("FUNCTION: getCurrentPosition");
		
		if (!this.levelUrl || !this.jsonPath) 
		{
			this.log("Ignoring request: Missing status properties in config");
			callback(new Error("No status url defined."));
			return;
		}

		var url = this.statusUrl;
				
		this.httpRequest(url, "", this.httpMethod, function (error, response, responseBody) 
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
				this.lastPosition = level;
				callback(null, this.lastPosition);
			}
		}.bind(this));
	},
	
	
	getTargetPosition: function(callback)
	{
    		this.log("Requested TargetPosition: %s", this.lastPosition);
    		callback(null, this.lastPosition);
	},
	
	
	getPositionState: function(callback)
	{
    		this.log("Requested PositionState: %s", this.currentPositionState);
    		callback(null, this.currentPositionState);
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

		this.currentTargetPosition = position;
		const moveUp = (this.currentTargetPosition >= this.lastPosition);
    		this.log((moveUp ? "Moving up" : "Moving down"));
		this.sunscreenService.setCharacteristic(Characteristic.PositionState, (moveUp ? 1 : 0));
		
		this.log('Setting new target position: ' + position);
		url = this.levelUrl.replace('%position%', position);
		
		this.httpRequest(url, "", this.httpMethod, function (error, response, body)
		{
			if (error)
			{
				this.log("HTTP set target position failed %s", error.message);
			} 
		}.bind(this))	
		
		this.lastPosition = position;
		this.log("Set lastPosition to: " + this.lastPosition);
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
		
		this.log("Set status polling");
		this.sunscreenService.getCharacteristic(Characteristic.CurrentPosition)
			.on('get', function (callback) { callback(null, this.position) });

    		this.sunscreenService.getCharacteristic(Characteristic.TargetPosition)
			.on('get', this.getTargetPosition.bind(this))
			.on('set', this.setTargetPosition.bind(this));

		this.sunscreenService.getCharacteristic(Characteristic.PositionState)
			.on('get', this.getPositionState.bind())	
		
		
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
