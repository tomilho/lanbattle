// Due to some annoying issue with safari not executing 
// javascript if it is not from src, I had to isolate
// all of the logic in here. However, after doing so
// an error pop up caused by nanoid and [[rules]] which 
// forced me to just bandaid the issue by changing
// the "*.js" [[rule]] to "*.g.js". 

/**
 * Used by Display to draw the tanks, etc.
 * */
class Render {
    #canvas;
    #ctx;
    #gameMaps;

    constructor(canvas) {
        this.#canvas = canvas;
        this.#ctx = canvas.getContext('2d');
        // Only one map for now!
        this.#gameMaps = {
            size: { x: 1600, y: 900 },
            boundaryWalls: [
                [[0, 0], [1, 0]],
                [[1, 0], [1, 1]],
                [[0, 1], [1, 1]],
                [[0, 1], [0, 0]],
            ],
            0: [
                [[0.5, 0.5], [0.5, 0.8]]
                // Inner Walls

            ]
        }
    }

    draw(state) {
        // Checks if some resizing is needed
        this.#resize();
        this.map(0);
        // Draws the tanks position
        /*
        const tanks = state.tanks;
        for(const tank of tanks) {
          this.tank(tank);
        }
        */
    }

    tank(tank) {
        const ctx = this.#ctx;
        const path = new Path2D();
        const [body, turret] = tank.getMesh();
        const scale = 25;
        // Draws the Body
        path.moveTo(tank.getPosition().x + body[0][0] * scale,
            tank.getPosition().y + body[0][1] * scale);
        for (let i = 1; i < body.length; i++) {
            path.lineTo(tank.getPosition().x + body[i][0] * scale,
                tank.getPosition().y + body[i][1] * scale);
        }

        path.closePath();
        // Adds Paths into the canvas
        ctx.fillStyle = 'blue';
        ctx.fill(path);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'yellow';
        ctx.stroke(path);
    }

    map(mapId) {
        const GameMaps = this.#gameMaps;
        const map = GameMaps[mapId];
        const ctx = this.#ctx;
        ctx.strokeStyle = 'black ';
        // Set line width
        ctx.lineWidth = 20;
        ctx.beginPath();
        // Boundary Walls
        for (const wall of GameMaps.boundaryWalls) {
            const [start, end] = wall;
            ctx.moveTo(start[0] * GameMaps.size.x, start[1] * GameMaps.size.y);
            ctx.lineTo(end[0] * GameMaps.size.x, end[1] * GameMaps.size.y);
        }
        ctx.stroke();

        // Inner Walls
        ctx.lineWidth = 30;
        ctx.beginPath();
        for (const wall of map) {
            const [start, end] = wall;
            ctx.moveTo(start[0] * GameMaps.size.x, start[1] * GameMaps.size.y);
            ctx.lineTo(end[0] * GameMaps.size.x, end[1] * GameMaps.size.y);
        }
        ctx.stroke();
    }

    #resize() {
        const canvas = this.#canvas;
        const GameMaps = this.#gameMaps;
        //if(canvas.style.height.startsWith(innerHeight.toString()) && canvas.style.width.startsWith(innerWidth.toString())) {
        //  return false;
        //}
        const dpr = devicePixelRatio;

        canvas.width = GameMaps.size.x * dpr;
        canvas.height = GameMaps.size.y * dpr;

        this.#ctx.scale(dpr, dpr)
        const scaleX = innerWidth / GameMaps.size.x;
        const scaleY = innerHeight / GameMaps.size.y;
        const scaleToFit = Math.min(scaleX, scaleY);

        canvas.style.height = GameMaps.size.y * scaleToFit + 'px';
        canvas.style.width = GameMaps.size.x * scaleToFit + 'px';
        return true;
    }

}

class Client {
    #messageQueue;
    #socket;
    #id;
    constructor() {
        this.#socket = new WebSocket(`${location.origin.replace(/^http/, 'ws')}${location.pathname}`);
        this.#handleSession();
        this.#messageQueue = [];
    }

    getMessages() {
        return this.#messageQueue;
    }

    getSocket() {
        return this.#socket;
    }

    clearMessages() {
        this.#messageQueue = [];
    }

    /**
     * Handles websocket communication. 
     * Messages are delegated to X function.
    */
    async #handleSession() {
        const onMessage = async (event) => {
            try {
                const message = JSON.parse(
                    typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data)
                );
                // REMOVE
                console.log('msg received: ', message);

                if (message.type === 'wlcm') {
                    // 2: Controller; 1: Display
                    const actor = message.data.actor === 2 ? new Controller(this) : new Display(this);
                    this.#id = message.data.clientID;
                    // TODO: do something with QR

                } else if (message.type === 'err') {
                    console.log(message.error);
                } else {
                    // Main loop messages are processed inside the 
                    // game loop
                    this.#messageQueue.push(event.data)
                }
            } catch (err) {
                // TODO: Display error messages
                console.log(err);
            }

        };
        const onOpen = (event) => {
            // Sends init message as soon as it opens up.
            this.#socket.send(JSON.stringify({ type: 'init' }));
        }
        const onClose = (event) => {
            console.log('connection lost')
        }
        const onError = (event) => {
            console.log(event)
        }

        this.#socket.addEventListener('open', onOpen);
        this.#socket.addEventListener('message', onMessage);
        this.#socket.addEventListener('close', onClose);
        this.#socket.addEventListener('error', onError);
    }

}

class Controller {
    #client;
    #state;
    #input;
    constructor(client) {
        this.#client = client;
        this.#input = {
            data: '123',
        }
        this.#handleMotion();
    }

    #processMessages() {
        this.#client.getMessages().forEach(msg => {
            switch (msg.type) {
                case "error":
                    // TODO: NOTIFY ERROR
                    break;
            }
        });

        this.#client.clearMessages();
    }

    #handleMotion() {
        addEventListener('devicemotion', event => {
        })
    }

    #sendInput() {

    }

    #update() {
        this.#processMessages();
        this.#sendInput();
        requestAnimationFrame(() => this.#update());
    }
}

class Display {
    #client;
    #state;
    #render;

    constructor(client) {
        this.#client = client;
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        this.#render = new Render(canvas);
        requestAnimationFrame(() => this.#update());
    }

    #processMessages() {
        this.#client.getMessages().forEach(msg => {
            switch (msg.type) {
                case "tank":
                    // TODO: NOTIFY ERROR
                    break;
            }
        });

        this.#client.clearMessages();
    }

    #update() {
        this.#processMessages();
        this.#render.draw(this.#state);
        requestAnimationFrame(() => this.#update());
    }
}

class Tank {
    getMesh() {
        return [
            // Body
            [[0, 0],
            [0.5, 0],

            [0.5, 0.50],
            [1.5, 0.50],
            [1.5, 0],
            [2, 0],
            [2, 3.25],
            [0, 3.25]],
            // Turret
            []
        ]
    }
}

// Only one map for now...
// Walls Vertices' coordinates are normalized.

;(function () {
    // Initializes the client
    const client = new Client();
})();