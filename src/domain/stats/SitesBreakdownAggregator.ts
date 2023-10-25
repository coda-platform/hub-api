import SiteStatsBreakdownResponse from "../../models/Response/SiteStatsBreakdownResponse";
import HubSummarizeResponse from "../../models/Response/HubSummarizeResponse";

function getBreakdownsAggregated(siteRequestSummarizeReponses: HubSummarizeResponse[]): SiteStatsBreakdownResponse | undefined {
    if (!siteRequestSummarizeReponses[0].breakdown) return undefined;

    const siteCountPerPeriodsStarts = new Map<string, number>();

    for (let hubResponse of siteRequestSummarizeReponses) {

        if (!hubResponse.breakdown) throw new Error('Site must have breakdown');
        for (let breakdownResult of (hubResponse?.breakdown?.result ?? [])) {
            const previousCountForPeriod = siteCountPerPeriodsStarts.get(breakdownResult.periodStart) ?? 0;
            const countAggregated = previousCountForPeriod + (breakdownResult.periodCount ?? 0);

            siteCountPerPeriodsStarts.set(breakdownResult.periodStart, countAggregated);
        }
    }

    const breakdownResults = new Array<{ periodStart: string, periodCount: number }>();

    siteCountPerPeriodsStarts.forEach((value, key) => {
        const result = {
            periodStart: key,
            periodCount: value
        };

        breakdownResults.push(result);
    })

    return {
        job: siteRequestSummarizeReponses[0].job,
        query: siteRequestSummarizeReponses[0].breakdown.query,
        result: breakdownResults,
        field: siteRequestSummarizeReponses[0].breakdown.field,
        fieldType: siteRequestSummarizeReponses[0].breakdown.fieldType
    };
}

export default {
    getBreakdownsAggregated
}