const log = require('simple-node-logger').createSimpleLogger();
const http = require('http');
const httpProxy = require('http-proxy');

var port = '7000'
var defaultHost = 'http://gl.co:5050';
var alternativeHost = 'http://www.ansa.it:80';
var alternativeJsonKey = 'device';
var alternativeJsonValue = 'fbk';

if (process.env.PORT) {
    port = process.env.PORT;
}

if (process.env.DEFAULT_HOST) {
    defaultHost = process.env.DEFAULT_HOST;
}

if (process.env.ALTERNATIVE_HOST) {
    alternativeHost = process.env.ALTERNATIVE_HOST;
}

if (process.env.ALTERNATIVE_JSON_KEY) {
    alternativeJsonKey = process.env.ALTERNATIVE_JSON_KEY;
}

if (process.env.ALTERNATIVE_JSON_VALUE) {
    alternativeJsonValue = process.env.ALTERNATIVE_JSON_VALUE;
}

log.info('=================');
log.info('Smart Proxy 0.1.0');
log.info('=================');
log.info('Listening on port ' + port);
var proxy = httpProxy.createProxyServer({});

log.info('default host: ' + defaultHost);
log.info('alternative host: ' + alternativeHost);

var server = http.createServer(function(req, res) {

    var isJson = req.headers['content-type'];
    isJson = isJson ? isJson.includes('application/json') : false;
    var body = "";

    req.on('readable', function() {
        var data = req.read();
        if (data != null) {
            body += data;
        }
    });
    req.on('end', function() {
        var device = 'unknown';
        var targetHost = defaultHost;
        if (isJson) {
            try {
                obj = JSON.parse(body);
                const value = obj[alternativeJsonKey];
                if (value.startsWith(alternativeJsonValue)) {
                    targetHost  = alternativeHost
                }
            } catch (e) {
            }
        }

        proxy.web(req, res, { 
            target: targetHost
        });
        log.info('[' + device + '] Proxying ' + req.url + ' request to ' + targetHost);

        proxy.on('proxyReq', function(proxyReq, req, res, options) {
            proxyReq.write(body);
        });

        proxy.on('error', function (err, req, res) {
            log.error('[' + device + '] Proxying ' + req.url + ' request to ' + targetHost + ' failed: ' + JSON.stringify(err));

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                smartProxyError: err
            }));
        });
    });
});

server.listen(port);