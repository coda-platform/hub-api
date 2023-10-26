import * as tf from '@tensorflow/tfjs-node';
import HubTrainResponse from "../../models/Response/HubTrainResponse";
import Redis from "./RedisDataProcessor";

async function averageWeights(siteResults: HubTrainResponse[]) {
  if (!siteResults[0].weights) return;
  const jobID = siteResults[0].job;

  // Load the model once
  const referenceModel = await loadModel(siteResults[0]);

  // Parallelize the loading and weight extraction
  const allSiteWeightArrays = await Promise.all(siteResults.map(async sr => {
    if (sr !== siteResults[0]) { // Avoid loading the reference model again
      const loadedModel = await loadModel(sr);
      return getWeightsArray(loadedModel);
    } else {
      return getWeightsArray(referenceModel);
    }
  }));

  const currentMeanWeights = await calculateMeanWeight(allSiteWeightArrays);
  const currentAverageModel = await loadWeights(jobID, referenceModel, currentMeanWeights);
  const currentMeanWeightBuffer = await saveWeights(currentAverageModel);
  Redis.addList(jobID + 'weight', currentMeanWeightBuffer);

  // Get all past means and calculate the overall mean
  const allMeans = await getPastMeans(jobID, siteResults[0]);
  const resultMean = await calculateMeanWeight(allMeans);
  const averagedModel = await loadWeights(jobID, referenceModel, resultMean);

  return saveWeights(averagedModel);
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
  const modelJson = JSON.parse(JSON.parse(modelStr));

  const weightData = new Uint8Array(Buffer.from(siteWeight)).buffer;

  const modelArtifacts = {
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightSpecs,
    weightData: weightData
  };

  const loadedModel = await tf.loadLayersModel(tf.io.fromMemory(modelArtifacts));
  return loadedModel;
}

async function loadWeights(jobID: string, model: any, weightData: Float32Array[]) {
  const modelStr = await Redis.getRedisKey(`${jobID}_model`);
  const modelJson = JSON.parse(JSON.parse(modelStr));

  const modelWeights = model.getWeights();
  const newWeights = modelWeights.map((_: any, index: number) =>
    tf.tensor(weightData[index], modelJson.weightSpecs[index].shape));

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
  let meanofAllWeights: Float32Array[] = [];

  for (let y = 0; y < means[0].length; y++) {
    let tensors: tf.Tensor[] = [];
    for (let x = 0; x < means.length; x++) {
      tensors.push(tf.tensor(means[x][y]));
    }

    let stacked = tf.stack(tensors);
    let meanTensor = stacked.mean(0);
    meanofAllWeights.push(new Float32Array(await meanTensor.data()));

    // Dispose of intermediate tensors
    tensors.forEach(tensor => tensor.dispose());
    stacked.dispose();
    meanTensor.dispose();
  }

  return meanofAllWeights;
}

export default {
  averageWeights,
  averageMetrics,
};
