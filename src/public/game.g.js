// Due to some annoying issue with safari not executing 
// javascript if it is not from src, I had to isolate
// all of the logic in here. However, after doing so
// an error pop up caused by nanoid and [[rules]] which 
// forced me to just bandaid the issue by changing
// the "*.js" [[rule]] to "*.g.js". 

;(async function () {
/**
 * Used by Display to draw the tanks, etc.
 * */
class Client {
  #messageQueue;
  #socket;
  #id;
  actor;
  #actorPromise;

  constructor() {
    this.#socket = new WebSocket(`${location.origin.replace(/^http/, 'ws')}${location.pathname}`);
    this.#messageQueue = [];
    // Actor to be waited
    this.actor = new Promise((resolve, reject) => {
      this.#actorPromise = {resolve: resolve, reject: reject};
    });
    // Handles the session;
    this.#handleSession();
    // Creates a promise to be used inside handlesession

  }

  getId() {
    return this.#id;
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

  async connect() {

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
        if (message.type === 'wlcm') {
          // 2: Controller; 1: Display
          this.actor = this.#actorPromise.resolve(message.data.actor)
          this.#id = message.data.clientID;
        } else if (message.type === 'err') {
          console.log(message.error);
        } else {
          // Main loop messages are processed inside the 
          // game loop
          this.#messageQueue.push(message);
        }
      } catch (err) {
        // TODO: Display error messages
        console.log(err);
      }

    };

    const onOpen = (event) => {
      // Sends init message as soon as it opens up.
      this.#socket.send(JSON.stringify({ type: 'init' }));
      // Oks the connection is good
      
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
  #permButton;
  #isReady;
  #interval;

  constructor(client) {
    this.#client = client;
    this.#isReady = false;
    this.#input = {
      a: null,
      b: null,
      g: null,
      fire: false
    }

    document.body.innerHTML = ` <div class="top">
                                  <h1>Controller</h1>
                                  <p id="msg">⚠️ Before you can play, you have to press on the bottom below, so we can access your device motion.</p>
                                </div>
                                <span class="centered" id="fire" style='opacity: 0'>Press anywhere on the page to fire the ball!</span>
                              ` 
    document.body.innerHTML += `<button id="ready" class="centered">Ready?</button>`
    const perm = document.getElementById('ready');
    const fire = document.getElementById('fire');
    const msg = document.getElementById('msg');
    // TODO: If time: do acceleration and reverse.
    const self = this;
    perm.onclick = async function(e) {
      e.stopImmediatePropagation(); 
      try {
        await self.handleMotion();
        self.#initializeControls();
      } catch(e) {
        document.body.innerHTML += `<span class="centered" style='width: 20rem'>🚫 <b>${e.message}</b> </span>`;
      } finally {
        // Remove the button no matter what.
        const readyUp = document.getElementById('ready');
        readyUp.style.opacity = '0';
        readyUp.style.zIndex = '-1';
      }
    };
    
    // Starts input reading - change the time interval if you
    // wish to send fewer times per second.
    this.#interval = setInterval(() => this.#update(), 1000/30);
  }
  
  async #initializeControls() {
    // Adds motion events Listeners
    window.addEventListener('deviceorientation', event => {
      this.#input.a = event.alpha;
      this.#input.b = event.beta;
      this.#input.g = event.gamma;
    });
    // Adds Tank Fire Event
    document.body.addEventListener('click', event => {
      this.#input.fire = true;
    });
    // Starts processing input
    this.#isReady = true; 
    // Shows Fire Hint to the player
    fire.style.opacity = 1;
    // Removes the guidance message
    msg.innerText = '';
  }

  #update() {
    if(this.#isReady) {
      this.#processMessages();
      this.#sendInput();
    }
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

  #sendInput() {
    const ws = this.#client.getSocket();
    // Sends the input as Message.Tank.Input
    if(ws.readyState === ws.CLOSED) { return; }
    ws.send(JSON.stringify({
      type: 'input',
      data: {
        tankID: this.#client.getId(),
        input: this.#input
      }
    }));
    this.#input.fire = false;
  }

  async handleMotion() {
    let granted = false;
    if (typeof DeviceOrientationEvent === 'undefined') {
      throw new Error('Device motion is either unacessible or does not exist!');
    }

    // Request Permission for Safari, Chrome And Firefox!
    // Tested in Safari and Chrome (simulator)
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        granted = permission === 'granted';
      } catch(e) {
        granted = undefined;
      }

      if(granted === undefined) {
        throw new Error('Something went wrong when asking for permssion.');
      }
  
      if (!granted) {
        throw new Error('Device Motion permission denied. Please refresh the page or restart the browser :(');
      }
    }  
  }

}

class Display {
  #client;
  #state;
  #engine;
  #world;
  #render;
  #runner;
  #bodies
  #bodySize;
  constructor(client) {
    document.body.innerHTML = '';
    this.#bodySize = 32;
    this.#client = client;
    this.#bodies = {};
    // Although, there is also an engine here this is needed to 
    // draw the bodies. So to make sure there isn't any kind 
    // of collision resolution, all bodies are set to be a sensor 
    // which makes the body to not react on collision!
    // https://brm.io/matter-js/docs/classes/Body.html#property_isSensor
    this.#engine = Matter.Engine.create({
      gravity: {
        scale: 0,
        x: 0,
        y: 0
      }
    });
    this.#world = this.#engine.world;
    this.#render = Matter.Render.create({
      element: document.body,
      engine: this.#engine,
      options: {
        width: 800,
        height: 600,
        pixelRatio: devicePixelRatio,
        wireframes: false,
      }
    });
    // Adds the boundary walls
    this.#addWalls();
    // Before drawing, first process all the messages
    Matter.Render.run(this.#render);
    
    const runner = Matter.Runner.create();
    Matter.Runner.start(runner, this.#engine);
    
    Matter.Events.on(runner, 'beforeUpdate', () => {
      this.#processMessages();
    });
    
  }

  #addWalls() {
    const style = { isStatic: true, isSensor: true };
    Matter.Composite.add(this.#world, [
      Matter.Bodies.rectangle(400, 0, 800, 50, style),
      Matter.Bodies.rectangle(400, 600, 800, 50, style),
      Matter.Bodies.rectangle(800, 300, 50, 600, style),
      Matter.Bodies.rectangle(0, 300, 50, 600, style)  
    ])
  }
//'#f5b862'
//'#76f09b'
//'#ececd1'
//'#f55f5f'
  #addTank({tankID, shape, position, angle}) {
    const turret = Matter.Body.create({
      parts: [Matter.Bodies.circle(position.x, position.y, this.#bodySize/3), // Turret p1
              Matter.Bodies.rectangle(position.x,position.y - this.#bodySize/2, this.#bodySize/3, this.#bodySize/1.75)], // Turret p2
    });
    const tankS = this.#getTankShape(shape, position);
    console.log(tankS);
    const tank = Matter.Body.create({
      parts: [tankS, turret],
      label: 'tank',
      render: { lineWidth: 1},
      isStatic: true,
      isSensor: true,
    });
    Matter.Body.rotate(tank, angle);
    Matter.Composite.add(this.#world, tank);
    this.#bodies[tankID] = tank;
  }

  #getTankShape(shape, position) {
    switch(shape) {
      case 'square':;
        return Matter.Bodies.rectangle(position.x, position.y, this.#bodySize, this.#bodySize);
      case 'triangle':
        return Matter.Bodies.polygon(position.x, position.y, 3, this.#bodySize);
      case 'hexagon':
        return Matter.Bodies.polygon(position.x, position.y, 6, this.#bodySize);
      case 'circle':
        return Matter.Bodies.circle(position.x, position.y, this.#bodySize/2);
    }
    
    return Matter.Bodies.rectangle(position.x, position.y, this.#bodySize, this.#bodySize);
  }

  #updateTank({tankID, shape, position, angle}) {
    const tank = this.#bodies[tankID]
    Matter.Body.rotate(tank, angle);
    Matter.Body.setPosition(tank, position);
  }

  #addBall({ballID, position}) {
    const ball = Matter.Bodies.circle(350, 350, 5, {isStatic: true, isSensor: true});
    Matter.Composite.add(this.#world, ball);
    this.#bodies[ballID] = ball;
  }

  #updateBall({ballID, position}) {
    const body = this.#bodies[ballID];
    Matter.Body.setPosition(body, position);
  }

  #processMessages() {
    this.#client.getMessages().forEach(messages => {
      messages.forEach(msg => {
        switch(msg.type) {
          case 'mov':
            console.log(msg.data.tankID);
            if(!this.#bodies[msg.data.tankID]) {
              this.#addTank(msg.data);
            } else {
              this.#updateTank(msg.data);
            }
            break;
          case 'ball':
            if(!this.#bodies[msg.data.ballID]) {
              this.#addBall(msg.data);
            } else {
              this.#updateBall(msg.data);
            }
            break;
        }
      });
    });
    
    this.#client.clearMessages();
  }

}

  // UI -> Waiting for connection
  // Initializes the client
  const client = new Client();
  // Waits for the actor type: Controller or display; 
  const actorNumber = await client.actor;
  const actor = actorNumber === 2 ? new Controller(client) : new Display(client);

})();

