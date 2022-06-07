import indexHtml from './public/index.html';
import gameHTML from './public/game.html';
import index_js from './public/game.g.js';

import { nanoid } from 'nanoid';

export { LANServer } from './LANServer_do';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let partyCode;
    // TODO: If some some time left: refactor the code to clean it up a bit

    // Serve static content
    switch (url.pathname) {
      // Root Path
      case "/":
        return new Response(indexHtml, { headers: { 'content-type': 'text/html' }});
      case "/index.js":
        return new Response(index_js, {headers: {'content-type': 'text/javascript'}});
    }

    // Gets lobby id from pathname
    partyCode = url.pathname.substring(1);

    // Creates and redirects to a new lobby.
    if (partyCode === 'new') {
      url.search = '';

      // Generates a random code to be used to create a new DO. 
      // This is not the best use of KV, but I wanted to give 
      // KV a try. 
      let code = nanoid(8);
      if(true) {
        code = '12345678';
      }      
      // Creates an unique ID as it will be significantly faster 
      // than creating a DO using the generated Party Code.
      const doUID = env.LANServer.newUniqueId().toString();
      // Stores the newly created DO inside the KV.
      await env.PartyCodes.put(code, JSON.stringify(doUID));

      const target = new URL(`/${code}`, url.href);
      return Response.redirect(target.href, 302);
    }

    // Validates the room code input
    if (partyCode.match(/^[A-Za-z0-9_-]{8}$/)) {
      const doUID = await env.PartyCodes.get(partyCode);
      
      // If such party does not exit return 404.
      if(doUID === null) {
        return new Response("Couldn't find a party with that code... :(", { status: 404 });
      }

      
      // Pass the request to Durable Object to initiate the game
      if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
        // For some reason, quotes are stored in the value. 
        const id = env.LANServer.idFromString(doUID.replace(/"/g, ''));
        return env.LANServer.get(id).fetch(request);
      } else {
        // Send this after a redirect to a party lobby
        return new Response(gameHTML, { headers: {'content-type': 'text/html'}, status: 200})
      }
    }

    // Returns 404 not found
    return new Response("Not found. If you are trying to join a party, make sure it is only 8 characters long.", { status: 404 });

  },
};
