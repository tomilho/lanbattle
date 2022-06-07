import * as Matter from 'matter-js';
import type { Vector2, TankInput, Message } from './types';
import { nanoid } from 'nanoid';

// Tuned Engine Options:
// https://brm.io/matter-js/docs/classes/Engine.html
const EngineOptions = {
  gravity: {
    scale: 0,
    x: 0,
    y: 0,
  },
}

/**
 * Proxy for Matter.js engine.
 * 
 * Provides methods necessary to 
 * run the game
 */
export class Engine {
  
  engine: Matter.Engine;
  tanks: {[key:string] : Tank};
  balls: {[key:string] : Matter.Body};
  world: Matter.World;
  counter = 0;

  constructor() {
    this.engine = Matter.Engine.create(EngineOptions);
    this.tanks = {};
    this.balls = {};
    this.world = this.engine.world;
    this.loadStaticWalls();
    this.handleCollision();
    
  }

  private handleCollision() {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      let toRemoveTank = undefined;
      let toRemoveBall = undefined;

      for (const pair of event.pairs) {
        if(!pair.activeContacts) continue;
        
        if(pair.bodyA.label === 'ball' && pair.bodyB.label === 'tank' ||
           pair.bodyA.label === 'tank' && pair.bodyB.label === 'ball') {
          // Finds the Tank          
          for(const clientID in this.tanks) {
            const tank = this.tanks[clientID]; 
            if(tank.body === pair.bodyA.parent || tank.body === pair.bodyB.parent) {              
              toRemoveTank = clientID;
            }
          }
          // Finds the Ball
          for(const ballID in this.balls) {
            const ball = this.balls[ballID];
            if(ball === pair.bodyA || ball === pair.bodyB) {
              toRemoveBall = ballID;
            }
          }
        }
      }
  
      // Removes Tank/Ball from the game
      if(toRemoveBall && toRemoveTank) {        
        Matter.Composite.remove(this.world, this.balls[toRemoveBall]);
        delete this.balls[toRemoveBall];
        Matter.Composite.remove(this.world, this.tanks[toRemoveTank].body);
        delete this.tanks[toRemoveTank];
      }

    });
  }

  clear() {
    this.balls = {};
    this.tanks = {};
    Matter.Composite.clear(this.world, true);
  }
    
  getTanks() {
    return this.tanks;
  }

  getBalls() {
    return this.balls;
  }

  
  loadStaticWalls() {
    // Single Map
    const style = { isStatic: true };
    Matter.Composite.add(this.world, [
      Matter.Bodies.rectangle(400, 0, 800, 50, style),
      Matter.Bodies.rectangle(400, 600, 800, 50, style),
      Matter.Bodies.rectangle(800, 300, 50, 600, style),
      Matter.Bodies.rectangle(0, 300, 50, 600, style)  
    ])
    
  }

  addTank(clientID: string) {
    const tank = new Tank({ x: Math.random()*700+50, y: Math.random()*500+50}, Object.keys(this.tanks).length);
    this.tanks[clientID] = tank;
    Matter.Composite.add(this.world, tank.body);
  }

  deleteTank(clientID: string) {
    const tank = this.tanks[clientID];
    if (!tank) { return; }
    Matter.Composite.remove(this.world, tank.body);
  }

  update() {
    for(const tankID in this.tanks) {
      const tank = this.tanks[tankID];
      tank.processInput(this.world, this);
    }

    Matter.Engine.update(this.engine, 33.333);
  }
}

class Tank {
  private bodySize = 35;
  body: Matter.Body;
  shape: string;
  angle: number;
  private newInput: TankInput;
  private lastInput: TankInput;

  constructor(position: Vector2, playerCount: number) {
    this.shape = '';
    const shape = this.getTankShape(position, playerCount);
    this.body = Matter.Body.create({
      parts: [shape, // Unique Shape 
              Matter.Bodies.circle(position.x, position.y, this.bodySize/3, {label: 'tank'}), // Turret p1
              Matter.Bodies.rectangle(position.x,position.y - this.bodySize/2, this.bodySize/3, this.bodySize/1.75, {label: 'tank'})], // Turret p2
      label: 'tank',
      render: { lineWidth: 1},
    });
    this.angle = 0;
    Matter.Body.setAngle(this.body, 0);
    this.newInput = { a: 0, b: 0, g: 0, fire: false };
    this.lastInput = { a:0, b:0, g:0, fire: false };
  }

  getTankShape(position: Vector2, playerCount: number): Matter.Body {
    switch(playerCount) {
      case 0:
        this.shape = 'square';
        return Matter.Bodies.rectangle(position.x, position.y, this.bodySize, this.bodySize, {label: 'tank'});
      case 1:
        this.shape = 'pentagon';
        return Matter.Bodies.polygon(position.x, position.y, 5, this.bodySize/1.5, {label: 'tank'});
      case 2:
        this.shape = 'decagon';
        return Matter.Bodies.polygon(position.x, position.y, 10, this.bodySize/1.5, {label: 'tank'});
      case 3:
        this.shape = 'circle';
        return Matter.Bodies.circle(position.x, position.y, this.bodySize/2, {label:'tank'});
    }
    
    return Matter.Bodies.rectangle(position.x, position.y, this.bodySize, this.bodySize);
  }

  setInput(input: TankInput) {
    this.newInput = input;
  }

  processInput(world: Matter.World, engine: Engine) {
    if(this.newInput.fire) {
      const ball = Matter.Bodies.circle(this.body.position.x, this.body.position.y - 35, 5, {
        label: 'ball', 
        restitution: 1,
        friction: 0,
        frictionAir: 0,
        frictionStatic: 0,
      });
      // Matter.js/types is not up-to-date
      (Matter.Body as any).rotate(ball, this.body.angle, this.body.position);
      const velocity = Matter.Vector.sub(ball.position, this.body.position);
      const unitVelocity = Matter.Vector.div(velocity, Matter.Vector.magnitude(velocity)); 
      Matter.Body.setVelocity(ball, Matter.Vector.mult(unitVelocity, 10));
      Matter.Composite.add(world, ball);      
            
      engine.balls[nanoid()] = ball;
    }

    let angle = ((this.newInput.g - this.lastInput.g)*(Math.PI/180));
    Matter.Body.rotate(this.body, angle);
    
    this.lastInput = this.newInput;

  }
}