/*
TODO
- touch area
- fix "this page is not secure" 
    expired certificate - valid for month prior to making?!
    The certificate is not trusted because it is self-signed
- styling
*/

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

function socketEventParse(socket, namespace) {
    console.log(namespace + ' connected');
    socket.on('disconnect', () => {
        console.log(namespace + ' disconnected');
    });

    // DeviceOrientationEvent
    socket.on('orient', (msg) => {
        maxApi.outlet(namespace, 'orientAlpha', wrap(msg.alpha + 180, 360));
        maxApi.outlet(namespace, 'orientBeta', msg.beta);
        maxApi.outlet(namespace, 'orientGamma', msg.gamma);
    });
    
    // DeviceMotionEvent
    socket.on('motion', (msg) => {
        maxApi.outlet(namespace, 'rateAlpha', msg.alpha);
        maxApi.outlet(namespace, 'rateBeta', msg.beta);
        maxApi.outlet(namespace, 'rateGamma', msg.gamma);
    });
    // if phone doesn't have gyroscope
    socket.on('accel', (msg) => {
        maxApi.outlet(namespace, 'accelX', msg.x);
        maxApi.outlet(namespace, 'accelY', msg.y);
        maxApi.outlet(namespace, 'accelZ', msg.z);
    });
}

player1.on('connection', socket => socketEventParse(socket, "/player1"));
player2.on('connection', socket => socketEventParse(socket, "/player2"));
player3.on('connection', socket => socketEventParse(socket, "/player3"));
player4.on('connection', socket => socketEventParse(socket, "/player4"));

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