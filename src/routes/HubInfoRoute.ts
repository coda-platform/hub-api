import express from 'express';
import SiteInfo from '../models/SiteInfo';
import HubInfoService from '../services/HubInfoService';
import webSocketAdapter from '../websocket/WebSocketAdapter';
import SiteAidboxHealthResponse from '../models/Response/SiteAidboxHealthResponse';
import Joi from 'joi';

var router = express.Router();

// Schema for base request
const schema = Joi.object({
  sites: Joi.string(),
});

router.get('/sites', async (req, res) => {
  const hasCachedResult = await HubInfoService.checkCacheResult();

  if (hasCachedResult) {
    const hubInfo = await HubInfoService.getCacheResult();
    console.log(hubInfo)
    res.send(hubInfo);
  }
  else {
    const resultsWrapper = await webSocketAdapter.emit<SiteInfo>('getSiteInfo', 'sendSiteInfo', req.query)();
    const hubInfo = HubInfoService.unwrap(resultsWrapper);
    res.send(hubInfo);
  }
});

router.get('/health', async (req, res) => {


  const { error, value } = schema.validate(req.query);
  if (error) {
    res.status(400).send(`Invalid execution parameters, ${error.message}`);
    return;
  }

  const query: any = {
    sites: value.sites ? value.sites.split(",") : []
  };

  const resultsWrapper = await webSocketAdapter.emit<SiteAidboxHealthResponse>('getAidboxInfo', 'sendAidboxInfo', query)();
  res.send(resultsWrapper);
})

export default router;