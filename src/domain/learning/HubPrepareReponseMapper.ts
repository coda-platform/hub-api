import HubPrepareResponse from "../../models/Response/HubPrepareResponse";
import SitePrepareResponse from "../../models/Response/SitePrepareResponse";
import WebSocketBusEventResult from "../../websocket/WebSocketBusEventResult";

function getMapped(siteReponse: WebSocketBusEventResult<SitePrepareResponse[]>): HubPrepareResponse {
        return {
            siteCode: siteReponse.siteCode,
            job: siteReponse.result[0].job,
            query: siteReponse.result[0].query,
            count: siteReponse.result[0].count,
            model: siteReponse.result[0].model,
            weights: siteReponse.result[0].weights,
            error: siteReponse.result[0].error
        }
    }


export default {
    getMapped
}