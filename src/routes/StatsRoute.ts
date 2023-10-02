import express from 'express';
import Joi from 'joi';
import Constants from '../Constants';
import RedisDataProcessor from '../domain/learning/RedisDataProcessor';
import SiteStatsCompileResponse from '../models/Response/SiteStatsCompileResponse';
import SiteStatsProgressResponse from '../models/Response/SiteStatsProgressResponse';
import StatsServices from '../services/StatsServices';
import webSocketAdapter from '../websocket/WebSocketAdapter';
import SiteRequestResponse from '../models/Response/SiteRequestResponse';
import SiteSummarizeResponse from '../models/Response/SiteSummarizeResponse';
import SiteStatsBreakdownResponse from '../models/Response/SiteStatsBreakdownResponse';
import WebSocketQuery from '../models/Request/WebSocketQuery';
import queryServices from '../services/QueryServices';
import SiteStatusResponse from '../models/Response/SiteStatusResponse';

var router = express.Router();
var crypto = require('crypto')

// Schema for base request
const schema = Joi.object({
    sites: Joi.string(),
    waitTime: Joi.number().optional(),
    waitAllSites: Joi.boolean().optional()
});

router.get('/status', async (req, res, next) => {
    var token = ''
    if(req.headers.authorization)
    token = req.headers.authorization.split(' ')[1]
    const user = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    try {
        const { error, value } = schema.validate(req.query);
        if (error) {
            res.status(400).send(`Invalid execution parameters, ${error.message}`);
            return;
        }
        const result = await webSocketAdapter.emit<SiteStatusResponse>('getStatsStatus', 'sendStatsStatus')();
        res.send(result);
    }
    catch (error) {
        error = Object.assign(error, {user: user})
        next(error);
    }
})

router.get('/summarize', async (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
        res.status(400).send(`Invalid execution parameters, ${error.message}`);
        return;
    }
    var token = ''
    if (req.headers.authorization)
        token = req.headers.authorization.split(' ')[1]
    const user = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const jobID = crypto.randomBytes(12).toString('base64');
    req.body.job = jobID;
    req.body.selectors = queryServices.nestedSelectorsQuery(req.body.selectors);
    
    var summarizeQuery: WebSocketQuery = {
        body: req.body,
        sites: value.sites ? value.sites.split(",") : [],
        waitTime: value.waitTime ? value.waitTime : Constants.webSocketWaitTime
    };

    try {
        var resultsWrapper = await webSocketAdapter.emit<SiteSummarizeResponse[]>('getStatsSummarize', 'sendStatsSummarize', summarizeQuery)();
        const waitAllSites = value.waitAllSites === false ? false : true;

        if(req.body.options.breakdown){
            var breakdown = req.body.options.breakdown;
            req.body.options.breakdown = StatsServices.breakdownLimit(resultsWrapper, breakdown, waitAllSites);
            var breakdownQuery: WebSocketQuery = {
                body: req.body,
                sites: value.sites ? value.sites.split(",") : [],
                waitTime: value.waitTime ? value.waitTime : Constants.webSocketWaitTime
            }
            const breakdownResultsWrapper = await webSocketAdapter.emit<SiteStatsBreakdownResponse>('getStatsBreakdown', 'sendStatsBreakdown', breakdownQuery)();
            StatsServices.compileBreakdown(breakdownResultsWrapper, resultsWrapper);
        }
        
        const stats = StatsServices.compileSummarize(resultsWrapper, waitAllSites);

        res.send(stats);
    }
    catch (error: any) {
        error = Object.assign(error, { user: user })
        next(error);
    }
});

router.get('/request', async (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
        res.status(400).send(`Invalid execution parameters, ${error.message}`);
        return;
    }
    var token = ''
    if (req.headers.authorization)
        token = req.headers.authorization.split(' ')[1]
    const user = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const username = user.preferred_username;

    const jobID = crypto.randomBytes(12).toString('base64');
    req.body.job = jobID

    const query: any = {
        body: req.body,
        sites: value.sites ? value.sites.split(",") : [],
        waitTime: value.waitTime ? value.waitTime : Constants.webSocketWaitTime
    };
    try {
        const resultsWrapper = await webSocketAdapter.emit<SiteRequestResponse[]>('getStatsRequest', 'sendStatsRequest', query)();

        const waitAllSites = value.waitAllSites === false ? false : true;
        const stats = StatsServices.compileRequest(resultsWrapper, waitAllSites);;

        const request = {
            name: req.body.name,
            jobID: req.body.job,
            form: req.body.form,
            status: []
        }
        RedisDataProcessor.setRedisJobId(request, `${username}_stats_${jobID}`)

        res.send(stats);
    }
    catch (error: any) {
        error = Object.assign(error, { user: user })
        next(error);
    }
});

router.get('/progress', async (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
        res.status(400).send(`Invalid execution parameters, ${error.message}`);
        return;
    }
    var token = ''
    if (req.headers.authorization)
        var token = req.headers.authorization.split(' ')[1]
    const user = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    const query: any = {
        body: req.body,
        sites: value.sites ? value.sites.split(",") : [],
        waitTime: value.waitTime ? value.waitTime : Constants.webSocketWaitTime
    };

    const jobId = req.body.job;

    try {
        const resultsWrapper = await webSocketAdapter.emit<SiteStatsProgressResponse>('getStatsProgress', 'sendStatsProgress', query)();

        const waitAllSites = value.waitAllSites === false ? false : true;
        const stats = StatsServices.compileProgress(resultsWrapper, waitAllSites);

        var data = JSON.parse(await RedisDataProcessor.getRedisKey(jobId));
        data.status = stats;
        RedisDataProcessor.setRedisJobId(data, jobId);

        res.send(stats);
    }
    catch (error: any) {
        error = Object.assign(error, { user: user })
        next(error);
    }
});

router.get('/compile', async (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
        res.status(400).send(`Invalid execution parameters, ${error.message}`);
        return;
    }
    var token = ''
    if (req.headers.authorization)
        var token = req.headers.authorization.split(' ')[1]
    const user = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    const query: any = {
        body: req.body,
        sites: value.sites ? value.sites.split(",") : [],
        waitTime: value.waitTime ? value.waitTime : Constants.webSocketWaitTime
    };

    try {
        const resultsWrapper = await webSocketAdapter.emit<SiteStatsCompileResponse[]>('getStatsCompile', 'sendStatsCompile', query)();

        const waitAllSites = value.waitAllSites === false ? false : true;
        const stats = StatsServices.compileResults(resultsWrapper, waitAllSites);//compile ready sites, return data

        res.send(stats);
    }
    catch (error: any) {
        error = Object.assign(error, { user: user })
        next(error);
    }
});

router.get("/jobs", async (req, res, next) => {
    var token = ''
    if (req.headers.authorization)
        var token = req.headers.authorization.split(' ')[1]
    const user = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const username = user.preferred_username;

    try {
        var jobs = await RedisDataProcessor.findKeys(`${username}_stats*`)

        res.send(jobs);
    }
    catch (error: any) {
        error = Object.assign(error, { user: user })
        next(error);
    }
});

export default router;