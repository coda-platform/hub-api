import EmailSender from "../infrastructure/EmailSender";
import WebSocketBusEvent from "./WebSocketBusEvent";
import WebSocketBusEventResult from "./WebSocketBusEventResult";


function awaitingResultCallbackFactory(awaitingEvents: WebSocketBusEvent[], webSocketBus: WebSocketBus, waitTime: number) {
    return async (): Promise<WebSocketBusEventResult<any>[]> => {
        const results = new Array<WebSocketBusEventResult<any>>();

        return new Promise((resolve) => {
            let totalElapsed = 0;

            // Try collecting results before timeout of request.
            const onGoingProcess = setInterval(() => {
                totalElapsed += 150

                // Mark all remaining requests as failure after waiting too long.
                if (totalElapsed >= waitTime) {
                    const unresolvedResults = awaitingEvents.map((ae) => {
                        return { clientId: ae.clientId, eventId: ae.eventId, event: ae.awaitingEvent, result: null, succeeded: false, siteCode: '' };
                    })

                    clearInterval(onGoingProcess);
                    return resolve([...results, ...unresolvedResults]);
                }

                const awaitingResults = webSocketBus.awaitingResults;
                awaitingResults.forEach(ar => {
                    const treatedEvents = new Array<WebSocketBusEvent>();

                    awaitingEvents.forEach(ae => {
                        if (ar.clientId !== ae.clientId) return;
                        if (ar.eventId !== ae.eventId) return;
                        if (ar.event !== ae.awaitingEvent) return;

                        results.push(ar);
                        treatedEvents.push(ae);
                    });

                    awaitingEvents = awaitingEvents.filter(ae => {
                        return !treatedEvents.includes(ae);
                    });
                });

                webSocketBus.awaitingResults = awaitingResults.filter(ar => {
                    return !results.includes(ar);
                })

                // No more awaiting events for request so event is fully resolved.
                if (awaitingEvents.length === 0) {
                    clearInterval(onGoingProcess);
                    return resolve(results);
                }
            }, 150)
        })
    }
}

class WebSocketBus {
    awaitingResults: WebSocketBusEventResult<any>[];

    constructor() {
        this.awaitingResults = new Array<WebSocketBusEventResult<any>>();
    }

    registerAwaitingEvent(connectedClients: string[], eventId: string, awaitingEvent: string, waitTime: number) {
        const awaitingEvents = connectedClients.map((cc) => {
            const awaitingEventForClient: WebSocketBusEvent = { clientId: cc, eventId, awaitingEvent };
            return awaitingEventForClient;
        });

        return awaitingResultCallbackFactory(awaitingEvents, this, waitTime);
    }

    registerResultEvent(clientId: string, eventId: string, event: string, siteCode: string, result: any) {
        const awaitingResult: WebSocketBusEventResult<any> = { clientId, eventId, event, succeeded: true, result, siteCode };
        if(result.constructor.name == "Array") {
            const foundError = result.find((r: { error: any; }) => r.error)
            if (foundError) {
                EmailSender.sendEmailToErrorList(awaitingResult);
            }
        }
        else if(result.error){
            EmailSender.sendEmailToErrorList(awaitingResult);
        }
        this.awaitingResults.push(awaitingResult);
    }
}

const webSocketBus = new WebSocketBus();
export default webSocketBus;