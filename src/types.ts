export enum Render {
  DISPLAY = 1,
  CONTROLLER = 2,
}

// TODO: If time, implement movement
export type TankInput = {a: number, b: number, g: number, fire: boolean};
export type Vector2 = { x: number, y: number};
/**
 * App Protocol 
 * 
 * On every connect, either
 */
export namespace Message {
  export interface Error {
    type: 'err';
    data: {
      error: string
    }
  }

  export type Incoming = 
  | Message.Tank.Input
  | Message.Ping
  | Message.Init
  | Message.Error;

  export type Outgoing = 
  | Message.Pong
  | Message.Welcome
  | Message.Error
  | Message.Tank.Movement
  | Message.Tank.Ball;

  export interface Init {
    type: 'init';
  }

  export interface Welcome {
    type: 'wlcm';
    data: {
      actor: Render,
      clientID: string,
      qr: string | null,
    }
  }
  export interface Ping {
    type: 'ping';
    data: {
      id: string;
    };
  }

  export interface Pong {
    type: 'pong';
    data: {
      id: string;
      time: number;
      players: number;
      score: number;
    };
  }

  export namespace Tank {    
    export interface Movement {
      type: 'mov';
      data: {
        tankID: string,
        position: Vector2,
        angle: number
      }
    }
    export interface Input {
      type: 'input';
      data: {
        tankID: string,
        input: TankInput,
      }
    }
  
    export interface Ball {
      type: 'ball';
      data: {
        ballID: string,
        position: Vector2
      }
    }
  }
}


export namespace Game {
  /**
   * Game Network.
   * 
   * Implemented by the server only.
   * 
   */
  export interface Network {
    handleSession(webSocket: WebSocket): Promise<void>;
    processStateMessages(): void;
  }

}