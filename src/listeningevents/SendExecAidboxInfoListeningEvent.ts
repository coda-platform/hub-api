import ExecInfo from "../models/ExecInfo";
import webSocketBus from "../websocket/WebSocketBus";
import WebSocketEventListener from "../websocket/WebSocketEventListener";

export default class SendAidboxInfoListeningEvent implements WebSocketEventListener {
    listeningEvent: string;

    constructor() {
        this.listeningEvent = 'sendAidboxInfo';
    }

    callback(args: { clientId: string, eventId: string, siteCode: string, siteInfo: ExecInfo }) {
        // For now the contexte of this is lost during the function execution of this statement. so this.listeningEvent is not accessible.
        webSocketBus.registerResultEvent(args.clientId, args.eventId, 'sendAidboxInfo', args.siteCode, args.siteInfo);
    }
}