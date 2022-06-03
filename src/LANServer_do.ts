import { Message, Game, Render } from './types';

interface Controller {
  storage: DurableObjectStorage;
}

const dictionary = ['a', 'b','c','d','e','f','g','l','m'];
/**
 * Durable Object for the LAN party game server.
 * 
 * Although this is not a LAN server, running this at 
 * edge provides a similar experience as if it would 
 * have been run locally.
 */
export class LANServer implements Game.Logic {
  
  storage: DurableObjectStorage;
  clients: WebSocket[];
  messageBuffer: Message.Incoming[]
  isRunning?: boolean

  constructor(controller: Controller) {
    // `controller.storage` provides access to our durable storage. It provides a simple KV
    // get()/put() interface.
    this.storage = controller.storage;
    this.isRunning = false; 

    // We will put the WebSocket objects for each client into `websockets`
    this.clients = [];
    this.messageBuffer = []
  }

  mainLoop(): void {
    this.processStateMessages();
    this.sendState();
  }

  processStateMessages(): void {
    // Every new cycle starts by reading all of the messages at that specific moment
    this.messageBuffer.forEach(msg => {
      switch(msg.type) {
        case "init":
          // reply with wlcm
        break;  
      }
    })
    
    this.messageBuffer = [];
  }

  sendState(): void {
  }

  async fetch(request: Request) {
    // Check if the party is full
    if (this.clients.length === 5) {
      return new Response(null, { status: 403 }) // Forbidden Status
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
    
    // Initiates the main game loop 
    if(this.isRunning!) {
      // TODO: Save Interval
      setInterval(() => this.mainLoop(), 1000/30);
    }

    // Now we return the other end of the pair to the client.
    return new Response(null, { status: 101, webSocket: client });
  }

  async handleSession(webSocket: WebSocket): Promise<void> {
    // @ts-ignore
    // Accept our end of the WebSocket.
    webSocket.accept();

    // Create our session and add it to the sessions list.
    this.clients.push(webSocket);
    // Message Receiver Handler.
    const onMessage: ((ev: MessageEvent) => any) =  async (event) => {
      try {
        const message = JSON.parse(
          typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data)
        ) as Message.Incoming;
        
        // Init Message Type -> Processed outside of the game loop
        if(message.type === 'init') {
          webSocket.send(JSON.stringify({
            type: 'wlcm',
            data: {
              actor: this.clients.length === 1 ? Render.DISPLAY : Render.CONTROLLER,
              clientID: '123',
              // TODO: Generate a random client id!
              qr: 'no qr for now...',
            }
          } as Message.Welcome));
        } else if(message.type === 'err') {
          console.log(message.data.error);
        } else {
          // Stores other messages to be processed on the main game loop.
          this.messageBuffer.push(message as Message.Incoming); 
        }


      } catch(err) {
        if(MINIFLARE) {
          console.log(err)
        }
        webSocket.send(JSON.stringify({ error: 'Something went wrong!'}));
      }
    }

    const onClose: ((ev: CloseEvent) => any) = (event) => {
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
