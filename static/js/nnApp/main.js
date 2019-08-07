$(document).ready(function(){
  nnApp.init()

  $(document)
  .on('redraw.bs.charts', function () {
    $('[data-chart]').each(function () {
      if (($(this).is(':visible')) && (!$(this).hasClass('js-chart-drawn'))) {
        chart = Charts[$(this).attr('data-chart')](this)
        name = $(this).attr('data-name')
        nnApp.chartHandles[name] = chart
        $(document).trigger(name+".ready")
        $(this).addClass('js-chart-drawn')
      } 
    })
  })
  $(document).trigger('redraw.bs.charts')
   
});

var nnApp = {
  state: {
	isNormedView: false,
	isTraining: false,
	waitForTraningStop: false,
  },
  chartHandles: {},
  maxLossBufferLength: 500,
  numDatapoints: 300,
  netInfo: [],
  lossBuffer: [],
  userdata: [],
  
  ui: {
    $performance: $('#performance').find('.ex-line-graph'),
    $lossHistory: $('#lossHistory').find('.ex-line-graph'),
    $network: $('#network').find('.ex-line-graph'),
    $dataSelect: $('#dataSelect'),
    $userdataOption: $('#userdata-option'),
    $toggleDataView: $('#toggleDataView'),
    $run: $("#training"),
	$runInner: $("#training").find('.icon'),
    $extrapolate: $("#extrapolate"),
	$extrapolateInner: $("#extrapolate").find('.icon'),
    quickstats: [
      $("#qStat_one"),
      $("#qStat_two"),
      $("#qStat_three"),
      $("#qStat_four"),
    ],
	$privacyModalBody: $('#privacy_inject'),
	$like: $('#like'),
	$loadingSpinner: $('#loadingSpinner'),
  },

  init: () => {
    nnApp.initUI()
	
	// Build Neural Network
    net.init(config.val)

    nnApp.chartHandles['graph'] = cyGraph.init(nnApp.ui.$network, nnApp.toggleGraphTooltip)

    // Workaround for broken canvas in hidden divs
    Charts["nLines"] = nLines.init
    Charts["singleLine"] = singleLine.init

    $(document).one("performance.ready", () => {
      nnApp.initData(nnApp.ui.$dataSelect.val())
    }) 

    $(document).one("loss.ready", () => {
      singleLine.update(
        nnApp.chartHandles.loss,
        nnApp.lossBuffer
      )
      singleLine.changeLabel(nnApp.chartHandles.loss, config.val.loss)
    })
    
    $(document).on("epoch.end", async (garbage, content) => {
      const {epoch, logs} = content
	  nnApp.handleEndOfEpoch(epoch, logs)
    })
  }, 

  initUI: function () {
    util.hasLength(nnApp.ui)
	
	nnApp.ui.$loadingSpinner.removeClass("d-none");

	nnApp.ui.$privacyModalBody.append(privacy.english);
	nnApp.ui.$privacyModalBody.append("<h1>Deutsch</h1>");
	nnApp.ui.$privacyModalBody.append(privacy.german);
	
    config.init()
	fileUpload.init()
  
    nnApp.ui.$network.height(nnApp.ui.$network.attr("height"))
	nnApp.ui.$performance.height(nnApp.ui.$performance.attr("height"))
	nnApp.ui.$lossHistory.height(nnApp.ui.$lossHistory.attr("height"))
	
	nnApp.ui.$extrapolate.click(() => {
		if ((!nnApp.state.isTraining) && (!nnApp.state.waitForTraningStop)){
			nnApp.predictFuture();
		}
	})
	
	nnApp.ui.$run.click(async () => {
		if (!nnApp.state.waitForTraningStop) {
			if (!nnApp.state.isTraining) {
				nnApp.ui.$runInner.text(" Stop");
				nnApp.ui.$runInner.removeClass("icon-rocket")
				nnApp.ui.$runInner.addClass("icon-controller-paus")
				nnApp.ui.$extrapolate.attr('disabled', true)
				await nnApp.training();
				nnApp.ui.$extrapolate.attr('disabled', false)
				nnApp.ui.$runInner.text(" Run");
				nnApp.ui.$runInner.removeClass("icon-controller-paus")
				nnApp.ui.$runInner.addClass("icon-rocket")
			} else {
				net.model.stopTraining = true;
			}
		}
	})

    nnApp.ui.$dataSelect.change(() => {
	  nnApp.withStopTraining(() => {
		nnApp.initData(nnApp.ui.$dataSelect.val())
	  })
    })

    nnApp.ui.$toggleDataView.change(() => {
      nnApp.state.isNormedView = (nnApp.ui.$toggleDataView.prop("checked"))
      nnApp.changeDataView(nnApp.state.isNormedView)
    })

    $(document).on("settings.saved", () => {
      nnApp.withStopTraining(() => {
        nnApp.initData(nnApp.ui.$dataSelect.val())
	  });
	})
	
	$(document).on("fileUpload.saved", (garbage, userdata) => {
      nnApp.userdata = userdata
	  nnApp.ui.$userdataOption.attr("disabled", false)
    })
	
	nnApp.ui.$like.click(() => {
		$.get("/like", function(data) {
			console.log(data)
		})
	})
	
    quickstats.init(this.ui.quickstats,
      [
        {},
        {deltaType: "percent", biggerIsBetter: false},
        {deltaType: "percent", biggerIsBetter: false},
        {}
      ]
    )
  },

  initData: async function(id) {
    nnApp.lossBuffer = []
    nLines.toInitial(nnApp.chartHandles.performance, 1)
	
    net.init(config.val)

    data_select = {
      0: generate.cloud,
      1: generate.sinewave.bind(null, nnApp.numDatapoints),
      2: generate.twoLines.bind(null, nnApp.numDatapoints),
      3: generate.localData.bind(null, nnApp.userdata),
    }
	
	let dataSet = null;
	try {
		dataSet = await data_select[id]()
	} catch (error) { // Probably in case of bad userdata
		dataSet = await data_select[0]()
	}

    // Setup for training and make a random prediction
    net.preProcessing(dataSet)
    const predictions = await net.predict()
    const intitialLoss = await net.evaluate()
	nnApp.ui.$loadingSpinner.addClass("d-none");
    
	// Update Chart with unNormed/standard data
    nnApp.ui.$toggleDataView.prop("checked", false).change();
    nLines.update(
      nnApp.chartHandles.performance,
      [0, 1],
      [dataSet, predictions]
    )

    // Loss Chart could already be drawn
    nnApp.lossBuffer.push(intitialLoss)
    if (nnApp.chartHandles.loss) {
      singleLine.changeLabel(nnApp.chartHandles.loss, config.val.loss)
      singleLine.update(nnApp.chartHandles.loss, nnApp.lossBuffer)
    } 
     
    // Network Tooltips only differentiate between layers so far
    const format = (units, activation, initializer, biasInit) => {
       return "Units: " + units + "<br/>" +
              "Activation: " + activation + "<br/>" +
              "Kernel Init: " + initializer + "<br/>" +
              "Bias Init: " + biasInit
    }
    nnApp.netInfo = []
    nnApp.netInfo.push(
      "Batchsize: " + config.val.batchSize + "%" + "<br/>" +
      "Normalization : " + config.val.norm
    )
    for (i=0; i<net.model.layers.length; i++){
      let layer = net.model.getLayer("", i).getConfig()
      //console.log(net.model.getLayer("", i).kernel)
      //console.log(net.model.getLayer("", i).kernel.val.arraySync())
      let units = layer.units
      let activation = layer.activation
      let kernelInit = layer.kernelInitializer.className
      let biasInit = layer.biasInitializer.className
      nnApp.netInfo.push(format(units,activation,kernelInit,biasInit))
    }

    // Build Network Graph up -> down
    const numLayers = config.val.numLayers
    const nodesPerLayer = config.val.nodesPerLayer
    const {nodePositions, nodeWeights} = nnApp.buildNetGraphUpToDown(
        numLayers, nodesPerLayer
    )
    
    cyGraph.update(
      nnApp.chartHandles.graph,
      nodePositions,
      {numRows: numLayers, numCols: nodesPerLayer}
    )
    cyGraph.updateColor(
      nnApp.chartHandles.graph,
      nodePositions,
      {nodeWeights: nodeWeights}
    ) 

    quickstats.reset([
        0,
        Math.floor(intitialLoss*100)/100,
        Math.floor(eval(config.val.lr)*1000000)/1000000,
        Math.floor(eval(net.config._batchSize)),
    ])
  },

  training: async () => {
    nnApp.state.isTraining = true;
	
    // In case of "future prediction" in past iterations
    nLines.toInitial(nnApp.chartHandles.performance, 1)
	
	// To stop constant rerendering of tooltips while training
	nLines.enableTooltips(nnApp.chartHandles.performance, false)

  
    if (nnApp.state.isNormedView) {
      const inputs = Array.from(net.processed.inputs.dataSync())
      const labels = Array.from(net.processed.labels.dataSync())
      const dataSet = labels.map((label, i) => {
        return {x: inputs[i], y: label}
      }) 
      nLines.update(nnApp.chartHandles.performance, 0, [dataSet])
    }

    const summary = await net.train()
	
    // Browser slows down at about 5000+ points
    nnApp.lossBuffer = util.compress(nnApp.lossBuffer, nnApp.maxLossBufferLength)
      .map((ele) => Math.floor(ele*10000)/10000);

    if (nnApp.chartHandles.loss) {
      singleLine.update(nnApp.chartHandles.loss, nnApp.lossBuffer)
    } 

	nLines.enableTooltips(nnApp.chartHandles.performance, true)
	nnApp.state.isTraining = false;
	$(document).trigger("training.end");
  },
  
  
  handleEndOfEpoch: async (epoch, logs) => {
    const predictions = await net.predict(nnApp.state.isNormedView)

    nLines.update(
      nnApp.chartHandles.performance,
      1,
      [predictions]
    )
	
	nnApp.lossBuffer.push(logs.loss)
	if(nnApp.chartHandles.loss) {
	  singleLine.add(nnApp.chartHandles.loss,[logs.loss])
	}
    
    const updateEvery = 10
    if ((epoch+1) % updateEvery == 0) {
        const {nodePositions, nodeWeights} = nnApp.buildNetGraphUpToDown(
            config.val.numLayers,
            config.val.nodesPerLayer
        )
        updateGraph = cyGraph.updateColor(
          nnApp.chartHandles.graph,
          nodePositions,
          {nodeWeights: nodeWeights}
        )
        
        quickstats.update([
          quickstats.content[0].val + updateEvery,
          Math.floor(logs.loss*100)/100,
          Math.floor(eval(net.model.optimizer.learningRate)*1000000)/1000000,
          Math.floor(eval(net.config._batchSize)),
        ]) 
    }

    // Add remaining Epochs at the end of training
    if ((epoch+1) >= net.config.epochsPerRun) {
      remaining = (epoch + 1) % updateEvery
      quickstats.update([
        quickstats.content[0].val + remaining,
        Math.floor(logs.loss*100)/100,
        Math.floor(eval(net.model.optimizer.learningRate)*1000000)/1000000,
        Math.floor(eval(net.config._batchSize)),
      ]) 
    }
       
  },
  
  withStopTraining: (callback) => {
	if(nnApp.state.isTraining) {
	  net.model.stopTraining = true;
	  nnApp.state.waitForTraningStop = true;
      $(document).one("training.end",() => { 
		callback();
		nnApp.state.waitForTraningStop = false;
	  })
	} else {
		callback();
	}
  },

  predictFuture: () => {
    let limit = 1.40
    let predictions = net.predict(nnApp.state.isNormedView, limit)
    if (!predictions){
      console.log("Cant predict the future at the moment :(")
      return
    }

    gradientStroke = '#9F86FF'
    const options = {
      borderColor:               gradientStroke,
      pointBorderColor:          gradientStroke,
      pointBackgroundColor:      gradientStroke,
      pointHoverBackgroundColor: gradientStroke,
      pointHoverBorderColor:     gradientStroke
    } 

    nLines.change(
      nnApp.chartHandles.performance,
      1,
      predictions,
      options
    )
  },
  
  buildNetGraphUpToDown: (numLayers, nodesPerLayer) => {
    const in_node = [0, Math.floor(nodesPerLayer / 2)]
    const out_Node = [numLayers-1, Math.floor(nodesPerLayer / 2)]
    let nodes = [in_node]
    let nodeWeights_avg = [0]
    for (i=1; i<numLayers-1; i++) {
        let kernel_layer = net.model.getLayer("", i-1).kernel.val.arraySync()
        for (j=0; j<nodesPerLayer; j++) {
            sumOfWeights = 0
            // For each input node of the layer get the edge which targets the current node
            kernel_layer.forEach((inputNode, i) => {
                sumOfWeights += inputNode[j]
            })
            nodeWeights_avg.push(sumOfWeights/kernel_layer.length)
            nodes.push([i, j])
        }
    }
    nodes.push(out_Node)
    nodeWeights_avg.push(0.6)
    return {nodePositions: nodes, nodeWeights: nodeWeights_avg}
  },

  toggleGraphTooltip: function(event, element) {
    $(element).tooltip('enable')
    if (event.target._private.group == "nodes") {
      id = eval('['+event.target._private.data.id+']')

      $(element).attr('title', nnApp.netInfo[id[0]])
                .tooltip('_fixTitle')
                .tooltip('show'); 
    } else {
      $(element).tooltip('hide')
      $(element).tooltip('disable')
    }
  },

  changeDataView: async function(isNormedView) {
    if ($.isEmptyObject(net.processed)) {
      console.log("nnApp.changeDataView: Data isnt processed yet")
      return
    }
    let dataSet = {}
    if (isNormedView) {
      const inputs = Array.from(net.processed.inputs.dataSync())
      const labels = Array.from(net.processed.labels.dataSync())
      dataSet = labels.map((label, i) => {
        return {x: inputs[i], y: label}
      }) 
    } else {
      dataSet = net.processed.rawData 
    }
    const predictions = await net.predict(isNormedView)

    nLines.toInitial(nnApp.chartHandles.performance, 1)
    nLines.update(
      nnApp.chartHandles.performance,
      [0, 1],
      [dataSet, predictions]
    ) 
  },

}
