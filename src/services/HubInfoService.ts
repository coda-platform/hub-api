import HubInfo from "../models/HubInfo";
import SiteInfo from "../models/SiteInfo";
import WebSocketBusEventResult from "../websocket/WebSocketBusEventResult";
import _ from 'underscore';
import ConnInfo from "../models/ConnInfo";
import ExecInfo from "../models/ExecInfo";
import RedisDataProcessor from "../domain/learning/RedisDataProcessor";

type Info = SiteInfo | ExecInfo;

function addLastSeen(res: SiteInfo[]) : ConnInfo[] {
    return res.map(r => Object.assign(_.clone(r), { last_seen: new Date() }));
}

// Process multi-site info.
function process(results: Info[]) : HubInfo {

    if (results.length === 0) {
        return {
            connections: [],
            api_version: "1.0.1",
        }
    }

    const first = results[0];
    const conns = (first as ExecInfo).command ? results as ExecInfo[] : addLastSeen(results as SiteInfo[]);

    return {
        connections: conns,
        api_version: "1.0.1",
    }
}

// Removes failed sites.
function unwrap(webSocketResults: WebSocketBusEventResult<Info>[]): HubInfo {
    const result = process(webSocketResults.filter(wsr => wsr.succeeded).map(wsr => wsr.result));
    const keepAliveTime = 60 * 10 * 1 //seconds * minute * hours: 10 minutes
    RedisDataProcessor.setRedisJobId(result, 'siteInfo:result', keepAliveTime);
    return result;
}

async function checkCacheResult() {
    return await RedisDataProcessor.existRedisKey('siteInfo:result') > 0;
}

async function getCacheResult() {
    return await RedisDataProcessor.getRedisKey('siteInfo:result');
}

export default {
    unwrap, checkCacheResult, getCacheResult
}