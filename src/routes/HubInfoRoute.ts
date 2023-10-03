import express from 'express';
import SiteInfo from '../models/SiteInfo';
import HubInfoService from '../services/HubInfoService';
import webSocketAdapter from '../websocket/WebSocketAdapter';
import SiteAidboxHealthResponse from '../models/Response/SiteAidboxHealthResponse';

var router = express.Router();

router.get('/', async (req, res) => {
  const resultsWrapper = await webSocketAdapter.emit<SiteInfo>('getSiteInfo', 'sendSiteInfo', req.query)();

  const hubInfo = HubInfoService.unwrap(resultsWrapper);
  res.send(hubInfo);
});

router.get('/health', async (req, res) => {
  const resultsWrapper = await webSocketAdapter.emit<SiteAidboxHealthResponse>('getAidboxInfo', 'sendAidboxInfo')();
  res.send(resultsWrapper);
})

export default router;