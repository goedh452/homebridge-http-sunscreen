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
	this.currentPositionState = 0; // Indicator for Increasing, Decreasing or Idle; ignored by iOS, so always 0
    	this.lastPosition = 0;
	this.triggeredByIOS = true; // Indicator if the value is set from iOS with the setTargetPosition function
	
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
				that.sunscreenService.getCharacteristic(Characteristic.CurrentPosition).updateValue(level);
				
				if (!that.triggeredByIOS)
				{
					that.log("Movement not triggered by iOS: set TargetPosition to " + level);
					that.sunscreenService.getCharacteristic(Characteristic.TargetPosition).updateValue(level);
				}
			} 
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
		this.triggeredByIOS = true;
		
		if (!this.levelUrl) 
		{
			this.log("Ignoring request: Level URL not defined in config");
			callback(new Error("No level url defined."));
			return;
		}

		this.currentTargetPosition = position;
		const moveUp = (this.currentTargetPosition >= this.lastPosition);
    		//this.sunscreenService.setCharacteristic(Characteristic.PositionState, (moveUp ? 1 : 0));
		
		this.log(moveUp ? "Moving up" + ": Setting new target position: " + position : "Moving down" + ": Setting new target position: " + position);
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
		this.triggeredByIOS = false;
		
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
		
		return [this.sunscreenService];
	}
};
