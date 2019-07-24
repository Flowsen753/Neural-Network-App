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
  chartHandles: {},
  maxLossBufferLength: 500,
  numDatapoints: 300,
  netInfo: [],
  lossBuffer: [],
  isNormedView: false,
  userdata: [],
  
  ui: {
    $performance: $('#performance').find('.ex-line-graph'),
    $lossHistory: $('#lossHistory').find('.ex-line-graph'),
    $network: $('#network').find('.ex-line-graph'),
    $dataSelect: $('#dataSelect'),
    $userdataOption: $('#userdata-option'),
    $toggleDataView: $('#toggleDataView'),
    $run: $("#training"),
    $extrapolate: $("#extrapolate"),
    quickstats: [
      $("#qStat_one"),
      $("#qStat_two"),
      $("#qStat_three"),
      $("#qStat_four"),
    ],
	$privacyModalBody: $('#privacy_inject'),
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

	nnApp.ui.$privacyModalBody.append(privacy.english);
	nnApp.ui.$privacyModalBody.append("<h1>Deutsch</h1>");
	nnApp.ui.$privacyModalBody.append(privacy.german);
	
	
    config.init()
	fileUpload.init()

    nnApp.ui.$run.click(nnApp.training)
    nnApp.ui.$extrapolate.click(nnApp.predictFuture)
    nnApp.ui.$network.height(this.ui.$network.attr("height"))
	nnApp.ui.$performance.height(this.ui.$performance.attr("height"))
	nnApp.ui.$lossHistory.height(this.ui.$lossHistory.attr("height"))

    nnApp.ui.$dataSelect.change(() => {
      nnApp.initData(nnApp.ui.$dataSelect.val())
    })

    nnApp.ui.$toggleDataView.change(() => {
      nnApp.isNormedView = (!nnApp.ui.$toggleDataView.prop("checked"))
      nnApp.changeDataView(nnApp.isNormedView)
    })

    $(document).on("settings.saved", () => {
      net.init(config.val)
      nnApp.initData(nnApp.ui.$dataSelect.val())
    })
	
	$(document).on("fileUpload.saved", (garbage, userdata) => {
      nnApp.userdata = userdata
	  nnApp.ui.$userdataOption.attr("disabled", false)
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
    // In case of future prediction in past iterations
    nLines.toInitial(nnApp.chartHandles.performance, 1) 

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
    
    // Update Chart with unNormed/standard data
    nnApp.ui.$toggleDataView.bootstrapToggle('on')
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
      let units = layer.units
      let activation = layer.activation
      let kernelInit = layer.kernelInitializer.className
      let biasInit = layer.biasInitializer.className
      nnApp.netInfo.push(format(units,activation,kernelInit,biasInit))
    }

    // Build Network Graph up -> down
    const numLayers = config.val.numLayers
    const nodesPerLayer = config.val.nodesPerLayer
    const in_node = [0, Math.floor(nodesPerLayer / 2)]
    const out_Node = [numLayers-1, Math.floor(nodesPerLayer / 2)]
    nodes = [in_node]
    for (i=1; i<numLayers-1; i++) {
        for (j=0; j<nodesPerLayer; j++) {
            nodes.push([i, j])
        }
    }
    nodes.push(out_Node)
    cyGraph.update(
      nnApp.chartHandles.graph,
      nodes,
      {numRows: numLayers, numCols: nodesPerLayer}
    ) 

    quickstats.reset([
        0,
        Math.floor(intitialLoss*100)/100,
        eval(config.val.lr),
        eval(net.config._batchSize),
    ])
  },


  training: async () => {
    nnApp.ui.$run.attr('disabled', true)
	nnApp.ui.$extrapolate.attr('disabled', true)

    // In case of "future prediction" in past iterations
    nLines.toInitial(nnApp.chartHandles.performance, 1)
	
	// To stop constant rerendering of tooltips while training
	nLines.enableTooltips(nnApp.chartHandles.performance, false)

  
    if (nnApp.isNormedView) {
      const inputs = Array.from(net.processed.inputs.dataSync())
      const labels = Array.from(net.processed.labels.dataSync())
      const dataSet = labels.map((label, i) => {
        return {x: inputs[i], y: label}
      }) 
      nLines.update(nnApp.chartHandles.performance, 0, [dataSet])
    }

    const summary = await net.train()
    const predictions = await net.predict(nnApp.isNormedView)

    nLines.update(
        nnApp.chartHandles.performance,
        1,
        [predictions]
    )

    // Browser slows down at about 5000+ points
    nnApp.lossBuffer = util.compress(nnApp.lossBuffer, nnApp.maxLossBufferLength)
      .map((ele) => Math.floor(ele*1000)/1000);

    if (nnApp.chartHandles.loss) {
      singleLine.update(nnApp.chartHandles.loss, nnApp.lossBuffer)
    } 

	nLines.enableTooltips(nnApp.chartHandles.performance, true)
    nnApp.ui.$run.attr('disabled', false)
	nnApp.ui.$extrapolate.attr('disabled', false)
  },
  
  handleEndOfEpoch: async (epoch, logs) => {
    const predictions = await net.predict(nnApp.isNormedView)

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
        quickstats.update([
          quickstats.content[0].val + updateEvery,
          Math.floor(logs.loss*100)/100,
          eval(net.model.optimizer.learningRate),
          eval(net.config._batchSize),
        ]) 
    }

    // Add remaining Epochs at the end of training
    if ((epoch+1) >= net.config.epochsPerRun) {
      remaining = (epoch + 1) % updateEvery
      quickstats.update([
        quickstats.content[0].val + remaining,
        Math.floor(logs.loss*100)/100,
        eval(net.model.optimizer.learningRate),
        eval(net.config._batchSize),
      ]) 
    }
       
  },

  predictFuture: () => {
    let limit = 1.30
    let predictions = net.predict(nnApp.isNormedView, limit)
    if (!predictions){
      console.log("Cant predict the future at the moment")
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
