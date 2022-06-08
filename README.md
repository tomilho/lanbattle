# LAN Battle
[lanbattle.tomilho.workers.dev](lanbattle.tomilho.workers.dev)

A simple (WIP) couch game to play agaisnt your friends. Everyone uses their phone
to control their tank while watching a shared display, such as a TV or laptop. 

## Inspiration
When I first came across with the edge computing paradigm, I had this long interest to experiment with server-sided low-latency collision detection, so when I found out about
the spring challenge I thought why the hell not do this? After a long deliberation, I 
decided to do a simple tank battle game but with a little twist inspired by a cf [blogpost](https://blog.cloudflare.com/developer-spotlight-guido-zuidhof-full-tilt/) I read. 

## How it works (Quick Overview)
Your phone sends every 33.333ms new input to the Durable Object (DO) to process. Afterwards, the DO sends the computed messages directly to the display, so the display only needs to render the newly received messages. Thanks to the low-latency provided in DO, it is entirely possible to perform this in real-time while giving the player a seamless experience with little to no noticeable lag. 

## WIP - What's missing...
 - [ ] Movement
 - [ ] Rejoin on phone lock
 - [ ] Rate Limiter 
 - [ ] Bigger Map (More players, a bit more of a challenge)
 - [ ] MAN Battle 



## Dependecies
Matter.js - Physics and Rendering Engine

Nanoid - Generates unique IDs used in party code and client ids.