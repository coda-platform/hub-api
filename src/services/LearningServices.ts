import HubPrepareResponseMapper from "../domain/learning/HubPrepareReponseMapper";
import HubTrainResponseMapper from "../domain/learning/HubTrainResponseMapper";
import SitePrepareResponse from "../models/Response/SitePrepareResponse";
import SiteTrainResponse from "../models/Response/SiteTrainResponse";
import WebSocketBusEventResult from "../websocket/WebSocketBusEventResult";
import FederatedLearningAveraging from "../domain/learning/FederatedLearningAveraging";
import Redis from "../domain/learning/RedisDataProcessor";
import SiteEvaluateResponse from "../models/Response/SiteEvaluateResponse";
import HubEvaluateResponseMapper from "../domain/learning/HubEvaluateResponseMapper";
import RedisDataProcessor from "../domain/learning/RedisDataProcessor";
import SiteStatusResponse from "../models/Response/SiteStatusResponse";

async function compilePrepareResults(webSocketResults: WebSocketBusEventResult<SitePrepareResponse[]>[]) {
    const hubResults = webSocketResults.map(rw => HubPrepareResponseMapper.getMapped(rw));
    let response: any[] = []
    const jobID = hubResults[0].job;
    const weights = Buffer.from(hubResults[0].weights?.data ?? []);
    const model = hubResults[0].model;
    RedisDataProcessor.setRedisJobId(model, `${jobID}_model`)
    RedisDataProcessor.setRedisJobId(weights, `${jobID}_weights`) //save weights from first site -> to be used initially on all sites

    hubResults.forEach(hr => {
        let siteCode = hr.siteCode;
        let count = hr.count;
        let job = hr.job;
        let result = {
            job,
            siteCode,
            count
        }
        response.push(result)
    })
    return response;
}

async function compileTrainResults(webSocketResults: WebSocketBusEventResult<SiteTrainResponse>[], jobID: string, currentRound: number, totalRounds: number) {
    const hubResults = webSocketResults.map(rw => HubTrainResponseMapper.getMapped(rw));
    let redisRound: any = {}

    const averageWeights = await FederatedLearningAveraging.averageWeights(hubResults);
    const averageMetrics = FederatedLearningAveraging.averageMetrics(hubResults.map(hr => hr.metrics));
    let acc = averageMetrics.acc;
    let loss = averageMetrics.loss;
    let val_acc = averageMetrics.val_acc;
    let val_loss = averageMetrics.val_loss;
    const siteAverage = {
        acc, loss, val_acc, val_loss,
        siteCode: "average",
        currentRound: currentRound,
        totalRounds: totalRounds
    }
    await Redis.addList(jobID + "rounds", JSON.stringify(siteAverage))
    hubResults.forEach(sr => {
        let acc = sr.metrics.acc;
        let loss = sr.metrics.loss;
        let val_acc = sr.metrics.val_acc;
        let val_loss = sr.metrics.val_loss;
        let siteCode = sr.siteCode;
        redisRound = { acc, loss, val_acc, val_loss, siteCode, currentRound, totalRounds }
        Redis.addList(jobID + "rounds", JSON.stringify(redisRound))
    })
    return averageWeights;
}

async function getTrainProgress(jobID: string) {
    let result: any[] = []
    await Redis.listRange(jobID + "rounds", 0, -1)
        .then(res => {
            if (res != null && res != undefined) {
                res.forEach((r: string) => result.push(JSON.parse(r)))
            }
        }
        )
    return result;
}

async function compileEvaluateResults(webSocketResults: WebSocketBusEventResult<SiteEvaluateResponse>[]) {
    const hubResults = webSocketResults.map(rw => HubEvaluateResponseMapper.getMapped(rw));
    let response: any[] = []

    const averageMetrics = FederatedLearningAveraging.averageMetrics(hubResults.map(hr => hr.metrics));
    let acc = averageMetrics.acc;
    let loss = averageMetrics.loss;

    const siteAverage = {
        siteCode: "average",
        acc, loss,
    }
    response.push(siteAverage)

    hubResults.forEach(sr => {
        let acc = sr.metrics.acc;
        let loss = sr.metrics.loss;
        let siteCode = sr.siteCode;
        let siteMetrics = {
            siteCode,
            acc,
            loss,
        }
        response.push(siteMetrics)
    })

    return response;
}

function unwrap(webSocketResults: WebSocketBusEventResult<SiteStatusResponse>[]) {
    return webSocketResults.filter(wsr => wsr.succeeded).map(wsr => wsr.result);
}

export default {
    compilePrepareResults, compileTrainResults, getTrainProgress, compileEvaluateResults, unwrap
}