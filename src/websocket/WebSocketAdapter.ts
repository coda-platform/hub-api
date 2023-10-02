import { Guid } from 'guid-typescript';
import io, { Server, Socket } from 'socket.io'; // (http);
import Constants from '../Constants';
import webSocketBus from './WebSocketBus';
import WebSocketBusEventResult from './WebSocketBusEventResult';

import WebSocketEventListener from './WebSocketEventListener';
import WebSocketKeycloakFilter from './WebSocketKeycloakFilter';

class WebSocketAdapter {
    registered = false;

    connectedClients = new Array<string>();
    connectedClientsMap = {} as any; //map site code with associated socket ID
    socket!: Server;

    register = (server: any, events: WebSocketEventListener[]) => {
        this.socket = new Server(server, {maxHttpBufferSize: 1e9});

        this.socket.on('connection', (socket: Socket) => {
            console.log(`${socket.id} user connected`);

            socket.on('storeClientInfo', (data) => {
                console.warn({ siteConnectionData: { [data.siteCode]: socket.id } });
                this.connectedClientsMap[data.siteCode] = socket.id;
            });

            this.connectedClients.push(socket.id);

            socket.on('disconnect', () => {
                console.log('user disconnected');
                this.connectedClients = this.connectedClients.filter(cc => cc !== socket.id);
            });

            events.forEach((e) => {
                socket.on(e.listeningEvent, WebSocketKeycloakFilter.keycloakFilter(e.callback));
            });
        });

        this.registered = true;
    }

    emit<TResultType>(event: string, awaitingEvent: string, ...args: any[]): () => Promise<WebSocketBusEventResult<TResultType>[]> {
        if (!this.registered) throw new Error('Must register WebSocketAdapter before usage');

        const eventId = Guid.create().toString();

        const requested_sites = args.length > 0 && args[0].sites && args[0].sites.length > 0
            ? Object.keys(this.connectedClientsMap).filter(site => args[0].sites.includes(site))
                .reduce((arr: string[] = [], k) => { arr.push(this.connectedClientsMap[k]); return arr; }, [])
            : this.connectedClients;

        //this.socket.to(requested_sites as any).emit(event, { eventId, ...args[0] });

        const waitTime = args.length > 0 ? args[0].waitTime : Constants.webSocketWaitTime;
        const results = webSocketBus.registerAwaitingEvent(requested_sites, eventId, awaitingEvent, waitTime);
        this.socket.to(requested_sites as any).emit(event, { eventId, ...args[0] });
        return results;
    }
}

const webSocketAdapter = new WebSocketAdapter();
export default webSocketAdapter;
