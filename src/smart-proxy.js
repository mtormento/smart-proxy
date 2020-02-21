const log = require('simple-node-logger').createSimpleLogger();
const http = require('http');
const httpProxy = require('http-proxy');

var port = '7000'
var defaultHost = 'http://localhost:5050';
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

const proxy = httpProxy.createProxyServer({
    preserveHeaderKeyCase: true
});
proxy.on('proxyReq', function(proxyReq, req, res, options) {
    proxyReq.write(req.body);
});

proxy.on('proxyRes', function(proxyRes, req, res) {
    log.info('[' + req.device + '] Proxyed ' + req.url + ' request to ' + req.targetHost);
});

proxy.on('error', function (err, req, res, target) {
    log.error('[' + req.device + '] Proxying ' + req.url + ' request to ' + req.targetHost + ' failed: ' + JSON.stringify(err));

    res.writeHead(500, {
        'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
        smartProxyError: err
    }));
});

log.info('default host: ' + defaultHost);
log.info('alternative host: ' + alternativeHost);

const server = http.createServer(function(req, res) {

    req.body = ""

    req.on('readable', function() {
        var data = req.read();
        if (data != null) {
            req.body += data;
        }
    });
    req.on('end', function() {
        req.device = 'unknown';
        req.targetHost = defaultHost;
        var isJson = req.headers['content-type'];
        isJson = isJson ? isJson.includes('application/json') : false;
        if (isJson) {
            try {
                obj = JSON.parse(req.body);
                const value = obj[alternativeJsonKey];
                if (value) {
                    req.device = value;
                }
                if (req.device.startsWith(alternativeJsonValue)) {
                    req.targetHost  = alternativeHost
                }
            } catch (e) {
            }
        }

        proxy.web(req, res, { 
            target: req.targetHost
        });

    });

});

server.listen(port);