var net = {
  model: null,
  config: null,
  processed: {},

  init: (config) => {
    try {
      net._evalConfig(config)
    } catch {
      console.log('Network.init: Invalid configuration')
    }
    net.model = net._createModel()

    // Prepare the model for training.  
    net.model.compile({
      optimizer: net.config.optim(net.config.lr),
      loss: net.config.loss,
      metrics: ['mse'],
    }); 
  },

  _createModel: () => {
    const model = tf.sequential(); 
    
    model.add(tf.layers.dense({
      inputShape: [1],
      units: net.config.nodesPerLayer,
      activation: net.config.activation,
      useBias: true
    }));

    for(i=0; i<net.config.numLayers-3; i++) {
      model.add(tf.layers.dense({
        inputShape: [net.config.nodesPerLayer],
        units: net.config.nodesPerLayer,
        activation: net.config.activation,
        useBias: true
      }));
    }
    
    model.add(tf.layers.dense({units: 1, useBias: true}));

    return model
  },

  preProcessing: (dataSet) => {
    const processed =  tf.tidy(() => {
      tf.util.shuffle(dataSet);
  
      const inputs = dataSet.map(d => d.x)
      const labels = dataSet.map(d => d.y);
  
      const inputTensor = tf.tensor2d(inputs, [inputs.length, 1]);
      const labelTensor = tf.tensor2d(labels, [labels.length, 1]);
  
      const inputMin = inputTensor.min()
      const inputMax = inputTensor.max()
      // Normalize the data
      const forwardData = net.config.norm.forward(inputTensor, labelTensor)
      const {normedInputs, normedLabels, normData} = forwardData


      return {
        rawData: dataSet,
        inputs: normedInputs,
        labels: normedLabels,
        // Return the min/max bounds so we can use them later.
        normData,
        inputRange: {inputMin,inputMax}
      }
    });  
    // Batchsize is selected in % in the slider gui 
    net.config._batchSize = Math.floor(processed.inputs.size*(net.config.batchSize/100))
    net.processed = processed
  },

  train: async () => {
    if ($.isEmptyObject(net.processed)) {
      console.log("net.train: preProcessing missing")
      return
    }
    const {inputs, labels} = net.processed
    
    
    const batchSize = net.config._batchSize;
    const epochs = net.config.epochsPerRun;
    
    onEpochEnd = (epoch, logs) => {
      $(document).trigger('epoch.end', [{epoch, logs}])
    }
    return await net.model.fit(inputs, labels, {
      batchSize,
      epochs,
      shuffle: true,
      callbacks: {onEpochEnd}
    })
  },

  predict: (wantNormalized, exceedance) => {
    if ($.isEmptyObject(net.processed)) {
      console.log("net.train: preprocessing missing")
      return
    }
    exceedance = (exceedance) ? exceedance : 1
    wantNormalized = (wantNormalized) ? wantNormalized : false

    // we un-normalize the data by doing the inverse of the scaling 
    // that we did earlier.
    const predictions_asArrays = tf.tidy(() => {
      const num_preds = 30
      const {inputMin, inputMax} = net.processed.inputRange
      const predictionLimit = inputMax.dataSync() * exceedance
      const xs = tf.linspace(inputMin.dataSync(), predictionLimit, num_preds);      
      const normXs = net.config.norm.forwardFix(xs, net.processed.normData)
      const preds = net.model.predict(normXs.reshape([num_preds, 1]));      
      
      // un-normalize the data
      const unnormPreds = net.config.norm.backward(preds, net.processed.normData)

      if (wantNormalized) {
        return util.zip2([normXs.dataSync(), preds.dataSync()]) 
      }
      return util.zip2([xs.dataSync(), unnormPreds.dataSync()])
    });
  
    const predictions = Array.from(predictions_asArrays).map((set, i) => {
      return {x: set[0], y: set[1]}
    });

    return predictions
  },

  evaluate: async () => {
    const result = tf.tidy(() => {
      const preds = net.model.predict(net.processed.inputs)
      return tf.losses.meanSquaredError(net.processed.labels, preds)
    })
    const loss = await result.data()
    return Array.from(loss).map(x => x)[0]
  },

  _evalConfig: (config) => {
    // Start with DOM config and convert as needed
    net.config = $.extend({}, config)

     /*  ------- Normalization ----------
     None
     MinMax
     ZScore
     */
    const {none, minMax, zScore} = net._norms
    norm_select = {"none": none, "minMax": minMax, "zScore": zScore}
    net.config.norm = norm_select[config.norm]

    /* ------ Optimizer ---------
    tf.train.sgd
    tf.train.momentum
    tf.train.adagrad
    tf.train.adadelta
    tf.train.adam
    tf.train.adamax
    tf.train.rmsprop
    */
    const optim_select = {
      'sgd': tf.train.sgd,
      'adam': tf.train.adam,
      'rmsprop': tf.train.rmsprop
    }
    net.config.optim = optim_select[config.optim]

    /* ------ Losses ---------
    tf.losses.absoluteDifference
    tf.losses.computeWeightedLoss
    tf.losses.cosineDistance
    tf.losses.hingeLoss
    tf.losses.huberLoss
    tf.losses.logLoss
    tf.losses.meanSquaredError
    tf.losses.sigmoidCrossEntropy
    tf.losses.softmaxCrossEntropy 
    */
    const loss_select = {
      'mse': tf.losses.meanSquaredError,
      'huber': tf.losses.huberLoss,
      'l1': tf.losses.absoluteDifference
    }
    net.config.loss = loss_select[config.loss]

    /*  ------- Activations ----------
    'elu'|'hardSigmoid'|'linear'|'relu'|'relu6'|
    'selu'|'sigmoid'|'softmax'|'softplus'|'softsign'|'tanh'
    */
    // Use DOM string directly to select

    // Debug
    /*
    console.log("\n--------- Settings -------------\n")
    console.log("Activation: ", config.activation)
    console.log("Learningrate: ", config.lr)
    console.log("Epochs per Run: ", config.epochsPerRun)
    console.log("Loss: ", config.loss, net.config.loss)
    console.log("Optimizer: ", config.optim, optim_select[config.optim])
    console.log("Normalization: ", config.norm, norm_select[config.norm])
    console.log("Batchsize: ", config.batchSize, "%")
    */
  },

  _norms: {
    none: {
      forward: (inputs, labels) => {
        const normData = {}
        return {normedInputs: inputs, normedLabels: labels, normData}
      },
      forwardFix: (input, normalizationData) => {
        return input
      }, 
      backward: (labels, normalizationData) => {
        return labels
      }
    },

    minMax: {
      forward: (inputs, labels) => {
        const inputMax = inputs.max();
        const inputMin = inputs.min();  
        const labelMax = labels.max();
        const labelMin = labels.min(); 
        const normData = {inputMax, inputMin, labelMax, labelMin}
    
        const normedInputs = tf.scalar(-1).add(
          inputs.sub(inputMin).mul(tf.scalar(2))
          .div(inputMax.sub(inputMin))
        );
        const normedLabels = tf.scalar(-1).add(
          labels.sub(labelMin).mul(tf.scalar(2))
          .div(labelMax.sub(labelMin))
        );

        return {normedInputs, normedLabels, normData}
      },
      forwardFix: (inputs, normalizationData) => {
        const {inputMax, inputMin} = normalizationData 
        const normedInputs = tf.scalar(-1).add(
          inputs.sub(inputMin).mul(tf.scalar(2))
          .div(inputMax.sub(inputMin))
        );

        return normedInputs
      },
      backward: (labels, normalizationData) => {
        const {labelMax, labelMin} = normalizationData
        const unNormedLabels = labels
          .add(tf.scalar(1))
          .mul(labelMax.sub(labelMin))
          .div(tf.scalar(2)) 
          .add(labelMin);
        return unNormedLabels
      }
    },

    zScore: {
      forward: (inputs, labels) => {
        const inputMoments = tf.moments(inputs)
        const labelMoments = tf.moments(labels)
        const inputEv = inputMoments.mean;
        const inputStd = tf.sqrt(inputMoments.variance);  
        const labelEv = labelMoments.mean;
        const labelStd = tf.sqrt(labelMoments.variance); 
        const normData = {inputEv, inputStd, labelEv, labelStd}
    
        const normedInputs = (inputs.sub(inputEv)).div(inputStd);
        const normedLabels = (labels.sub(labelEv)).div(labelStd);
        return {normedInputs, normedLabels, normData}
      },
      forwardFix: (input, normalizationData) => {
        const {inputEv, inputStd} = normalizationData 
        const normedInput = (input.sub(inputEv)).div(inputStd);
        return normedInput
      }, 
      backward: (labels, normalizationData) => {
        const {labelEv, labelStd} = normalizationData
        const unNormedLabels = labels
          .mul(labelStd)
          .add(labelEv); 
        return unNormedLabels
      }
    } 
  }
}