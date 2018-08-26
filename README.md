# homebridge-http-sunscreen
A switch plugin for homebridge (https://github.com/nfarina/homebridge) which integrates with HTTP(S) APIs.

A plugin for sunscreens that can be controlled with an API.


# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin: `npm install -g homebridge-http-sunscreen`
3. Update your `config.json` configuration file

# Configuration

Name             | Required    | Description
---------------- | ----------- | --------------------------------------------
accessory        | Yes         | Has to be HttpSunscreen
name             | No          | Name in home app (default HTTP Sunscreen)
levelUrl         | Yes         | URL to set the level of the sunscreen; no up or down URL is used, only the level where 0 is up en 100 is down
statusUrl        | No          | URL to check the status via the API => %position% should be part of the URL and wil be substituted in the code!
pollingInterval  | No          | The pollinginterval in milliseconds to check the level of the sunscreen (default 3000 (3 seconds))
httpMethod       | No          | Method for sending requests (default GET)


Configuration exampe based on Domoticz JSON API:

 ``` 
"accessories": [ 
        {
                "accessory": "HttpSunscreen",
                "name": "Zonnescherm Boven",
                "levelUrl": "http://192.168.1.114:8081/json.htm?type=command&param=switchlight&idx=178&switchcmd=Set%20Level&level=%position%",
                "statusUrl": "http://192.168.1.114:8081/json.htm?type=devices&rid=178",
                "pollingInterval": 5000,
                "jsonPath": "result[0].Level",
                "httpMethod": "GET"
        }
```    
