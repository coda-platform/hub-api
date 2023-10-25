const tf = require("@tensorflow/tfjs-node");
import HubTrainResponse from "../../models/Response/HubTrainResponse";
import Redis from "./RedisDataProcessor";

async function averageWeights(siteResults: HubTrainResponse[]) {
  if (!siteResults[0].weights) return
  const jobID = siteResults[0].job;
  const loadedModel = await loadModel(siteResults[0]);

  const allSiteWeightArrays = await Promise.all(siteResults.map(async sr => {
    const loadedModel = await loadModel(sr);

    const weightsArray = getWeightsArray(loadedModel);
    return weightsArray
  }))

  const currentMeanWeights = await calculateMeanWeight(allSiteWeightArrays);
  const currentAverageModel = await loadWeights(jobID, loadedModel, currentMeanWeights);
  const currentMeanWeightBuffer = await saveWeights(currentAverageModel);
  Redis.addList(jobID + 'weight', currentMeanWeightBuffer)

  const allMeans = await getPastMeans(jobID, siteResults[0]);
  const resultMean = await calculateMeanWeight(allMeans);
  const averagedModel = await loadWeights(jobID, loadedModel, resultMean)
  const result = saveWeights(averagedModel)

  return result;
}

function averageMetrics(siteResults: any) {
  const numOfSites = siteResults.length;

  var averageMetrics = siteResults.reduce((accumulator: any, item: any) => {
    Object.keys(item ?? {}).forEach(key => {
      accumulator[key] = (accumulator[key] || 0) + (item[key] || 0);
    });
    return accumulator;
  }, {});

  Object.keys(averageMetrics).forEach(metric => {
    averageMetrics[metric] = averageMetrics[metric] / numOfSites
  });

  return averageMetrics;
}

async function loadModel(siteResult: HubTrainResponse) {
  const siteWeight = siteResult.weights.data;
  const modelStr = await Redis.getRedisKey(`${siteResult.job}_model`);
  const modelJson = await JSON.parse(JSON.parse(modelStr));
  const weightData = new Uint8Array(Buffer.from(siteWeight)).buffer;

  const modelArtifacts = {
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightSpecs,
    weightData: weightData
  }
  const loadedModel = await tf.loadLayersModel(tf.io.fromMemory(modelArtifacts));
  return loadedModel;
}

async function loadWeights(jobID: string, model: any, weightData: Float32Array[]) {
  const modelStr = await Redis.getRedisKey(`${jobID}_model`);
  const modelJson = await JSON.parse(JSON.parse(modelStr));
  let newWeights = [];
  for (let i = 0; i < model.getWeights().length; i++) {
    let weight = weightData[i]
    newWeights.push(tf.tensor(weight, modelJson.weightSpecs[i].shape))
  }
  model.setWeights(newWeights);
  return model;
}

async function saveWeights(model: any) {
  let result = await model.save(tf.io.withSaveHandler(async (modelArtifacts: any) => modelArtifacts));
  result.weightData = Buffer.from(result.weightData);
  return result.weightData;
}

async function getWeightsArray(model: any) {
  let weightsArray = []
  for (let i = 0; i < model.getWeights().length; i++) {
    const x = model.getWeights()[i]?.dataSync();
    if (x) weightsArray.push(x);
  }
  return weightsArray
}

async function getPastMeans(jobID: string, modelInfo: HubTrainResponse) {
  const buffers = await Redis.listBufferRange(jobID + 'weight', 0, -1)
  const means = Promise.all(buffers.map(async (r: Buffer) => {
    modelInfo.weights.data = r;
    const tempModel = await loadModel(modelInfo);
    const weightsArray = await getWeightsArray(tempModel);
    return weightsArray;
  }))
  return means;
}

async function calculateMeanWeight(means: any[][]) {
  let meanofAllWeights = [] //mean using all old weights
  for (let y = 0; y < means[0].length; y++) { //x = for each weights in weightArray
    let weightI: any = []
    for (let x = 0; x < means.length; x++) {//y = for each mean
      weightI.push(tf.tensor(means[x][y])); //tensor of mean weight
    }
    const meanI = new Float32Array(await tf.stack(weightI).mean(0).dataSync());
    meanofAllWeights.push(meanI);
  }
  return meanofAllWeights
}

export default {
  averageWeights,
  averageMetrics,
};
