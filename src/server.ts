// App config from .env
import * as dotenv from "dotenv";
dotenv.config();

// server.js
import express from 'express';
import bodyParser from 'body-parser';

import KeycloakFactory from './KeycloakFactory';

import CorsMiddleware from './middleware/CorsMiddleware';
import HospitalRoute from './routes/HospitalRoute';
import HubInfoRoute from './routes/HubInfoRoute';
import ExecRoute from './routes/ExecRoute';
import StatsRoute from './routes/StatsRoute';
import LearningRoute from './routes/LearningRoute';

import webSocketAdapter from "./websocket/WebSocketAdapter";
import SendHospitalInfoListeningEvent from "./listeningevents/SendHospitalInfoListeningEvent";
import SendSiteInfoListeningEvent from "./listeningevents/SendSiteInfoListeningEvent";
import SendExecInfoListeningEvent from "./listeningevents/SendExecInfoListeningEvent";
import SendStatsSummarizeListeningEvent from "./listeningevents/SendStatsSummarizeListeningEvent";
import SendLearningPrepareListeningEvent from "./listeningevents/SendLearningPrepareListeningEvent";
import SendLearningTrainListeningEvent from "./listeningevents/SendLearningTrainListeningEvent";
import SendLearningEvaluateListeningEvent from "./listeningevents/SendLearningEvaluateListeningEvent";
import version from "./utils/version";
import genericErrorResponseHandler from "./utils/genericErrorResponseHandler";
import SendStatsBreakdownListeningEvent from "./listeningevents/SendStatsBreakdownListeningEvent";
import SendLearningStatusListeningEvent from "./listeningevents/SendLearningStatusListeningEvent";
import SendStatsStatusListeningEvent from "./listeningevents/SendStatsStatusListeningEvent";
import SendAidboxInfoListeningEvent from "./listeningevents/SendExecAidboxInfoListeningEvent";

var app = express();
app.use(bodyParser.json());

CorsMiddleware.register(app);


// start the server
var port = process.env.CODA_HUB_API_PORT;
const server = app.listen(port, function () {
  console.log(`⚡️[coda-hub-api]: Server is running at http://localhost:${port}`);
  console.log(`⚡️[coda-hub-api]: Running ${version.getBuildVersion()} version of build`);
});

const keycloak = KeycloakFactory.get(app);
app.use(keycloak.middleware());

app.get('/', function (req, res, next) {
  res.status(200).json({ "status": "ok" })
})

// connect routes to app.
app.use('/hospital', keycloak.protect(), HospitalRoute)
app.use('/info', keycloak.protect(), HubInfoRoute)
app.use('/exec', keycloak.protect(), ExecRoute)
app.use('/stats', keycloak.protect(), StatsRoute)
app.use('/learning', keycloak.protect(), LearningRoute)

app.use(genericErrorResponseHandler.errorHandler);

webSocketAdapter.register(server, [
  new SendHospitalInfoListeningEvent(),
  new SendSiteInfoListeningEvent(),
  new SendExecInfoListeningEvent(),
  new SendStatsSummarizeListeningEvent(),
  new SendLearningPrepareListeningEvent(),
  new SendLearningTrainListeningEvent(),
  new SendLearningEvaluateListeningEvent(),
  new SendStatsBreakdownListeningEvent(),
  new SendLearningStatusListeningEvent(),
  new SendStatsStatusListeningEvent(),
  new SendAidboxInfoListeningEvent(),
]);
