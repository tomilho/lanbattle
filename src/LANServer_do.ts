// TODO: Credit the wordle template
import { Message, Render, Game, Vector2 } from './types';
import { nanoid } from 'nanoid';
import { Engine } from './engine';

interface Controller {
  storage: DurableObjectStorage;
}
interface Enviroment {
  PartyCodes: KVNamespace;
}
/**
 * Durable Object for the LAN party game server.
 * 
 * Although this is not a LAN server, running this at 
 * edge provides a similar experience as if it would 
 * have been run locally.
 */
export class LANServer implements Game.Network {
  storage: DurableObjectStorage;
  env: Enviroment;
  display: { ws: WebSocket, id: string } | undefined;
  clients: WebSocket[];
  interval: number;
  partyCode: string;
  messageBuffer: Message.Incoming[];
  game: Engine;

  constructor(controller: Controller, env: Enviroment) {
    this.storage = controller.storage;
    this.env = env;
    this.display = undefined;
    this.game = new Engine();
    this.messageBuffer = [];
    this.clients = [];
    this.partyCode = '';
    // Starts the main game loop.
    this.interval = setInterval(() => this.mainLoop(), 33.333);
  }

  mainLoop(): void {
    this.processStateMessages();
    this.game.update();
    this.sendState();
  }

  processStateMessages(): void {
    const gameState = this.game.tanks;
    this.messageBuffer.forEach(msg => {
      // Reads player input and overrides existing input.
      switch(msg.type) {
        case 'input':
          const tank = gameState[msg.data.tankID];
          if(!tank) break;
          tank.setInput(msg.data.input);
          break;
      }
    });

    this.messageBuffer = [];
  }

  sendState() {
    // Sends Tank Position and Azimuth to the display.
    let outMessages: Message.Outgoing[] = [];    
    if(this.display) {
      const ws = this.display.ws;
      const tanks = this.game.getTanks();
      const balls = this.game.getBalls();
      // Pushes tank instance
      for(const tankID in tanks) {
        const tank = tanks[tankID];        
        outMessages.push({
          type: 'mov',
          data: {
            tankID: tankID,
            shape: tank.shape,
            position: tank.body.position,
            angle: tank.body.angle,  
          }
        } as Message.Tank.Movement);
      }
      // Pushes all ball instances
      for(const ballID in balls) {
        const ball = balls[ballID];
        outMessages.push({
          type: 'ball',
          data: {
            ballID: ballID,
            position: ball.position as Vector2
          }
        } as Message.Tank.Ball);
        
      }
    
      if(outMessages.length > 0 && this.display.ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(JSON.stringify(outMessages));
      }
    }
  }

  async fetch(request: Request) {
    if(!this.partyCode) {
      const url = new URL(request.url);
      this.partyCode = url.pathname.substring(1);
    }

    // Check if the party is full
    if (this.clients.length === 5) {
      return new Response("The party is full! :(", { status: 403 }) // Forbidden Status
    } 
    
    // To accept the WebSocket request, we create a WebSocketPair (which is like a socketpair,
    // i.e. two WebSockets that talk to each other), we return one end of the pair in the
    // response, and we operate on the other end. Note that this API is not part of the
    // Fetch API standard; 
    let pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Handles the newly created session - Async reception of client message which are stored
    // in a buffer to be later processed on the main game loop. 
    await this.handleSession(server);

    // Now we return the other end of the pair to the client.
    return new Response(null, { status: 101, webSocket: client });
  }

  async handleSession(webSocket: WebSocket): Promise<void> {
    // @ts-ignore
    // Accept our end of the WebSocket.
    webSocket.accept();    

    // Create our session and add it to the clients list.
    const clientID = nanoid();
    this.clients.push(webSocket);

    // Message Receiver Handler.
    const onMessage = async (event: MessageEvent) => {
      try {
        const message = JSON.parse(
          typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data)
        ) as Message.Incoming;

        // Init, Error Message Type -> Processed outside of the game loop
        switch(message.type) {
          case 'init':            
            let actor = undefined;
            if(this.clients.length === 1) {
              actor = Render.DISPLAY;
              this.display = { ws: webSocket, id: clientID };
            } else {
              actor = Render.CONTROLLER;              
              this.game.addTank(clientID);
            }
            // Sends welcome information
            webSocket.send(JSON.stringify({
              type: 'wlcm',
              data: {
                actor: actor,
                clientID: clientID,
                qr: 'no qr for now...',
              }
            } as Message.Welcome));
            break;
          case 'err':
            console.log(message.data.error);
            break;
          default:                        
            if(this.display) {
              this.messageBuffer.push(message);
            }
        }
      } catch(err) {
        console.log(err)
        webSocket.send(JSON.stringify({ error: 'Something went wrong!'}));
      }
    }

    const onClose: ((ev: CloseEvent) => any) = async (event) => {
      console.log('close');
      
      // If display disconnects, disconnect all the players
      if(this.display && webSocket === this.display.ws) {        
        this.display = undefined;
        // Deletes party code so other clients do not attempt to connect
        // to this party after their connection has been closed
        await this.env.PartyCodes.delete(this.partyCode);
        // Stops the Main Game Loop 
        clearInterval(this.interval);
        // Notifies the controllers that the display has been lost in battle :(
        setTimeout(() => {
          const controllers = this.clients.filter(w => w !== webSocket);
          controllers.forEach(client => {
            // TODO: Solve this error -> miniflare crashes with little information....
            // client.close(1001, 'display lost');
            // Band aid solution is:
            client.send('closepls');
          });
        }, 33.333);

        this.game.clear();
      } 
      this.clients = this.clients.filter(w => w !== webSocket);
    }

    const onError: ((ev: Event) => any) = (event) => {
      console.log('error');
      
      // If display disconnects, disconnect all the players
      if(this.display && webSocket === this.display.ws) {
        this.display = undefined;
        this.clients.filter(w => w != webSocket);
        this.clients = [];
        this.game.clear();
        return;
      } 
      this.clients = this.clients.filter(w => w !== webSocket);
    }

    webSocket.addEventListener('message', onMessage);
    webSocket.addEventListener('close', onClose);
    webSocket.addEventListener('error', onError);

  }
}