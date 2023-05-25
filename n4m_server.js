/*
TODO
- page timeouts
- touch area
- styling
*/

//////////////// SERVER ////////////////

const maxApi = require("max-api");
// requires mime and socket.io npm modules
const {createServer} = require("https");
const {readFileSync} = require("fs");

const methods = Object.create(null);
const options = {
    key: readFileSync("server.key"),
    cert: readFileSync("server.cert"),
};

function wrap(inVal, mod) {
    inVal %= mod;
    return inVal < 0 ? inVal + mod : inVal;
}

const server = createServer(options, (request, response) => {
    let handler = methods[request.method] || notAllowed;
    handler(request)
    .catch(error => {
        if (error.status != null) return error;
        return {body: String(error), status: 500};
    })
    .then(({body, status = 200, type = "text/plain"}) => {
        response.writeHead(status, {"Content-Type": type});
        if (body && body.pipe) body.pipe(response);
        else response.end(body);
    });
}).listen(8000)

async function notAllowed(request) {
    return {
      status: 405,
      body: `Method ${request.method} not allowed.`
    };
}

const { Server } = require("socket.io");

const io = new Server(server);
const player1 = io.of("/player1");
const player2 = io.of("/player2");
const player3 = io.of("/player3");
const player4 = io.of("/player4");

async function socketEventParse(socket, namespace) {
    await maxApi.post(namespace.slice(1) + ' connected');
    socket.on('disconnect', async () => {
        await maxApi.post(namespace.slice(1) + ' disconnected');
    });

    // DeviceOrientationEvent
    socket.on('orient', async (msg) => {
        await maxApi.outlet(namespace, 'orientAlpha', wrap(msg.alpha + 180, 360) - 180);
        await maxApi.outlet(namespace, 'orientBeta', msg.beta);
        await maxApi.outlet(namespace, 'orientGamma', msg.gamma);
    });
    
    // DeviceMotionEvent
    socket.on('motion', async (msg) => {
        await maxApi.outlet(namespace, 'rateAlpha', msg.alpha);
        await maxApi.outlet(namespace, 'rateBeta', msg.beta);
        await maxApi.outlet(namespace, 'rateGamma', msg.gamma);
    });
    // if phone doesn't have gyroscope
    socket.on('accel', async (msg) => {
        await maxApi.outlet(namespace, 'accelX', msg.x);
        await maxApi.outlet(namespace, 'accelY', msg.y);
        await maxApi.outlet(namespace, 'accelZ', msg.z);
    });
}

player1.on('connection', async (socket) => await socketEventParse(socket, "/player1"));
player2.on('connection', async (socket) => await socketEventParse(socket, "/player2"));
player3.on('connection', async (socket) => await socketEventParse(socket, "/player3"));
player4.on('connection', async (socket) => await socketEventParse(socket, "/player4"));

let {parse} = require("url");
let {resolve, sep} = require("path");

let baseDirectory = process.cwd();

function urlPath(url) {
    let {pathname} = parse(url);
    let path = resolve(decodeURIComponent(pathname).slice(1));
    if (path!= baseDirectory &&
        !path.startsWith(baseDirectory + sep)) {
            throw {status: 403, body: "Forbidden"};
        }
    return path;
}

const {createReadStream} = require("fs");
const {stat, readdir} = require("fs").promises;
const mime = require("mime");

methods.GET = async function(request) {
    let path;
    if (request.url == '/') {
        path = urlPath(request.url + "index.html");
    } else {
        path = urlPath(request.url);
    }
    let stats;
    try {
        stats = await stat(path);
    } catch (error) {
        if (error.code != "ENOENT") throw error;
        else return {status: 404, body: "File not found"};
    }
    if (stats.isDirectory()) {
        return {body: (await readdir(path)).join("\n")};
    } else {
        return {body: createReadStream(path),
                type: mime.getType(path)};
    }
};

//////////////// GET LOCAL IP ADDRESS ////////////////

const { networkInterfaces } = require('os');

const nets = networkInterfaces();
const results = Object.create(null);

async function displayIPAddress() {
    try {
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
                if (net.family === familyV4Value && !net.internal) {
                    if (!results[name]) {
                        results[name] = [];
                    }
                    results[name].push(net.address);
                }
            }
        }
    } catch(e) {
        await maxApi.post(e);
    }
    
    if (Object.keys(results).length > 0) {
        await maxApi.outlet("IP", "clear");
        await maxApi.post("IP Address Info: ");

        let reversedKeys = Object.keys(results).reverse();
        reversedKeys.forEach(async (key) => {
            await maxApi.outlet("IP", results[key][0]);
            await maxApi.post(`${key}: ${results[key][0]}`);
        });

    } else {
        await maxApi.outlet("IP", "clear");
        await maxApi.outlet("IP", "error", "Could not retrieve IP address");
        await maxApi.post("Could not retrieve IP address");
    }
}
displayIPAddress();