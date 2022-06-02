// @ts-ignore
import indexHtml from './public/index.html';
// @ts-ignore 
import gameHTML from './public/game.html';


declare global {
  var MINIFLARE: boolean;
}

interface Environment {
  LANServer: DurableObjectNamespace;
}

export { LANServer } from './LANServer_do';


const worker: ExportedHandler<Environment> = {
  async fetch(request, env) {
    const url = new URL(request.url);
    let gameId: string | void;

    // Serve static content
    switch (url.pathname) {
      case "/":
        return new Response(indexHtml, { headers: { 'content-type': 'text/html' }});
    }

    // -----------------------------------------
    // Game Routes
    // Uses lobby id and DO to connect friends.
    // -----------------------------------------

    // Gets lobby id from pathname
    gameId = url.pathname.substring(1);

    if (globalThis.MINIFLARE && !gameId) {
      // generate a random lobby id in devmode
      gameId = env.LANServer.newUniqueId().toString();
    }
    
    // TODO: Generate simpler party IDs... 
    // Creates and redirects to a new lobby.
    if (gameId === 'new') {
      url.search = ''; // clear any query string
      gameId = env.LANServer.newUniqueId().toString();
      const target = new URL(`/${gameId}`, url.href);
      return Response.redirect(target.href, 302);
    }

    // pass the request to Durable Object for game ID
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      const id = env.LANServer.idFromString(gameId);
      return env.LANServer.get(id).fetch(request);
    }
  
    
    // Returns a generated 
    return new Response(gameHTML, { headers: { 'content-type': 'text/html' }});

  },
};

export default worker;
