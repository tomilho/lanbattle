// TODO: Credit the wordle template
import { Message, Render, Game } from './types';
import { Tank } from './tank';
import { nanoid } from 'nanoid';

interface Controller {
  storage: DurableObjectStorage;
}
/**
 * Durable Object for the LAN party game server.
 * 
 * Although this is not a LAN server, running this at 
 * edge provides a similar experience as if it would 
 * have been run locally.
 */
export class LANServer implements Game.Logic {
  storage: DurableObjectStorage;
  display: { ws: WebSocket, id: string } | undefined;
  clients: WebSocket[];
  interval
  tanks: Game.State;
  messageBuffer: Message.Incoming[]

  constructor(controller: Controller) {
    this.storage = controller.storage;
    this.display = undefined;
    this.tanks = {};
    this.messageBuffer = []
    this.clients = []

    // Starts the main game loop.
    this.interval = setInterval(() => this.mainLoop(), 1000/30);
  }

  mainLoop(): void {
    this.processStateMessages();
    this.sendState();
  }

  processStateMessages(): void {
    this.messageBuffer.forEach(msg => {
      // Reads player input and overrides existing input.
      // We wish to process the latest received input. 
      switch(msg.type) {
        case 'input':
          this.tanks[msg.data.tankID].input = msg.data;
          break;
        
      }
    });
    // TODO: Process Input and Collision

    // Sends Tank Position and Azimuth to the display.
    if(this.display) {
      let outMessages = [];
      for(const tank in this.tanks) {
        const data = this.tanks[tank];
        outMessages.push(JSON.stringify({
          type: 'tank',
          data: {
            tankID: tank,
            position: 123,
            azimuth: 123
          }
        }));
      }
    }
    this.messageBuffer = [];
  }

  sendState(): void {
  }

  async fetch(request: Request) {
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
              this.tanks[clientID] = new Tank();
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
            this.messageBuffer.push(message);
        }
      } catch(err) {
        if(true) {
          console.log(err)
        }
        webSocket.send(JSON.stringify({ error: 'Something went wrong!'}));
      }
    }

    const onClose: ((ev: CloseEvent) => any) = (event) => {
      // TODO: handler close better...
      this.clients = this.clients.filter(w => w !== webSocket);
    }

    const onError: ((ev: Event) => any) = (event) => {
      this.clients = this.clients.filter(w => w !== webSocket);
    }

    webSocket.addEventListener('message', onMessage);
    webSocket.addEventListener('close', onClose);
    webSocket.addEventListener('error', onError);

  }
}

