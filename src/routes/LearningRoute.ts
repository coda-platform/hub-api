import express from 'express';
import Joi from 'joi';
import SiteEvaluateResponse from '../models/Response/SiteEvaluateResponse';
import SitePrepareResponse from '../models/Response/SitePrepareResponse';
import SiteTrainResponse from '../models/Response/SiteTrainResponse';
import SiteStatusResponse from '../models/Response/SiteStatusResponse';
import LearningServices from '../services/LearningServices';
import webSocketAdapter from '../websocket/WebSocketAdapter';
import queryServices from '../services/QueryServices';
import Redis from '../domain/learning/RedisDataProcessor';

var router = express.Router();
var crypto = require('crypto')

// Schema for base request
const schema = Joi.object({
    sites: Joi.string(),
});

router.get('/status', async (req, res, next) => {
    var token = ''
    if(req.headers.authorization)
    token = req.headers.authorization.split(' ')[1]
    const user = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    const { error, value } = schema.validate(req.query);
    if (error) {
        res.status(400).send(`Invalid execution parameters, ${error.message}`);
        return;
    }

    const query: any = {
        sites: value.sites ? value.sites.split(",") : []
    };

    try {
        const result = await webSocketAdapter.emit<SiteStatusResponse>('getLearningStatus', 'sendLearningStatus', query)();
        res.send(result);
    }
    catch (error) {
        error = Object.assign(error, {user: user})
        next(error);
    }
})

router.get('/prepare', async (req, res, next) => {
     
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
        const jobID = crypto.randomBytes(12).toString('base64');
        req.body.job = jobID;
        req.body.selectors = queryServices.nestedSelectorsQuery(req.body.selectors);
        const query: any = {
            body: req.body,
            sites: value.sites ? value.sites.split(",") : []
        };

        const resultsWrapper = await webSocketAdapter.emit<SitePrepareResponse[]>('getLearningPrepare', 'sendLearningPrepare', query)();
        const result = await LearningServices.compilePrepareResults(resultsWrapper);
        res.send(result);
    }
    catch (error) {
        error = Object.assign(error, {user: user})
        next(error);
    }
});

router.get('/train', async (req, res, next) => {
    
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

        let query: any = {
            body: req.body,
            sites: value.sites ? value.sites.split(",") : []
        };

        query.body.weights = Buffer.from(JSON.parse(await Redis.getRedisKey(`${req.body.job}_weights`)).data)

        for (let i = 0; i < req.body.rounds; i++) {
            const resultsWrapper = await webSocketAdapter.emit<SiteTrainResponse>('getLearningTrain', 'sendLearningTrain', query)();
            const result = await LearningServices.compileTrainResults(resultsWrapper, req.body.job, i + 1, req.body.rounds);
            query.body.weights = result;
        }
        delete query.body.weights
        const result = query.body;
        res.send(result);
    }
    catch (error:any) {
        error = Object.assign(error, {user: user})
        next(error);
    }
});

router.get('/progress', async (req, res, next) => {

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
        const result = await LearningServices.getTrainProgress(req.body.job);
        res.send(result);
    }
    catch (error) {
        error = Object.assign(error, {user: user})
        next(error);
    }
})

router.get('/evaluate', async (req, res, next) => {

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

        let query: any = {
            body: req.body,
            sites: value.sites ? value.sites.split(",") : []
        };
        const resultsWrapper = await webSocketAdapter.emit<SiteEvaluateResponse>('getLearningEvaluate', 'sendLearningEvaluate', query)();
        const result = await LearningServices.compileEvaluateResults(resultsWrapper)
        res.send(result);
    }
    catch (error) {
        error = Object.assign(error, {user: user})
        next(error);
    }
})

export default router;