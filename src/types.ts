export enum Render {
  DISPLAY = 1,
  CONTROLLER = 2,
}

export type Vector2 = { x: number, y: number};
/**
 * App Protocol 
 * 
 * On every connect, either
 */
export namespace Message {
  export type Incoming = 
  | Message.Tank.Velocity
  | Message.Ping
  | Message.Init;

  export type Outgoing = 
  | Message.Pong
  | Message.Welcome;

  export interface Init {
    type: 'init';
  }

  export interface Welcome {
    type: 'wlcm';
    data: {
      whoami: Render,
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
    export interface Velocity {
      type: 'position';
      data: {
        tankID: number,
        dir: number,
        magnitude: number,
      }
    }
    
    export interface Ball {
      type: 'ball';
      data: {
        tankID: number
      }
    }
  }
}

export namespace Game {
  /**
   * Game Logic.
   * 
   * Implemented by the server only.
   * Variables:
   * 
   * isRunning: used in server implementation to see if the server is running
   */
  export interface Logic {
    isRunning?: boolean;
    handleSession(webSocket: WebSocket): Promise<void>;
    processStateMessages(): void;
    sendState(): void;
  }
}

export interface TankState {

}

