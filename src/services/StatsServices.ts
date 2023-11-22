import AllSitesResponseMapper from "../domain/stats/AllSitesResponseMapper";
import SitesBreakdownLimitAggregator from "../domain/stats/fieldAggregation/SitesBreakdownLimitAggregator";
import HubSummarizeReponseMapper from "../domain/stats/HubSummarizeReponseMapper";
import Breakdown from "../models/Request/breakdown";
import SiteRequestResponse from "../models/Response/SiteRequestResponse";
import SiteStatsBreakdownResponse from "../models/Response/SiteStatsBreakdownResponse";
import SiteStatsCompileResponse from "../models/Response/SiteStatsCompileResponse";
import SiteStatsProgressResponse from "../models/Response/SiteStatsProgressResponse";
import SiteSummarizeResponse from "../models/Response/SiteSummarizeResponse";
import WebSocketBusEventResult from "../websocket/WebSocketBusEventResult";

function compileSummarize(webSocketResults: WebSocketBusEventResult<SiteSummarizeResponse[]>[], waitAllSites: boolean) {
    const hubResults = webSocketResults
        .filter(rw => waitAllSites || rw.succeeded)
        .map(rw => HubSummarizeReponseMapper.getResultsMapped(rw));

    if (hubResults.length === 0) return hubResults;

    const allSitesResult = AllSitesResponseMapper.getMapped(hubResults);
    hubResults.push(allSitesResult);

    return hubResults;
}

function compileRequest(webSocketResults: WebSocketBusEventResult<SiteRequestResponse[]>[], waitAllSites: boolean) {
    const hubResults = webSocketResults
        .filter(rw => waitAllSites || rw.succeeded)
        .map(rw => HubSummarizeReponseMapper.getRequestMapped(rw));

    if (hubResults.length === 0) return hubResults;

    return hubResults;
}


function compileProgress(webSocketResults: WebSocketBusEventResult<SiteStatsProgressResponse>[], waitAllSites: boolean) {
    const hubResults = webSocketResults
        .filter(rw => waitAllSites || rw.succeeded)
        .map(rw => HubSummarizeReponseMapper.getProgressMapped(rw));

    if (hubResults.length === 0) return hubResults;

    return hubResults;
}

function compileResults(webSocketResults: WebSocketBusEventResult<SiteStatsCompileResponse[] | SiteSummarizeResponse[]>[], waitAllSites: boolean) {
    const hubResults = webSocketResults
        .filter(rw => waitAllSites || rw.succeeded)
        .map(rw => HubSummarizeReponseMapper.getResultsMapped(rw));

    if (hubResults.length === 0) return hubResults;

    const allSitesResult = AllSitesResponseMapper.getMapped(hubResults);
    hubResults.push(allSitesResult);

    return hubResults;
}

function breakdownLimit(webSocketResults: WebSocketBusEventResult<SiteSummarizeResponse[]>[], breakdown: Breakdown, waitAllSites: boolean) {
    if (breakdown.resource.fieldType === 'dateTime') {
        if (breakdown.slices.step < 86400)
            breakdown.slices.step = 86400;
    }
    else {
        const CIResults = webSocketResults
            .filter(rw => waitAllSites || rw.succeeded)
            .map(rw => HubSummarizeReponseMapper.getCI95Result(rw, breakdown));
        if (CIResults && CIResults[0] && CIResults[0][0]) {
            const smallestAllowableStep = SitesBreakdownLimitAggregator.calculate(CIResults);
            breakdown.slices.step > smallestAllowableStep || (breakdown.slices.step = smallestAllowableStep);

        }
    }
    return breakdown;
}

function compileBreakdown(breakdownResults: WebSocketBusEventResult<SiteStatsBreakdownResponse>[], webSocketResults: WebSocketBusEventResult<SiteSummarizeResponse[]>[]) {
    const hubResults = breakdownResults.map(rw => {
        HubSummarizeReponseMapper.getBreakdownMapped(breakdownResults, webSocketResults)
    })
}

export default {
    compileResults, compileProgress, compileSummarize, compileRequest, breakdownLimit, compileBreakdown
}